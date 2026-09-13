"use client";

import React, { useEffect, useState } from "react";
import { GlassCard } from "../../components/ui/GlassCard";
import { ShoppingCart, Storefront, Receipt, Trash, CheckCircle, Clock, CalendarBlank, HourglassMedium, Scissors } from "@phosphor-icons/react";
import { supabase } from "../../lib/supabase";

export function getHarvestDateInfo(dateRaw?: string) {
    if (!dateRaw) return { formattedDate: 'Sin fecha', daysElapsed: 0 };
    
    let harvestDate: Date;
    if (dateRaw.includes('T')) {
        harvestDate = new Date(dateRaw);
    } else {
        const parts = dateRaw.split('-');
        if (parts.length === 3) {
            harvestDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        } else {
            harvestDate = new Date(dateRaw);
        }
    }

    if (isNaN(harvestDate.getTime())) {
        return { formattedDate: 'Sin fecha', daysElapsed: 0 };
    }

    const formattedDate = harvestDate.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });

    const now = new Date();
    const todayZero = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const harvestZero = new Date(harvestDate.getFullYear(), harvestDate.getMonth(), harvestDate.getDate());
    
    const diffMs = todayZero.getTime() - harvestZero.getTime();
    const daysElapsed = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

    return { formattedDate, daysElapsed };
}

