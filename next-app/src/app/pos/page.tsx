"use client";

import React, { useEffect, useState, useMemo } from "react";
import { GlassCard } from "../../components/ui/GlassCard";
import {
  ShoppingCart,
  Storefront,
  Receipt,
  Trash,
  CheckCircle,
  Clock,
  CalendarBlank,
  TrendUp,
  Users,
  UserPlus,
  MagnifyingGlass,
  Coins,
  Plant,
  Plus
} from "@phosphor-icons/react";
import { supabase } from "../../lib/supabase";
import { AddToCartModal } from "../../components/pos/AddToCartModal";
import { ClientModal } from "../../components/pos/ClientModal";
import { ClientAgendaView } from "../../components/pos/ClientAgendaView";
import { ProfitabilityAnalytics } from "../../components/pos/ProfitabilityAnalytics";
import {
  ClientProfile,
  getClients,
  deleteClient,
  syncHistoricalClients
} from "../../lib/clients";

export function getHarvestDateInfo(dateRaw?: string) {
  if (!dateRaw) return { formattedDate: "Sin fecha", daysElapsed: 0 };

  let harvestDate: Date;
  if (dateRaw.includes("T")) {
    harvestDate = new Date(dateRaw);
  } else {
    const parts = dateRaw.split("-");
    if (parts.length === 3) {
      harvestDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    } else {
      harvestDate = new Date(dateRaw);
    }
  }

  if (isNaN(harvestDate.getTime())) {
    return { formattedDate: "Sin fecha", daysElapsed: 0 };
  }

  const formattedDate = harvestDate.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });

  const now = new Date();
  const todayZero = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const harvestZero = new Date(harvestDate.getFullYear(), harvestDate.getMonth(), harvestDate.getDate());

  const diffMs = todayZero.getTime() - harvestZero.getTime();
  const daysElapsed = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  return { formattedDate, daysElapsed };
}

