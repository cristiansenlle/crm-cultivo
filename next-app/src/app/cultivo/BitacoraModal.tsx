"use client";

import React, { useState, useEffect } from "react";
import { X, Drop, Bug, Scissors, ClockCounterClockwise, FloppyDisk, Warning, PencilSimple, Trash } from "@phosphor-icons/react";
import { supabase } from "../../lib/supabase";

export function BitacoraModal({ batch, onClose }: { batch: any, onClose: () => void }) {
  const [events, setEvents] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  
  const [actionType, setActionType] = useState<"riego" | "ipm" | "poda" | "alerta">("riego");
  
  // States Modal Forms
  const [selectedProduct, setSelectedProduct] = useState("");
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [podaType, setPodaType] = useState("Defoliación Baja");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit States
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingOldAmount, setEditingOldAmount] = useState<number>(0);
  const [editingOldProductId, setEditingOldProductId] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
    fetchInventory();
  }, [batch]);

  const fetchEvents = async () => {
    setLoadingEvents(true);
    const { data } = await supabase
      .from('core_agronomic_events')
      .select('*')
      .eq('batch_id', batch.id)
      .order('date_occurred', { ascending: false });
    if (data) setEvents(data);
    setLoadingEvents(false);
  };

  const fetchInventory = async () => {
    const { data } = await supabase
      .from('core_inventory_quimicos')
      .select('*')
      .order('name');
    if (data) setInventory(data);
  };

  const handleEditClick = (ev: any) => {
    const et = ev.event_type.toLowerCase();
    setActionType(et === 'riego' || et === 'nutricion' ? 'riego' : et === 'ipm' ? 'ipm' : et === 'alerta' ? 'alerta' : 'poda');
    setSelectedProduct(ev.product_id || "");
    setAmount(ev.amount_applied ? ev.amount_applied.toString() : "");
    
    // Extract raw notes if possible
    let rawDesc = ev.description || "";
    if (rawDesc.includes(". ")) {
      const parts = rawDesc.split(". ");
      // Simple heuristic: if the first part is fully uppercase or looks like a prefix
      if (parts[0] === parts[0].toUpperCase() || parts[0].includes(":") || parts[0].includes("PODA")) {
         rawDesc = parts.slice(1).join(". ");
      }
    }
    setDesc(rawDesc);
    
    if (et === 'poda') {
        const podaMatch = ev.description?.match(/PODA: (.*?)\./);
        if (podaMatch && podaMatch[1]) setPodaType(podaMatch[1]);
    }

    setEditingEventId(ev.id);
    setEditingOldAmount(ev.amount_applied || 0);
    setEditingOldProductId(ev.product_id || null);
  };

  const handleDeleteEvent = async (ev: any) => {
    if (!window.confirm("¿Seguro que querés eliminar este registro? La cantidad de insumo se restaurará al inventario (si aplica).")) return;
    
    if (ev.product_id && ev.amount_applied > 0) {
       const oldItem = inventory.find(i => i.id === ev.product_id);
       if (oldItem) {
          const newQty = oldItem.qty + ev.amount_applied;
          await supabase.from('core_inventory_quimicos').update({ qty: newQty }).eq('id', oldItem.id);
       }
    }
    
    await supabase.from('core_agronomic_events').delete().eq('id', ev.id);
    await fetchEvents();
    await fetchInventory();
  };

  const cancelEdit = () => {
    setEditingEventId(null);
    setDesc("");
    setAmount("");
    setSelectedProduct("");
    setActionType("riego");
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    let finalDesc = desc;
    let finalCost = 0;
    
    // Clone inventory to modify locally before save
    let updatedInv = [...inventory];

    if (editingEventId && editingOldProductId && editingOldAmount > 0) {
       const oldItem = updatedInv.find(i => i.id === editingOldProductId);
       if (oldItem) {
          await supabase.from('core_inventory_quimicos').update({ qty: oldItem.qty + editingOldAmount }).eq('id', oldItem.id);
          oldItem.qty += editingOldAmount;
       }
    }
    
    let selectedProductIdForEvent: string | null = null;
    
    if (actionType === 'riego' || actionType === 'ipm') {
       if (selectedProduct) { // selectedProduct is now the NAME
          const matchingItems = updatedInv
              .filter(i => i.name === selectedProduct)
              .sort((a,b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
          
          let reqAmount = parseFloat(amount) || 0;
          
          if (matchingItems.length === 0) {
             alert("Producto no encontrado en inventario."); setIsSubmitting(false); return;
          }
          if (reqAmount <= 0) {
             alert("Ingresa una cantidad mayor a 0 mL."); setIsSubmitting(false); return;
          }
          
          const totalStock = matchingItems.reduce((sum, i) => sum + i.qty, 0);
          if (reqAmount > totalStock) {
             alert(`Stock Insuficiente. Requerís ${reqAmount} pero el total combinado es ${totalStock} disponibles en Bodega.`); setIsSubmitting(false); return;
          }
          
          let remainingReq = reqAmount;
          let calculatedCost = 0;
          let lastConsumedItemId = matchingItems[0].id;

          for (const item of matchingItems) {
              if (remainingReq <= 0) break;
              if (item.qty <= 0) continue; // Skip empty stocks
              
              const consume = Math.min(remainingReq, item.qty);
              calculatedCost += parseFloat(item.unit_cost || 0) * consume;
              
              const newQty = item.qty - consume;
              await supabase.from('core_inventory_quimicos').update({ qty: newQty }).eq('id', item.id);
              
              item.qty = newQty;
              remainingReq -= consume;
              lastConsumedItemId = item.id;
          }
          
          finalCost = calculatedCost;
          const unit = matchingItems[0]?.uom || matchingItems[0]?.unit || 'unidades';
          finalDesc = `${actionType.toUpperCase()}: ${selectedProduct} (${reqAmount} ${unit}). ` + desc;
          selectedProductIdForEvent = lastConsumedItemId;

       } else {
          finalDesc = `${actionType === 'riego' ? 'Sólo Agua / Preventivo Manual' : 'Acción Manual (sin insumo)'}. ` + desc;
       }
    } else if (actionType === 'poda') {
       finalDesc = `PODA: ${podaType}. ` + desc;
    } else if (actionType === 'alerta') {
       finalDesc = `⚠️ EVENTO/PLAGA: ` + desc;
    }

    const payload: any = {
      batch_id: batch.id,
      room_id: batch.location || batch.room_id,
      event_type: actionType === 'riego' ? 'Riego' : actionType === 'ipm' ? 'IPM' : actionType,
      amount_applied: amount ? parseFloat(amount) : null,
      product_id: selectedProductIdForEvent || null,
      total_cost: finalCost,
      description: finalDesc,
    };

    if (editingEventId) {
       const { error } = await supabase.from('core_agronomic_events').update(payload).eq('id', editingEventId);
       if (!error) {
         cancelEdit();
         await fetchEvents();
         await fetchInventory(); 
       } else {
         alert("Error actualizando el registro. " + error.message);
       }
    } else {
       payload.date_occurred = new Date().toISOString();
       const { error } = await supabase.from('core_agronomic_events').insert([payload]);
       if (!error) {
         setDesc(""); setAmount(""); setSelectedProduct("");
         await fetchEvents();
         await fetchInventory(); 
       } else {
         alert("Error insertando el registro. " + error.message);
       }
    }
    
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-panel-base border-l border-panel-border w-full max-w-2xl h-full shadow-2xl flex flex-col slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="p-6 border-b border-panel-border bg-black/[0.03] dark:bg-black/20 flex justify-between items-center">
           <div>
             <h2 className="text-xl font-bold flex items-center gap-2">
               Bitácora Operativa
             </h2>
             <p className="text-sm font-mono text-emerald-500 mt-1">Lote: {batch.id} ({batch.strain})</p>
           </div>
           <button onClick={onClose} className="text-brand-slate-600 hover:text-foreground transition-colors bg-black/[0.08] dark:bg-black/40 p-2 rounded-lg">
             <X size={24} />
           </button>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col md:flex-row">
            {/* Panel de Inyección (Col 1) */}
            <div className="p-6 md:w-1/2 border-r border-panel-border/30 bg-black/10 flex flex-col">
               <div className="flex justify-between items-center mb-6">
                 <h3 className="text-sm uppercase tracking-widest font-bold text-brand-slate-600 relative pl-3 border-l-2 border-emerald-500">
                    {editingEventId ? "Editar Registro" : "Nuevo Registro"}
                 </h3>
                 {editingEventId && (
                   <button onClick={cancelEdit} className="text-[10px] uppercase font-bold text-brand-slate-600 hover:text-white px-2 py-1 rounded border border-panel-border hover:bg-black/20 transition-all">
                     Cancelar
                   </button>
                 )}
               </div>
               
               <div className="grid grid-cols-2 gap-2 mb-6">
                 <button onClick={() => setActionType('riego')} className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${actionType === 'riego' ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-black/[0.03] dark:bg-black/20 border-panel-border text-brand-slate-600 hover:border-blue-500/50'}`}>
                    <Drop size={20} weight={actionType === 'riego' ? 'fill' : 'regular'} />
                    <span className="text-[10px] font-bold">RIEGO</span>
                 </button>
                 <button onClick={() => setActionType('ipm')} className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${actionType === 'ipm' ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-black/[0.03] dark:bg-black/20 border-panel-border text-brand-slate-600 hover:border-red-500/50'}`}>
                    <Bug size={20} weight={actionType === 'ipm' ? 'fill' : 'regular'} />
                    <span className="text-[10px] font-bold">IPM</span>
                 </button>
                 <button onClick={() => setActionType('poda')} className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${actionType === 'poda' ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-black/[0.03] dark:bg-black/20 border-panel-border text-brand-slate-600 hover:border-green-500/50'}`}>
                    <Scissors size={20} weight={actionType === 'poda' ? 'fill' : 'regular'} />
                    <span className="text-[10px] font-bold">PODA</span>
                 </button>
                 <button onClick={() => setActionType('alerta')} className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${actionType === 'alerta' ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' : 'bg-black/[0.03] dark:bg-black/20 border-panel-border text-brand-slate-600 hover:border-yellow-500/50'}`}>
                    <Warning size={20} weight={actionType === 'alerta' ? 'fill' : 'regular'} />
                    <span className="text-[10px] font-bold">ALERTA</span>
                 </button>
               </div>

               <form onSubmit={handleCreateEvent} className="flex flex-col gap-4 flex-1">
                  {(actionType === 'riego' || actionType === 'ipm') && (
                    <>
                    <div>
                       <label className="text-xs uppercase text-brand-slate-600 mb-1 block">Insumo / Bodega</label>
                       <select 
                          value={selectedProduct} 
                          onChange={(e)=>setSelectedProduct(e.target.value)} 
                          className="w-full bg-black/[0.03] dark:bg-black/20 border border-panel-border rounded-lg p-3 text-sm focus:border-blue-500 outline-none truncate"
                       >
                          <option value="">{actionType === 'riego' ? '— Sólo Agua (Sin Insumo) —' : '— Manual (Sin Producto) —'}</option>
                          {Array.from(
                             inventory.reduce((acc: Map<string, any>, item: any) => {
                               if (!acc.has(item.name)) acc.set(item.name, { ...item });
                               else acc.get(item.name).qty += item.qty;
                               return acc;
                             }, new Map()).values()
                          )
                          .filter((i: any) => i.qty > 0)
                          .sort((a: any, b: any) => a.name.localeCompare(b.name))
                          .map((item: any) => (
                              <option key={item.name} value={item.name}>
                                  {item.name} (Disp: {item.qty} {item.uom || 'unidades'})
                              </option>
                          ))}
                       </select>
                    </div>
                    {selectedProduct && (
                        <div>
                           <label className="text-xs uppercase text-brand-slate-600 mb-1 block">Cantidad Extraída</label>
                           <input type="number" step="0.1" required value={amount} onChange={(e)=>setAmount(e.target.value)} placeholder="Ej: 50" className="w-full bg-black/[0.03] dark:bg-black/20 border border-emerald-500/30 rounded-lg p-3 text-sm focus:border-emerald-500 outline-none shadow-[0_0_15px_rgba(16,185,129,0.1)_inset]" />
                           <div className="text-[10px] font-mono text-status-yellow mt-1">El stock se ajustará automáticamente de la BD.</div>
                        </div>
                    )}
                    </>
                  )}

                  {actionType === 'poda' && (
                    <div>
                       <label className="text-xs uppercase text-brand-slate-600 mb-1 block">Técnica a Aplicar</label>
                       <select 
                          value={podaType} 
                          onChange={(e)=>setPodaType(e.target.value)} 
                          className="w-full bg-black/[0.03] dark:bg-black/20 border border-panel-border rounded-lg p-3 text-sm focus:border-green-500 outline-none"
                       >
                          <option value="Defoliación Baja">Defoliación Baja (Lollipop)</option>
                          <option value="Topping / Poda Apical">Topping / Poda Apical</option>
                          <option value="LST (Low Stress Training)">LST (Low Stress Training)</option>
                          <option value="FIM">FIM</option>
                          <option value="Mantenimiento Limpieza">Revisión / Limpieza Físico</option>
                       </select>
                    </div>
                  )}

                  {actionType === 'alerta' && (
                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-xs font-mono text-yellow-400">
                       Registrá la aparición de plagas, hongos o deficiencias detectadas. Este evento será resaltado pero no consumirá inventario a menos que luego apliques un control IPM.
                    </div>
                  )}
                  
                  <div>
                    <label className="text-xs uppercase text-brand-slate-600 mb-1 block">Notas de la Bitácora {actionType === 'alerta' ? '*' : '(Opcional)'}</label>
                    <textarea required={actionType === 'alerta'} value={desc} onChange={e=>setDesc(e.target.value)} rows={3} placeholder="Comentarios adicionales..." className="w-full bg-black/[0.03] dark:bg-black/20 border border-panel-border rounded-lg p-3 text-sm focus:border-emerald-500 outline-none resize-none"></textarea>
                  </div>

                  <div className="flex-1"></div>

                  <button disabled={isSubmitting} type="submit" className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-bold transition-all disabled:opacity-50 mt-4 ${actionType === 'riego' ? 'bg-blue-600 hover:bg-blue-500 text-foreground shadow-[0_0_15px_rgba(37,99,235,0.2)]' : actionType === 'ipm' ? 'bg-red-600 hover:bg-red-500 text-foreground shadow-[0_0_15px_rgba(220,38,38,0.2)]' : actionType === 'alerta' ? 'bg-yellow-600 hover:bg-yellow-500 text-foreground shadow-[0_0_15px_rgba(234,179,8,0.2)]' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.2)]'}`}>
                     {isSubmitting ? 'Verificando BD...' : <><FloppyDisk size={20} /> {editingEventId ? "Guardar Cambios" : "Asentar Bitácora"}</>}
                  </button>
               </form>
            </div>

            {/* Panel de Historial (Col 2) */}
            <div className="p-6 md:w-1/2 flex flex-col">
               <h3 className="text-sm uppercase tracking-widest font-bold text-brand-slate-600 mb-6 flex justify-between items-center relative pl-3 border-l-2 border-brand-slate-600">
                  <span className="flex items-center gap-2"><ClockCounterClockwise size={16}/> Historial</span>
                  <span className="text-[10px] bg-black/[0.08] dark:bg-black/40 px-2 py-0.5 rounded text-emerald-500">{events.length} logs vitales</span>
               </h3>
               
               <div className="flex-1 flex flex-col gap-3 relative pr-1 overflow-y-auto">
                  {loadingEvents ? (
                      <div className="text-sm text-center py-10 font-mono text-brand-slate-600 animate-pulse">Consultando Registros...</div>
                  ) : events.length === 0 ? (
                      <div className="opacity-50 text-center py-10 font-mono text-sm text-brand-slate-600 border border-dashed border-panel-border rounded-xl">Sin historial agronómico.</div>
                  ) : (
                      events.map(ev => {
                          let evColor = 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5';
                          let EvIcon = Scissors;
                          if (ev.event_type === 'nutricion' || ev.event_type === 'riego') {
                              evColor = 'text-blue-400 border-blue-500/20 bg-blue-500/5'; EvIcon = Drop;
                          } else if (ev.event_type === 'ipm') {
                              evColor = 'text-red-400 border-red-500/20 bg-red-500/5'; EvIcon = Bug;
                          } else if (ev.event_type === 'alerta') {
                              evColor = 'text-yellow-400 border-yellow-500/40 bg-yellow-500/10 shadow-[0_0_15px_rgba(234,179,8,0.1)]'; EvIcon = Warning;
                          }

                          return (
                              <div key={ev.id} className={`p-4 rounded-xl border ${evColor} flex flex-col gap-2 shadow-sm relative group`}>
                                  <div className="flex justify-between items-start">
                                     <span className="flex items-center gap-1.5 font-bold text-xs uppercase"><EvIcon size={16} weight="bold"/> {ev.event_type}</span>
                                     <div className="flex items-center gap-1">
                                        <span className="text-[10px] font-mono opacity-80 bg-black/[0.08] dark:bg-black/40 px-2 py-1 rounded">{new Date(ev.date_occurred || ev.timestamp || ev.created_at).toLocaleDateString()}</span>
                                        <div className="flex gap-1 ml-1 opacity-70 hover:opacity-100 transition-opacity">
                                           <button onClick={() => handleEditClick(ev)} className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded transition-colors text-brand-slate-600 hover:text-blue-400" title="Editar">
                                              <PencilSimple size={16} weight="bold" />
                                           </button>
                                           <button onClick={() => handleDeleteEvent(ev)} className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded transition-colors text-brand-slate-600 hover:text-red-400" title="Eliminar">
                                              <Trash size={16} weight="bold" />
                                           </button>
                                        </div>
                                     </div>
                                  </div>
                                  <p className="text-sm text-foreground my-1 leading-relaxed">{ev.description}</p>
                                  {ev.total_cost > 0 && <span className="font-mono text-[10px] text-orange-400 uppercase place-self-end mt-1 font-bold">Invertido: ${ev.total_cost.toFixed(2)}</span>}
                              </div>
                          )
                      })
                  )}
               </div>
            </div>
        </div>
      </div>
    </div>
  );
}