export default function POSPage() {
    const [inventory, setInventory] = useState<any[]>([]);
    const [cart, setCart] = useState<any[]>([]);
    const [salesHistory, setSalesHistory] = useState<any[]>([]);
    const [loadingInv, setLoadingInv] = useState(true);
    
    // Checkout states
    const [clientId, setClientId] = useState("walk_in");
    const [clientName, setClientName] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);

    const tiers: Record<string, number> = {
        'walk_in': 0,    // 0%
        'vip_1': 0.10, // 10%
        'wholesale_1': 0.30  // 30%
    };

    const loadInventoryAndSales = async () => {
        setLoadingInv(true);
        // Load Harvest inventory
        const { data: invData } = await supabase.from('core_inventory_cosechas').select('*').gt('qty', 0);
        
        // Load partial harvests, batches, rooms, and agronomic events to link with carpa data
        const { data: partialData } = await supabase.from('core_partial_harvests').select('*');
        const { data: batchesData } = await supabase.from('core_batches').select('*');
        const { data: roomsData } = await supabase.from('core_rooms').select('*');
        const { data: eventsData } = await supabase.from('core_agronomic_events').select('*').ilike('event_type', '%cosecha%');

        if (invData) {
            const enriched = invData.map((item: any) => {
                const partial = partialData?.find((p: any) => p.id === item.id);
                const batch = partial ? batchesData?.find((b: any) => b.id === partial.batch_id) : null;
                const room = batch ? roomsData?.find((r: any) => r.id === (batch.location || batch.room_id)) : null;
                const wetEvent = batch ? eventsData?.find((e: any) => e.batch_id === batch.id && (e.event_type || '').toLowerCase().includes('cosecha')) : null;

                return {
                    ...item,
                    batch_id: batch?.id,
                    strain: batch?.strain,
                    origen: batch?.origen,
                    room_name: room?.name,
                    wet_harvest_date: wetEvent?.date_occurred || batch?.last_stage_date,
                    harvest_date: item.date_added || partial?.harvest_date || partial?.created_at
                };
            });
            setInventory(enriched);
        }

        // Load Sales History
        const { data: salesData } = await supabase.from('core_sales').select('*').order('date', { ascending: false }).limit(10);
        if (salesData) setSalesHistory(salesData);
        
        setLoadingInv(false);
    };

    useEffect(() => {
        loadInventoryAndSales();
    }, []);

    const handleAddToCart = (item: any) => {
        const qtyStr = prompt(`¿Cuántos gramos de "${item.name}"?\nDisponibles: ${item.qty}g`, '10');
        if (!qtyStr) return;
        const qty = parseFloat(qtyStr);
        if (isNaN(qty) || qty <= 0 || qty > item.qty) {
            alert('Cantidad inválida o excede el stock disponible.');
            return;
        }

        const pricePerGStr = prompt(`¿Precio por gramo de "${item.name}"? ($)`, '8000');
        if (!pricePerGStr) return;
        const pricePerG = parseFloat(pricePerGStr);
        if (isNaN(pricePerG) || pricePerG < 0) {
            alert('Precio inválido.'); return;
        }

        const total = qty * pricePerG;

        setCart(prev => {
            const existing = prev.find(i => i.id === item.id);
            if (existing) {
                if (existing.qty + qty > item.qty) {
                    alert('Stock global excedido.');
                    return prev;
                }
                const newQty = existing.qty + qty;
                const newPrice = existing.price + total;
                return prev.map(c => c.id === item.id ? { ...c, qty: newQty, price: newPrice, pricePerG: newPrice / newQty } : c);
            } else {
                return [...prev, { id: item.id, name: item.name, pricePerG, price: total, cost: item.price || 0, qty }];
            }
        });
    };

    const removeFromCart = (id: string) => {
        setCart(prev => prev.filter(c => c.id !== id));
    };

    const processSale = async () => {
        if (cart.length === 0) return alert('El carrito está vacío');
        if (clientId === 'walk_in' && !clientName.trim()) {
            return alert('Error: Es obligatorio ingresar un nombre de comprador causal para facturar.');
        }

        setIsProcessing(true);
        const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
        const discountFactor = tiers[clientId] || 0;

        try {
            for (const cartItem of cart) {
                const revenueAmt = cartItem.price * (1 - discountFactor);
                const costOfGoodsAmt = cartItem.cost * cartItem.qty; // Costo unitario * cantidad vendida
                const txId = 'TX-WEB-' + Date.now();
                const clientNameClean = clientName.trim() || 'Desconocido';

                // 1. Intentar deducir usando RPC para evitar race conditions y asegurar atomicidad
                const { error: rpcError } = await supabase.rpc('procesar_venta_cosecha', {
                    p_harvest_id: cartItem.id,
                    p_qty_sold: cartItem.qty,
                    p_revenue: revenueAmt,
                    p_cost_of_goods: costOfGoodsAmt,
                    p_tx_id: txId,
                    p_client: clientId,
                    p_customer_name: clientNameClean
                });

                if (rpcError) {
                    console.warn('RPC procesar_venta_cosecha falló o no existe. Usando fallback tradicional de cliente.', rpcError);
                    // Fallback tradicional (compatible con esquema previo)
                    const lot = inventory.find(c => c.id === cartItem.id);
                    if (lot) {
                        const newQty = Math.max(0, lot.qty - cartItem.qty);
                        await supabase.from('core_inventory_cosechas').update({ qty: newQty }).eq('id', cartItem.id);
                    }
                    await supabase.from('core_sales').insert([{
                        tx_id: txId,
                        date: new Date().toISOString(),
                        item_id: cartItem.id,
                        qty_sold: cartItem.qty,
                        revenue: revenueAmt, 
                        cost_of_goods: costOfGoodsAmt,
                        client: clientId,
                        customer_name: clientNameClean
                    }]);
                }
            }

            setCart([]);
            setClientName("");
            alert('Venta procesada con éxito y stock descontado!');
            loadInventoryAndSales();
        } catch (e: any) {
            alert('Error procesando venta: ' + e.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const subtotal = cart.reduce((s, i) => s + i.price, 0);
    const discountAmt = subtotal * (tiers[clientId] || 0);
    const grandTotal = subtotal - discountAmt;

    return (
        <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-10">
            {/* Header */}
            <GlassCard className="w-full relative overflow-hidden p-8 flex flex-col md:flex-row justify-between md:items-center gap-6 border-l-4 border-emerald-500">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                <div className="z-10">
                    <h1 className="text-3xl font-extrabold flex items-center gap-3">
                        <ShoppingCart size={32} className="text-emerald-500" />
                        Punto de Venta (POS)
                    </h1>
                    <p className="text-brand-slate-600 dark:text-slate-400 font-mono mt-2 flex items-center gap-2">
                        <span>Terminal Cajas & Facturación</span>
                    </p>
                </div>
            </GlassCard>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Inventario Dispensario */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    <GlassCard>
                        <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
                            <Storefront size={24} className="text-blue-400"/> Inventario Cosechas
                        </h2>
                        {loadingInv ? <p className="text-sm font-mono opacity-50">Cargando Bóveda...</p> : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {inventory.length === 0 ? (
                                    <p className="col-span-3 text-center opacity-50 py-8 border border-dashed border-panel-border rounded-xl font-mono text-sm">
                                        Sin stock apto para venta.
                                    </p>
                                ) : (
                                  inventory.map((item, idx) => {
                                    const { formattedDate, daysElapsed } = getHarvestDateInfo(item.harvest_date || item.date_added);

                                    return (
                                    <div 
                                        key={item.id || idx} 
                                        onClick={() => handleAddToCart(item)} 
                                        className="p-4 rounded-xl border border-panel-border bg-black/[0.03] dark:bg-black/20 hover:border-emerald-500/50 cursor-pointer hover:bg-black/[0.05] dark:bg-black/30 transition-all group flex flex-col justify-between shadow-sm hover:shadow-md"
                                    >
                                        <div>
                                            <div className="flex justify-between items-center mb-2 gap-1">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                                                        {item.type === 'cosecha_local' ? '🌱 Cosecha Propia' : '📦 B2B'}
                                                    </span>
                                                    {item.room_name && (
                                                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
                                                            {item.room_name}
                                                        </span>
                                                    )}
                                                    {item.origen && (
                                                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 uppercase font-bold">
                                                            {item.origen}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 font-semibold flex items-center gap-1 shrink-0">
                                                    <Clock size={12} weight="bold" />
                                                    {daysElapsed === 0 ? 'Día 0 (Hoy)' : `${daysElapsed} ${daysElapsed === 1 ? 'día' : 'días'}`}
                                                </span>
                                            </div>

                                            <h4 className="font-bold text-foreground text-base leading-snug group-hover:text-emerald-400 transition-colors">
                                                {item.name}
                                            </h4>
                                            
                                            <div className="text-[11px] font-mono text-brand-slate-600 mt-1 mb-2.5 flex items-center gap-1.5 flex-wrap">
                                                <span>Lote: <strong className="text-foreground">{item.batch_id || 'NIcole Punch 2-2026'}</strong></span>
                                                {item.strain && <span className="opacity-70">• {item.strain}</span>}
                                            </div>

                                            {/* Info Cosecha Seca, Corte Verde & Curado */}
                                            <div className="bg-black/10 dark:bg-black/40 rounded-lg p-2.5 border border-panel-border/50 flex flex-col gap-1.5 text-xs font-mono mb-2">
                                                {item.wet_harvest_date && (
                                                    <div className="flex items-center justify-between text-[11px] pb-1 border-b border-panel-border/30">
                                                        <span className="text-brand-slate-500 flex items-center gap-1.5">
                                                            <Scissors size={13} className="text-orange-400" />
                                                            Corte Verde (Carpa):
                                                        </span>
                                                        <span className="text-orange-400 font-bold">
                                                            {getHarvestDateInfo(item.wet_harvest_date).formattedDate}
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="flex items-center justify-between">
                                                    <span className="text-brand-slate-500 flex items-center gap-1.5">
                                                        <CalendarBlank size={13} className="text-emerald-400" />
                                                        Cosecha Seca:
                                                    </span>
                                                    <strong className="text-foreground">{formattedDate}</strong>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-brand-slate-500 flex items-center gap-1.5">
                                                        <HourglassMedium size={13} className="text-purple-400" />
                                                        En Inventario:
                                                    </span>
                                                    <strong className="text-purple-400 font-bold">
                                                        {daysElapsed === 0 ? '0 días (Cargado hoy)' : `${daysElapsed} ${daysElapsed === 1 ? 'día de curado' : 'días de curado'}`}
                                                    </strong>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center text-sm font-bold mt-2 pt-2.5 border-t border-panel-border/30">
                                            <span className="text-blue-400 font-mono flex items-baseline gap-1">
                                                <span className="text-lg font-bold">{item.qty}g</span>
                                                <span className="text-xs opacity-70 font-normal">Disp.</span>
                                            </span>
                                            <span className="text-status-green bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-white transition-all text-xs flex items-center gap-1 font-bold">
                                                + Vender
                                            </span>
                                        </div>
                                    </div>
                                    );
                                  })
                                )}
                            </div>
                        )}
                    </GlassCard>
                    
                    {/* Historial Corto */}
                    <GlassCard>
                        <div className="flex justify-between items-center mb-6">
                           <h2 className="text-xl font-bold flex items-center gap-2">
                             <Receipt size={24} className="text-purple-400"/> Registro Ventas Recientes
                           </h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead>
                                    <tr className="border-b border-panel-border/50 text-brand-slate-600 font-mono text-[10px] uppercase tracking-wider">
                                        <th className="py-2 px-3">Fecha</th>
                                        <th className="py-2 px-3">Item/Lote</th>
                                        <th className="py-2 px-3 text-right">Cant.</th>
                                        <th className="py-2 px-3 text-right">Precio/g</th>
                                        <th className="py-2 px-3 text-right">Monto</th>
                                    </tr>
                                </thead>
                                <tbody className="font-mono text-xs">
                                    {salesHistory.map((s, i) => (
                                        <tr key={i} className="border-b border-panel-border/20 hover:bg-black/5">
                                            <td className="py-3 px-3">{new Date(s.date).toLocaleDateString()} {new Date(s.date).toLocaleTimeString([],{hour:'2-digit', minute:'2-digit'})}</td>
                                            <td className="py-3 px-3 truncate max-w-[120px] opacity-70" title={s.item_id}>{s.item_id}</td>
                                            <td className="py-3 px-3 text-right font-bold text-purple-400">{s.qty_sold}g</td>
                                            <td className="py-3 px-3 text-right opacity-60">${(s.revenue / (s.qty_sold||1)).toFixed(0)}/g</td>
                                            <td className="py-3 px-3 text-right font-bold text-status-green">${s.revenue.toLocaleString('es-AR')}</td>
                                        </tr>
                                    ))}
                                    {salesHistory.length === 0 && <tr><td colSpan={5} className="py-4 text-center opacity-50">Sin ventas hoy.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </GlassCard>
                </div>

                {/* Checkout Ticket */}
                <div className="flex flex-col gap-6">
                    <GlassCard className="sticky top-6 border-t-4 border-status-green">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">Ticket de Venta</h3>
                        
                        <div className="flex flex-col gap-3 mb-6">
                            <div>
                                <label className="text-[10px] uppercase font-mono text-brand-slate-600 block mb-1">Nivel de Cliente</label>
                                <select 
                                    className="w-full bg-black/[0.03] dark:bg-black/20 border border-panel-border rounded p-2 text-sm outline-none focus:border-status-green"
                                    value={clientId} onChange={e => setClientId(e.target.value)}
                                >
                                    <option value="walk_in">Cliente Casual (Retail)</option>
                                    <option value="vip_1">Socio VIP (-10%)</option>
                                    <option value="wholesale_1">Mayorista Dispensario (-30%)</option>
                                </select>
                            </div>
                            
                            {clientId === 'walk_in' && (
                                <div>
                                    <label className="text-[10px] uppercase font-mono text-brand-slate-600 block mb-1">Nombre Comprador</label>
                                    <input 
                                        type="text" placeholder="Ej: Juan Perez" required
                                        className="w-full bg-black/[0.03] dark:bg-black/20 border border-panel-border rounded p-2 text-sm font-mono outline-none focus:border-status-green"
                                        value={clientName} onChange={e => setClientName(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="min-h-[150px] max-h-[300px] overflow-y-auto pr-2 mb-4">
                            {cart.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-sm font-mono opacity-40 italic border-dashed border border-panel-border/50 rounded-lg p-6 text-center">
                                    Agregá productos desde el panel izquierdo...
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {cart.map((c, i) => (
                                        <div key={i} className="flex flex-col p-3 rounded-lg bg-black/[0.03] dark:bg-black/20 border border-panel-border group">
                                            <div className="flex justify-between items-start">
                                                <span className="font-bold text-sm text-foreground truncate w-[160px]" title={c.name}>{c.name}</span>
                                                <button onClick={() => removeFromCart(c.id)} className="text-brand-slate-600 hover:text-red-500 transition-colors"><Trash size={16} /></button>
                                            </div>
                                            <div className="flex justify-between items-end mt-1 font-mono">
                                                <span className="text-xs text-brand-slate-600">{c.qty}g × ${c.pricePerG}/g</span>
                                                <span className="font-bold text-status-green">${c.price.toLocaleString('es-AR')}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Totals */}
                        <div className="border-t border-panel-border pt-4 pb-2 flex flex-col gap-2 font-mono text-sm">
                            <div className="flex justify-between text-brand-slate-600">
                                <span>Subtotal:</span>
                                <span>${subtotal.toLocaleString('es-AR')}</span>
                            </div>
                            {discountAmt > 0 && (
                                <div className="flex justify-between text-yellow-500">
                                    <span>Desc. ({tiers[clientId]*100}%):</span>
                                    <span>-${discountAmt.toLocaleString('es-AR')}</span>
                                </div>
                            )}
                            <div className="flex justify-between font-bold text-lg text-foreground mt-2 pt-2 border-t border-panel-border/50">
                                <span>TOTAL:</span>
                                <span>${grandTotal.toLocaleString('es-AR')}</span>
                            </div>
                        </div>

                        <button 
                            onClick={processSale} 
                            disabled={isProcessing || cart.length === 0}
                            className="w-full mt-4 flex justify-center items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-foreground font-bold py-3 px-4 rounded-lg transition-colors shadow-lg shadow-emerald-900/20"
                        >
                            {isProcessing ? "Procesando..." : <><CheckCircle weight="fill" size={20}/> Efectuar Checkout</>}
                        </button>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}