export default function POSPage() {
  const [activeTab, setActiveTab] = useState<"pos" | "agenda" | "analytics">("pos");
  const [inventory, setInventory] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [allSales, setAllSales] = useState<any[]>([]);
  const [loadingInv, setLoadingInv] = useState(true);

  // Clientes
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientProfile | null>(null);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<ClientProfile | null>(null);

  // Modal para agregar producto (Módulo 1: Adiós prompt)
  const [modalItem, setModalItem] = useState<any | null>(null);

  // Filtro de búsqueda en inventario
  const [invSearch, setInvSearch] = useState("");

  const [isProcessing, setIsProcessing] = useState(false);

  const tiers: Record<string, number> = {
    regular: 0, // 0%
    walk_in: 0, // 0%
    vip_1: 0.1, // 10%
    wholesale_1: 0.3 // 30%
  };

  const loadData = async () => {
    setLoadingInv(true);

    try {
      // 1. Cargar Clientes y sincronizar históricos
      const clientsList = await syncHistoricalClients();
      setClients(clientsList);

      // 2. Cargar Inventario de Cosechas
      const { data: invData } = await supabase.from("core_inventory_cosechas").select("*").gt("qty", 0);
      const { data: partialData } = await supabase.from("core_partial_harvests").select("*");
      const { data: batchesData } = await supabase.from("core_batches").select("*");
      const { data: roomsData } = await supabase.from("core_rooms").select("*");
      const { data: eventsData } = await supabase
        .from("core_agronomic_events")
        .select("*")
        .ilike("event_type", "%cosecha%");

      if (invData) {
        const enriched = invData.map((item: any) => {
          const partial = partialData?.find((p: any) => p.id === item.id);
          const batch = partial ? batchesData?.find((b: any) => b.id === partial.batch_id) : null;
          const room = batch ? roomsData?.find((r: any) => r.id === (batch.location || batch.room_id)) : null;

          const batchWetEvents =
            eventsData?.filter(
              (e: any) => e.batch_id === batch?.id && (e.event_type || "").toLowerCase().includes("cosecha")
            ) || [];

          const tandaLabel = (partial?.tanda_name || item.name || "").toLowerCase();
          const tandaMatch = tandaLabel.match(/tanda\s*(\d+)/i);
          const tandaNum = tandaMatch ? tandaMatch[1] : null;

          let wetEvent: any = null;
          if (tandaNum) {
            const regex = new RegExp(`tanda\\s*${tandaNum}\\b`, "i");
            wetEvent = batchWetEvents.find((e: any) => regex.test(e.description || ""));
          }

          if (!wetEvent && partial?.tanda_name) {
            wetEvent = batchWetEvents.find((e: any) =>
              (e.description || "").toLowerCase().includes(partial.tanda_name.toLowerCase())
            );
          }

          if (!wetEvent && tandaNum) {
            const idx = parseInt(tandaNum, 10) - 1;
            const sortedEvents = [...batchWetEvents].sort(
              (a, b) => new Date(a.date_occurred).getTime() - new Date(b.date_occurred).getTime()
            );
            if (idx >= 0 && idx < sortedEvents.length) {
              wetEvent = sortedEvents[idx];
            }
          }

          if (!wetEvent && batchWetEvents.length > 0) {
            wetEvent = batchWetEvents[0];
          }

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

      // 3. Cargar TODAS las ventas reales (para métricas temporales y clientes)
      const { data: salesData } = await supabase
        .from("core_sales")
        .select("*")
        .neq("client", "proveedor_opex")
        .order("date", { ascending: false });

      if (salesData) {
        setAllSales(salesData);
      }
    } catch (err) {
      console.error("Error al cargar datos del POS:", err);
    } finally {
      setLoadingInv(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Agregar al carrito mediante el modal táctil (Módulo 1)
  const handleAddToCartConfirm = (item: any, qty: number, pricePerG: number) => {
    const total = qty * pricePerG;

    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        if (existing.qty + qty > item.qty) {
          alert("La cantidad total en el ticket supera el stock disponible en bóveda.");
          return prev;
        }
        const newQty = existing.qty + qty;
        const newPrice = existing.price + total;
        return prev.map(c =>
          c.id === item.id
            ? { ...c, qty: newQty, price: newPrice, pricePerG: newPrice / newQty }
            : c
        );
      } else {
        return [
          ...prev,
          {
            id: item.id,
            name: item.name,
            pricePerG,
            price: total,
            cost: Number(item.price) || 0,
            qty
          }
        ];
      }
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(c => c.id !== id));
  };

  // Cálculos en vivo de Venta y Rentabilidad
  const subtotal = useMemo(() => cart.reduce((s, i) => s + i.price, 0), [cart]);
  const totalCogs = useMemo(() => cart.reduce((s, i) => s + i.cost * i.qty, 0), [cart]);
  const discountFactor = useMemo(() => {
    if (selectedClient) {
      return tiers[selectedClient.tier] || 0;
    }
    return 0;
  }, [selectedClient]);

  const discountAmt = subtotal * discountFactor;
  const grandTotal = subtotal - discountAmt;
  const liveProfit = grandTotal - totalCogs;
  const liveMarginPct = grandTotal > 0 ? (liveProfit / grandTotal) * 100 : 0;

  // Checkout y persistencia
  const processSale = async () => {
    if (cart.length === 0) return alert("El carrito está vacío.");

    const buyerName = selectedClient ? selectedClient.name : "Cliente Ocasional";
    const tierCode = selectedClient ? selectedClient.tier : "regular";

    setIsProcessing(true);
    try {
      for (const cartItem of cart) {
        const itemRevenue = cartItem.price * (1 - discountFactor);
        const itemCost = cartItem.cost * cartItem.qty;
        const txId = "TX-WEB-" + Date.now();

        // 1. Intentar deducir usando RPC transaccional
        const { error: rpcError } = await supabase.rpc("procesar_venta_cosecha", {
          p_harvest_id: cartItem.id,
          p_qty_sold: cartItem.qty,
          p_revenue: itemRevenue,
          p_cost_of_goods: itemCost,
          p_tx_id: txId,
          p_client: tierCode,
          p_customer_name: buyerName
        });

        if (rpcError) {
          // Fallback tradicional en caso de que RPC no esté en schema
          const lot = inventory.find(c => c.id === cartItem.id);
          if (lot) {
            const newQty = Math.max(0, lot.qty - cartItem.qty);
            await supabase.from("core_inventory_cosechas").update({ qty: newQty }).eq("id", cartItem.id);
          }
          await supabase.from("core_sales").insert([
            {
              tx_id: txId,
              date: new Date().toISOString(),
              item_id: cartItem.id,
              qty_sold: cartItem.qty,
              revenue: itemRevenue,
              cost_of_goods: itemCost,
              client: tierCode,
              customer_name: buyerName
            }
          ]);
        }
      }

      setCart([]);
      alert(`¡Venta procesada con éxito a nombre de "${buyerName}"!\nStock descontado y rentabilidad registrada.`);
      await loadData();
    } catch (e: any) {
      alert("Error procesando venta: " + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Filtrar inventario en el terminal
  const filteredInventory = useMemo(() => {
    if (!invSearch.trim()) return inventory;
    const q = invSearch.toLowerCase().trim();
    return inventory.filter(
      item =>
        item.name.toLowerCase().includes(q) ||
        (item.strain || "").toLowerCase().includes(q) ||
        (item.room_name || "").toLowerCase().includes(q)
    );
  }, [inventory, invSearch]);

  const handleDeleteClient = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar al comprador "${name}" de la agenda?`)) return;
    await deleteClient(id);
    const updated = await getClients();
    setClients(updated);
    if (selectedClient?.id === id) setSelectedClient(null);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-12">
      {/* Header Principal con Selector de Pestañas */}
      <GlassCard className="w-full relative overflow-hidden p-6 flex flex-col md:flex-row justify-between md:items-center gap-6 border-l-4 border-emerald-500">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <div className="z-10">
          <h1 className="text-3xl font-extrabold flex items-center gap-3">
            <ShoppingCart size={32} className="text-emerald-500" />
            Punto de Venta & Dispensario
          </h1>
          <p className="text-brand-slate-600 dark:text-slate-400 font-mono mt-1 text-xs">
            Terminal de cajas, agenda comercial y control de rentabilidad en tiempo real.
          </p>
        </div>

        {/* Pestañas de Navegación */}
        <div className="flex items-center gap-1.5 p-1.5 bg-black/30 border border-panel-border rounded-xl z-10 flex-wrap">
          <button
            onClick={() => setActiveTab("pos")}
            className={`px-3.5 py-2 text-xs font-mono font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "pos"
                ? "bg-emerald-600 text-white shadow-md"
                : "text-slate-400 hover:text-foreground"
            }`}
          >
            <Storefront size={16} weight="bold" /> Mostrador POS
          </button>

          <button
            onClick={() => setActiveTab("agenda")}
            className={`px-3.5 py-2 text-xs font-mono font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "agenda"
                ? "bg-purple-600 text-white shadow-md"
                : "text-slate-400 hover:text-foreground"
            }`}
          >
            <Users size={16} weight="bold" /> Agenda Compradores ({clients.length})
          </button>

          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-3.5 py-2 text-xs font-mono font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "analytics"
                ? "bg-blue-600 text-white shadow-md"
                : "text-slate-400 hover:text-foreground"
            }`}
          >
            <TrendUp size={16} weight="bold" /> Rentabilidad & Timeline
          </button>
        </div>
      </GlassCard>

      {/* VISTA 1: MOSTRADOR POS */}
      {activeTab === "pos" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-150">
          {/* Columna Izquierda: Inventario y Ventas Recientes */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <GlassCard>
              <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Storefront size={24} className="text-blue-400" /> Bóveda de Flores Secas
                  </h2>
                  <p className="text-xs font-mono text-brand-slate-500">
                    Haz clic en cualquier lote para cargar gramos y precio sugerido.
                  </p>
                </div>

                <div className="relative w-full sm:w-56">
                  <MagnifyingGlass size={16} className="absolute left-3 top-2.5 text-brand-slate-500" />
                  <input
                    type="text"
                    placeholder="Filtrar lote, cepa, sala..."
                    value={invSearch}
                    onChange={e => setInvSearch(e.target.value)}
                    className="w-full bg-black/20 border border-panel-border rounded-lg pl-9 pr-3 py-1.5 text-xs font-mono outline-none focus:border-emerald-500 text-foreground"
                  />
                </div>
              </div>

              {loadingInv ? (
                <p className="text-sm font-mono opacity-50 py-8 text-center">Consultando Bóveda...</p>
              ) : filteredInventory.length === 0 ? (
                <p className="text-center opacity-50 py-12 border border-dashed border-panel-border rounded-xl font-mono text-sm">
                  {invSearch ? "No se encontraron flores con ese criterio." : "Sin stock disponible para venta."}
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredInventory.map((item, idx) => {
                    const { formattedDate, daysElapsed } = getHarvestDateInfo(
                      item.harvest_date || item.date_added
                    );

                    return (
                      <div
                        key={item.id || idx}
                        onClick={() => setModalItem(item)}
                        className="p-4 rounded-xl border border-panel-border bg-black/[0.03] dark:bg-black/20 hover:border-emerald-500/60 cursor-pointer hover:bg-black/[0.06] dark:hover:bg-black/30 transition-all group flex flex-col justify-between shadow-sm hover:shadow-md"
                      >
                        <div>
                          <div className="flex justify-between items-center mb-2 gap-1 flex-wrap">
                            <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                              {item.type === "cosecha_local" ? "🌱 Cosecha Propia" : "📦 B2B"}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 font-semibold flex items-center gap-1">
                              <CalendarBlank size={12} weight="bold" />
                              {formattedDate} • {daysElapsed === 0 ? "Hoy" : `${daysElapsed}d`}
                            </span>
                          </div>

                          <h4 className="font-bold text-foreground text-base leading-snug group-hover:text-emerald-400 transition-colors">
                            {item.name}
                          </h4>

                          <div className="text-[11px] font-mono text-brand-slate-500 mt-1 mb-3 flex items-center gap-1.5 flex-wrap">
                            {item.strain && <span>Cepa: <strong className="text-foreground">{item.strain}</strong></span>}
                            {item.room_name && <span>• {item.room_name}</span>}
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between items-center text-xs font-mono mb-2 pt-2 border-t border-panel-border/30 text-brand-slate-500">
                            <span>Costo Prod:</span>
                            <span className="font-bold text-emerald-400">
                              ${Number(item.price || 0).toFixed(0)}/g
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-sm font-bold pt-1">
                            <span className="text-blue-400 font-mono flex items-baseline gap-1">
                              <span className="text-lg font-bold">{item.qty}g</span>
                              <span className="text-xs opacity-70 font-normal">Disp.</span>
                            </span>
                            <span className="text-status-green bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-white transition-all text-xs flex items-center gap-1 font-bold">
                              + Dispensar
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </GlassCard>

            {/* Historial Reciente de Ventas */}
            <GlassCard>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-base font-bold flex items-center gap-2">
                  <Receipt size={20} className="text-purple-400" /> Registro Ventas Recientes
                </h2>
                <button
                  onClick={() => setActiveTab("analytics")}
                  className="text-xs font-mono text-purple-400 hover:text-purple-300 underline"
                >
                  Ver analítica completa →
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-panel-border/50 text-brand-slate-600 font-mono text-[10px] uppercase tracking-wider">
                      <th className="py-2 px-3">Fecha</th>
                      <th className="py-2 px-3">Comprador</th>
                      <th className="py-2 px-3">Lote / Ítem</th>
                      <th className="py-2 px-3 text-right">Cant.</th>
                      <th className="py-2 px-3 text-right">Precio/g</th>
                      <th className="py-2 px-3 text-right">Total Cobrado</th>
                      <th className="py-2 px-3 text-right text-emerald-400">Ganancia Real</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono text-xs">
                    {allSales.slice(0, 5).map((s, i) => {
                      const rev = Number(s.revenue) || 0;
                      const cogs = Number(s.cost_of_goods) || 0;
                      const profit = rev - cogs;
                      const invItem = inventory.find(it => it.id === s.item_id);
                      const itemName = invItem ? invItem.name : s.item_id;

                      return (
                        <tr key={i} className="border-b border-panel-border/20 hover:bg-black/5">
                          <td className="py-2.5 px-3 text-brand-slate-400">
                            {new Date(s.date).toLocaleDateString()}{" "}
                            {new Date(s.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-foreground">{s.customer_name || "Casual"}</td>
                          <td className="py-2.5 px-3 truncate max-w-[140px] opacity-80" title={itemName}>
                            {itemName}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-purple-400">{s.qty_sold}g</td>
                          <td className="py-2.5 px-3 text-right opacity-60">
                            ${(rev / (s.qty_sold || 1)).toFixed(0)}/g
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-status-green">
                            ${rev.toLocaleString("es-AR")}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                            +${profit.toLocaleString("es-AR")}
                          </td>
                        </tr>
                      );
                    })}
                    {allSales.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-6 text-center opacity-50">
                          Sin ventas registradas aún.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </div>

          {/* Columna Derecha: Ticket de Venta con Rentabilidad en Vivo */}
          <div className="flex flex-col gap-6">
            <GlassCard className="sticky top-6 border-t-4 border-status-green flex flex-col gap-4">
              <h3 className="text-lg font-bold flex items-center gap-2">Ticket de Dispensación</h3>

              {/* Selector de Comprador / Agenda */}
              <div className="flex flex-col gap-2 p-3 bg-black/20 border border-panel-border rounded-xl">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] uppercase font-mono text-brand-slate-600 font-bold block">
                    Comprador / Socio
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setClientToEdit(null);
                      setIsClientModalOpen(true);
                    }}
                    className="text-[10px] font-mono text-purple-400 hover:text-purple-300 underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <UserPlus size={12} /> + Nuevo
                  </button>
                </div>

                <select
                  value={selectedClient ? selectedClient.id : ""}
                  onChange={e => {
                    const c = clients.find(cl => cl.id === e.target.value);
                    setSelectedClient(c || null);
                  }}
                  className="w-full bg-black/30 border border-panel-border rounded-lg p-2.5 text-xs font-semibold text-foreground outline-none focus:border-status-green"
                >
                  <option value="" className="bg-slate-900 text-slate-400">
                    -- Cliente Ocasional / Mostrador (Tarifa Plena) --
                  </option>
                  {clients.map(cl => (
                    <option key={cl.id} value={cl.id} className="bg-slate-900 text-white">
                      {cl.name} {cl.phone ? `(${cl.phone})` : ""} - {cl.tier === "vip_1" ? "VIP (-10%)" : cl.tier === "wholesale_1" ? "Mayorista (-30%)" : "Regular"}
                    </option>
                  ))}
                </select>

                {selectedClient && (
                  <div className="flex items-center justify-between text-[11px] font-mono mt-1 text-brand-slate-400">
                    <span>
                      Tarifa: <strong className="text-purple-300 uppercase">{selectedClient.tier}</strong>
                    </span>
                    {tiers[selectedClient.tier] > 0 && (
                      <span className="text-amber-400 font-bold">
                        {(tiers[selectedClient.tier] * 100).toFixed(0)}% OFF
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Lista del Carrito */}
              <div className="min-h-[140px] max-h-[260px] overflow-y-auto pr-1 flex flex-col gap-2">
                {cart.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs font-mono opacity-40 italic border-dashed border border-panel-border/50 rounded-lg p-6 text-center">
                    Seleccioná flores secas del panel izquierdo para agregarlas al ticket...
                  </div>
                ) : (
                  cart.map((c, i) => (
                    <div
                      key={i}
                      className="flex flex-col p-3 rounded-lg bg-black/[0.03] dark:bg-black/20 border border-panel-border group"
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-xs text-foreground truncate w-[160px]" title={c.name}>
                          {c.name}
                        </span>
                        <button
                          onClick={() => removeFromCart(c.id)}
                          className="text-brand-slate-600 hover:text-red-500 transition-colors p-0.5"
                        >
                          <Trash size={16} />
                        </button>
                      </div>
                      <div className="flex justify-between items-end mt-1.5 font-mono text-xs">
                        <span className="text-[11px] text-brand-slate-500">
                          {c.qty}g × ${c.pricePerG.toLocaleString("es-AR")}/g
                        </span>
                        <span className="font-bold text-status-green">${c.price.toLocaleString("es-AR")}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Totales y Rentabilidad en Vivo */}
              <div className="border-t border-panel-border pt-3 flex flex-col gap-2 font-mono text-xs">
                <div className="flex justify-between text-brand-slate-500">
                  <span>Subtotal:</span>
                  <span>${subtotal.toLocaleString("es-AR")}</span>
                </div>

                {discountAmt > 0 && (
                  <div className="flex justify-between text-amber-400">
                    <span>Descuento ({(discountFactor * 100).toFixed(0)}%):</span>
                    <span>-${discountAmt.toLocaleString("es-AR")}</span>
                  </div>
                )}

                <div className="flex justify-between font-bold text-base text-foreground pt-1.5 border-t border-panel-border/40">
                  <span>TOTAL A COBRAR:</span>
                  <span className="text-emerald-400">${grandTotal.toLocaleString("es-AR")}</span>
                </div>

                {/* BLOQUE DE RENTABILIDAD EN VIVO */}
                {cart.length > 0 && (
                  <div className="mt-2 p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-lg flex flex-col gap-1.5 text-xs">
                    <div className="flex justify-between text-brand-slate-500 text-[11px]">
                      <span>Costo Agronómico (COGS):</span>
                      <span>${Math.round(totalCogs).toLocaleString("es-AR")}</span>
                    </div>
                    <div className="flex justify-between items-center font-bold text-emerald-400 pt-1 border-t border-emerald-500/20">
                      <span className="flex items-center gap-1">
                        <TrendUp size={14} weight="bold" /> Ganancia Neta:
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span>+${Math.round(liveProfit).toLocaleString("es-AR")}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/25 text-emerald-300 font-bold">
                          {liveMarginPct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={processSale}
                disabled={isProcessing || cart.length === 0}
                className="w-full mt-2 flex justify-center items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-lg shadow-emerald-900/20 cursor-pointer text-sm"
              >
                {isProcessing ? "Procesando..." : <><CheckCircle weight="fill" size={20} /> EFECTUAR CHECKOUT</>}
              </button>
            </GlassCard>
          </div>
        </div>
      )}

      {/* VISTA 2: AGENDA DE COMPRADORES */}
      {activeTab === "agenda" && (
        <ClientAgendaView
          clients={clients}
          onNewClient={() => {
            setClientToEdit(null);
            setIsClientModalOpen(true);
          }}
          onEditClient={c => {
            setClientToEdit(c);
            setIsClientModalOpen(true);
          }}
          onDeleteClient={handleDeleteClient}
          onSelectForSale={c => {
            setSelectedClient(c);
            setActiveTab("pos");
          }}
        />
      )}

      {/* VISTA 3: MÉTRICAS & RENTABILIDAD TEMPORAL Y POR CLIENTE */}
      {activeTab === "analytics" && (
        <ProfitabilityAnalytics
          sales={allSales}
          clients={clients}
          inventory={inventory}
          onRefresh={loadData}
        />
      )}

      {/* Modal Táctil de Agregar al Carrito (Módulo 1) */}
      <AddToCartModal
        isOpen={!!modalItem}
        item={modalItem}
        onClose={() => setModalItem(null)}
        onConfirm={handleAddToCartConfirm}
      />

      {/* Modal de Crear / Editar Cliente */}
      <ClientModal
        isOpen={isClientModalOpen}
        clientToEdit={clientToEdit}
        onClose={() => setIsClientModalOpen(false)}
        onSaved={saved => {
          setClients(prev => {
            const idx = prev.findIndex(c => c.id === saved.id);
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = saved;
              return updated;
            }
            return [...prev, saved];
          });
          setSelectedClient(saved);
        }}
      />
    </div>
  );
}
