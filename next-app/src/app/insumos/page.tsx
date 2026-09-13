"use client";

import React, { useEffect, useState } from "react";
import { GlassCard } from "../../components/ui/GlassCard";
import { Flask, Plus, Warehouse, WarningOctagon, CaretRight, X, FloppyDisk, PencilSimple, Storefront, Clock, CalendarBlank, HourglassMedium, Plant, Scissors } from "@phosphor-icons/react";
import { supabase } from "../../lib/supabase";
import { getHarvestDateInfo } from "../pos/page";

export default function InsumosPage() {
  const [quimicos, setQuimicos] = useState<any[]>([]);
  const [cosechas, setCosechas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCosechas, setLoadingCosechas] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Modal form states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("fertilizante");
  const [newQty, setNewQty] = useState("");
  const [newCost, setNewCost] = useState("");
  const [newUom, setNewUom] = useState("ml");
  const [newMinStock, setNewMinStock] = useState("1000"); // Ej: 1000ml por defecto

  const loadInventory = async () => {
    setLoading(true);
    setLoadingCosechas(true);
    
    // Load Quimicos
    const { data, error } = await supabase.from('core_inventory_quimicos').select('*');
    if (error) {
        console.error("Supabase Error:", error);
    }
    if (data && !error) {
        const grouped = Array.from(
          data.reduce((acc: Map<string, any>, item: any) => {
            const key = (item.name || "").trim().toLowerCase();
            if (!acc.has(key)) {
               acc.set(key, { ...item, original_qty: item.qty });
            } else {
               const existing = acc.get(key);
               existing.qty += item.qty;
               existing.id = item.id; // Keep latest ID for editing metadata
               existing.unit_cost = item.unit_cost; // Latest cost
               existing.min_stock = item.min_stock;
            }
            return acc;
          }, new Map()).values()
        );
        grouped.sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));
        setQuimicos(grouped);
    }
    setLoading(false);

    // Load Cosechas enriched with batch, room and agronomic events
    const { data: invCosechas } = await supabase.from('core_inventory_cosechas').select('*').gt('qty', 0);
    const { data: partialData } = await supabase.from('core_partial_harvests').select('*');
    const { data: batchesData } = await supabase.from('core_batches').select('*');
    const { data: roomsData } = await supabase.from('core_rooms').select('*');
    const { data: eventsData } = await supabase.from('core_agronomic_events').select('*').ilike('event_type', '%cosecha%');

    if (invCosechas) {
        const enriched = invCosechas.map((item: any) => {
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
        setCosechas(enriched);
    }
    setLoadingCosechas(false);
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const openNewModal = () => {
      setEditingId(null);
      setNewName("");
      setNewType("fertilizante");
      setNewUom("ml");
      setNewQty("");
      setNewCost("");
      setNewMinStock("1000");
      setIsModalOpen(true);
  };

  const openEditModal = (item: any) => {
      setEditingId(item._all_ids ? item._all_ids.join(',') : item.id);
      setNewName(item.name || "");
      setNewType(item.type || "fertilizante");
      // Rescatar UoM (Si no existe en el item viejo, usar 'unidades')
      setNewUom(item.uom || 'unidades');
      setNewQty(String(item.qty || 0));
      // Revertir el cost total multiplicando el cost unitario de DB por el stock
      const totalPaid = (item.qty || 0) * (item.unit_cost || 0);
      setNewCost(totalPaid > 0 ? String(totalPaid) : "");
      setNewMinStock(String(item.min_stock || 1000));
      setIsModalOpen(true);
  };

  const handleCreateInsumo = async (e: React.FormEvent) => {
    e.preventDefault();
    const qtyTotal = parseFloat(newQty) || 0;
    const costTotal = parseFloat(newCost) || 0;
    const calculatedUnitCost = qtyTotal > 0 ? costTotal / qtyTotal : 0;

    const payload: any = {
        name: newName,
        type: newType,
        uom: newUom,
        min_stock: parseFloat(newMinStock) || 0,
        last_updated: new Date().toISOString()
    };

    if (!editingId) {
        payload.qty = qtyTotal;
        payload.unit_cost = Number(calculatedUnitCost.toFixed(2));
    }

    let errorResult = null;

    if(editingId) {
       // If editingId is an array of IDs (because we grouped them), update all of them
       const idsToUpdate = typeof editingId === 'string' && editingId.includes(',') ? editingId.split(',') : [editingId];
       const { error } = await supabase.from('core_inventory_quimicos').update(payload).in('id', idsToUpdate);
       errorResult = error;
    } else {
       const { error } = await supabase.from('core_inventory_quimicos').insert([payload]);
       errorResult = error;
    }
    
    if (errorResult) {
        alert("Error de Registro: " + errorResult.message);
    } else {
        setIsModalOpen(false);
        loadInventory();
    }
  };

  const calcTotalCost = (qty: number, unitCost: number) => {
      const q = qty || 0;
      const c = unitCost || 0;
      return (q * c).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-10">
      
      {/* Top Banner Agrupador */}
      <GlassCard className="w-full relative overflow-hidden p-8 flex flex-col md:flex-row justify-between md:items-center gap-6 border-l-4 border-emerald-500">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <div className="z-10">
           <h1 className="text-3xl font-extrabold flex items-center gap-3">
             <Warehouse size={32} className="text-emerald-500" />
             Bodegas & Inventario B2B
           </h1>
           <div className="text-brand-slate-600 dark:text-slate-400 font-mono mt-2 flex flex-wrap items-center gap-4 text-sm">
             <span className="flex items-center gap-1.5">
               <span>Insumos Químicos:</span>
               <strong className="text-purple-400">{quimicos.length} Productos</strong>
             </span>
             <span className="text-panel-border">•</span>
             <span className="flex items-center gap-1.5">
               <span>Bóveda Cosechas:</span>
               <strong className="text-emerald-400">{cosechas.length} Lotes ({cosechas.reduce((sum, c) => sum + (c.qty || 0), 0)}g)</strong>
             </span>
           </div>
        </div>
        <div className="z-10">
           <button 
             onClick={openNewModal}
             className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-transform hover:scale-105 shadow-[0_0_20px_rgba(16,185,129,0.3)] font-bold uppercase tracking-wider text-sm"
           >
             <Plus size={18} weight="bold" /> Registrar Ingreso Insumo
           </button>
        </div>
      </GlassCard>

      {/* Bóveda de Cosechas Secas */}
      <section>
        <GlassCard className="w-full border-t border-t-orange-500/50">
           <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Storefront size={24} className="text-orange-400" /> Inventario Cosechas (Bóveda de Flores Secas)
              </h2>
              <span className="text-xs font-mono text-orange-400 bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20 font-bold">
                {cosechas.reduce((sum, c) => sum + (c.qty || 0), 0)}g Disponibles
              </span>
           </div>

           {loadingCosechas ? (
              <p className="text-sm font-mono opacity-50 py-6 text-center">Consultando Bóveda de Cosechas...</p>
           ) : cosechas.length === 0 ? (
              <div className="text-center py-8 opacity-60 font-mono text-sm border border-dashed border-panel-border rounded-xl">
                 Sin cosechas secas almacenadas en bóveda actualmente.
              </div>
           ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                 {cosechas.map((item, idx) => {
                    const { formattedDate, daysElapsed } = getHarvestDateInfo(item.harvest_date || item.date_added);

                    return (
                       <div 
                          key={item.id || idx} 
                          className="p-4 rounded-xl border border-panel-border bg-black/[0.03] dark:bg-black/20 hover:border-orange-500/50 transition-all flex flex-col justify-between shadow-sm hover:shadow-md"
                       >
                          <div>
                             <div className="flex justify-between items-center mb-2 gap-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                   <span className="text-[10px] uppercase font-bold text-orange-400 tracking-wider">
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

                             <h4 className="font-bold text-foreground text-base leading-snug">
                                {item.name}
                             </h4>
                             
                             <div className="text-[11px] font-mono text-brand-slate-600 mt-1 mb-2.5 flex items-center gap-1.5 flex-wrap">
                                <span>Lote: <strong className="text-foreground">{item.batch_id || 'NIcole Punch 2-2026'}</strong></span>
                                {item.strain && <span className="opacity-70">• {item.strain}</span>}
                             </div>

                             {/* Info Cosecha Seca, Corte Verde & Curado */}
                             <div className="bg-black/10 dark:bg-black/40 rounded-lg p-2.5 border border-panel-border/50 flex flex-col gap-1 text-xs font-mono mb-2">
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
                                <span className="text-xs opacity-70 font-normal">Stock Bóveda</span>
                             </span>
                             {item.price > 0 && (
                                <span className="text-xs font-mono text-brand-slate-500">
                                   Costo: ${Number(item.price).toFixed(0)}/g
                                </span>
                             )}
                          </div>
                       </div>
                    );
                 })}
              </div>
           )}
        </GlassCard>
      </section>

      {/* Stock Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <GlassCard className="border-l-4 border-yellow-500 bg-yellow-500/5">
            <h3 className="text-yellow-500 font-bold flex items-center gap-2 mb-2"><WarningOctagon size={20} /> Alertas de Bajo Stock</h3>
            <p className="text-sm font-mono text-brand-slate-600 dark:text-slate-400">
                {quimicos.filter(q => q.qty <= (q.min_stock || 0)).length > 0 
                  ? <span className="text-status-red flash-text">¡ATENCIÓN! Insumos por debajo del punto de pedido crítico.</span> 
                  : "Todo el stock dentro de los parámetros de seguridad."}
            </p>
         </GlassCard>
      </div>

      {/* Inventario Químico Table */}
      <section>
        <GlassCard className="w-full">
           <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Flask size={24} className="text-purple-400" /> Nutrición & Químicos
              </h2>
           </div>
           
           <div className="overflow-x-auto">
             <table className="w-full text-left text-sm whitespace-nowrap">
               <thead>
                 <tr className="border-b border-panel-border/50 text-brand-slate-600 dark:text-slate-400 font-mono text-xs uppercase tracking-wider">
                   <th className="py-3 px-4 font-normal">Insumo Identificador</th>
                   <th className="py-3 px-4 font-normal">Clasificación</th>
                   <th className="py-3 px-4 text-right font-normal">Stock Bodega</th>
                   <th className="py-3 px-4 text-right font-normal">Costo Unitario</th>
                   <th className="py-3 px-4 text-right font-normal">Capital Valorizado (Costo)</th>
                   <th className="py-3 px-4 text-center font-normal">Acciones</th>
                 </tr>
               </thead>
               <tbody className="font-mono">
                 {loading ? (
                    <tr><td colSpan={6} className="py-8 px-4 text-center text-brand-slate-600">Sincronizando Bodegas vía Supabase...</td></tr>
                 ) : quimicos.length === 0 ? (
                    <tr><td colSpan={6} className="py-8 px-4 text-center text-status-yellow border border-dashed border-status-yellow/30 bg-status-yellow/5 rounded-lg mt-4 block">BODEGA CRÍTICA ESTÁ VACÍA</td></tr>
                 ) : quimicos.map((item, i) => {
                   const uom = item.uom || 'unidades';
                   const isCritical = item.qty <= (item.min_stock || 100);
                   return (
                   <tr key={i} className="border-b border-panel-border/20 hover:bg-black/5 dark:hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
                     <td className="py-4 px-4 font-sans font-bold text-foreground">
                        {item.name || `Químico ${item.id.substring?.(0,5)}`}
                     </td>
                     <td className="py-4 px-4">
                        <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400">
                           {item.type || 'N/A'}
                        </span>
                     </td>
                     <td className="py-4 px-4 text-right">
                        <span className={"font-bold tracking-widest text-lg " + (isCritical ? 'text-status-red drop-shadow-[0_0_5px_red]' : 'text-emerald-500')}>
                          {item.qty} <span className="text-xs opacity-60 font-medium">{uom}</span>
                        </span>
                     </td>
                     <td className="py-4 px-4 text-right text-brand-slate-600 font-medium">
                        $ {item.unit_cost || 0} <span className="text-xs opacity-50">/{uom}</span>
                     </td>
                     <td className="py-4 px-4 text-right text-emerald-400 font-bold bg-emerald-500/5 drop-shadow-[0_0_2px_#10B981]">
                        {calcTotalCost(item.qty, item.unit_cost)}
                     </td>
                     <td className="py-4 px-4 text-center">
                        <button 
                            onClick={() => openEditModal(item)}
                            className="p-2 rounded hover:bg-emerald-500/20 text-brand-slate-600 hover:text-emerald-500 transition-colors"
                        >
                            <PencilSimple size={20} />
                        </button>
                     </td>
                   </tr>
                 )})}
               </tbody>
             </table>
           </div>
        </GlassCard>
      </section>

      {/* Modal Ingreso de Insumos */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <GlassCard className="max-w-lg w-full p-6 shadow-2xl border-emerald-500/30">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                 <Flask size={24} className="text-emerald-500"/> 
                 {editingId ? "Editar Reactivo Químico" : "Nuevo Reactivo Químico"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-brand-slate-600 hover:text-foreground p-1 rounded hover:bg-panel-border transition-colors"><X size={24}/></button>
            </div>

            <form onSubmit={handleCreateInsumo} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-mono text-brand-slate-600 uppercase mb-1 block">Nombre Comercial</label>
                <input 
                   type="text" required
                   list="existing-products"
                   value={newName} onChange={e => setNewName(e.target.value)}
                   placeholder="Ej: Advanced Nutrients Grow"
                   className="w-full bg-black/[0.03] dark:bg-black/20 border border-panel-border rounded-lg p-2.5 text-sm outline-none focus:border-emerald-500 transition-colors"
                />
                <datalist id="existing-products">
                    {quimicos.map((item: any) => (
                        <option key={item.name} value={item.name} />
                    ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-mono text-brand-slate-600 uppercase mb-1 block">Categoría (Tipo)</label>
                    <select 
                       value={newType} onChange={e => setNewType(e.target.value)}
                       className="w-full bg-black/[0.03] dark:bg-black/20 border border-panel-border rounded-lg p-2.5 text-sm outline-none focus:border-emerald-500 font-mono"
                    >
                       <option value="fertilizante">Fertilizante (Líquido/Polvo)</option>
                       <option value="pesticida">Pesticida / Fungicida</option>
                       <option value="sustrato">Sustrato Genérico</option>
                       <option value="miscelaneo">Otros (Misceláneo)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-mono text-brand-slate-600 uppercase mb-1 block">Unidad de Medida (UoM)</label>
                    <select 
                       value={newUom} onChange={e => setNewUom(e.target.value)}
                       className="w-full bg-black/[0.03] dark:bg-black/20 border border-panel-border rounded-lg p-2.5 text-sm outline-none focus:border-emerald-500 font-mono"
                    >
                       <option value="ml">Mililitros (ml)</option>
                       <option value="L">Litros (L)</option>
                       <option value="gr">Gramos (gr)</option>
                       <option value="Kg">Kilogramos (Kg)</option>
                       <option value="unidades">Unidades / Piezas</option>
                    </select>
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-mono text-brand-slate-600 uppercase mb-1 block">Stock Total Actual</label>
                    <input 
                       type="number" step="0.01" required
                       value={newQty} onChange={e => setNewQty(e.target.value)}
                       placeholder="1000"
                       disabled={!!editingId}
                       className="w-full bg-black/[0.03] dark:bg-black/20 border border-panel-border rounded-lg p-2.5 text-sm outline-none focus:border-emerald-500 text-right font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-mono text-brand-slate-600 uppercase mb-1 block">Costo de Capital Total ($)</label>
                    <input 
                       type="number" step="0.01" required
                       value={newCost} onChange={e => setNewCost(e.target.value)}
                       placeholder="$ 5500.00"
                       disabled={!!editingId}
                       className="w-full bg-black/[0.03] dark:bg-black/20 border border-panel-border rounded-lg p-2.5 text-sm outline-none focus:border-emerald-500 text-right font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                  {editingId && (
                      <div className="col-span-2 text-[10px] text-yellow-500 font-mono">
                          Nota: Para agregar nuevo stock o un costo diferente, crea un "Nuevo Reactivo Químico" con el mismo Nombre Comercial exacto. El sistema los agrupará automáticamente.
                      </div>
                  )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-xs font-mono text-brand-slate-600 uppercase mb-1 block">Alerta Critical Stock</label>
                    <input 
                       type="number" step="1" required
                       value={newMinStock} onChange={e => setNewMinStock(e.target.value)}
                       placeholder="1000"
                       className="w-full bg-black/[0.03] dark:bg-black/20 border border-panel-border rounded-lg p-2.5 text-sm outline-none focus:border-yellow-500 text-right font-mono text-yellow-500"
                    />
                  </div>
              </div>

              <div className="mt-4 pt-4 border-t border-panel-border flex justify-end gap-3">
                 <button 
                   type="button" 
                   onClick={() => setIsModalOpen(false)}
                   className="px-4 py-2 rounded-lg text-sm font-bold text-brand-slate-600 hover:bg-black/[0.03] dark:bg-black/20"
                 >Cancelar</button>
                 <button 
                   type="submit" 
                   className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-lg font-bold text-sm"
                 >
                    <FloppyDisk size={18}/> 
                    {editingId ? "ACTUALIZAR" : "CREAR INSUMO"}
                 </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

    </div>
  );
}
