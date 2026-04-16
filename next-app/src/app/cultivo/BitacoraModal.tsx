"use client";

import React, { useState, useEffect } from "react";
import { X, Drop, Bug, Scissors, ClockCounterClockwise, FloppyDisk, Warning } from "@phosphor-icons/react";
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

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    let finalDesc = desc;
    let finalCost = 0;
    
    // Verificación de stock y armado de Payload
    if (actionType === 'riego' || actionType === 'ipm') {
       if (selectedProduct) {
          const item = inventory.find(i => i.id === selectedProduct);
          const reqAmount = parseFloat(amount) || 0;
          
          if (!item) {
             alert("Producto no encontrado."); setIsSubmitting(false); return;
          }
          if (reqAmount <= 0) {
             alert("Ingresa una cantidad mayor a 0 mL."); setIsSubmitting(false); return;
          }
          if (reqAmount > item.qty) {
             alert(`Stock Insuficiente. Requerís ${reqAmount} pero quedan ${item.qty} disponibles en Bodega.`); setIsSubmitting(false); return;
          }
          
          finalCost = parseFloat(item.unit_cost || 0) * reqAmount;
          finalDesc = `${actionType.toUpperCase()}: ${item.name} (${reqAmount} ml). ` + desc;

          const newQty = item.qty - reqAmount;
          await supabase.from('core_inventory_quimicos').update({ qty: newQty }).eq('id', item.id);
       } else {
          finalDesc = `${actionType === 'riego' ? 'Sólo Agua / Preventivo Manual' : 'Acción Manual (sin insumo)'}. ` + desc;
       }
    } else if (actionType === 'poda') {
       finalDesc = `PODA: ${podaType}. ` + desc;
    } else if (actionType === 'alerta') {
       finalDesc = `⚠️ EVENTO/PLAGA: ` + desc;
    }

    const payload = {
      batch_id: batch.id,
      room_id: batch.location || batch.room_id,
      event_type: actionType === 'riego' ? 'Riego' : actionType === 'ipm' ? 'IPM' : actionType,
      amount_applied: amount ? parseFloat(amount) : null,
      product_id: selectedProduct || null,
      total_cost: finalCost,
      description: finalDesc,
      date_occurred: new Date().toISOString()
    };

    const { error } = await supabase.from('core_agronomic_events').insert([payload]);
    
    if (!error) {
      setDesc(""); setAmount(""); setSelectedProduct("");
      await fetchEvents();
      if(actionType === 'riego' || actionType === 'ipm') await fetchInventory(); 
    } else {
      alert("Error insertando el registro. " + error.message);
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
            <div className="p-6 md:w-1/2 border-r border-panel-border/30 bg-black/10">
               <h3 className="text-sm uppercase tracking-widest font-bold text-brand-slate-600 mb-6 relative pl-3 border-l-2 border-emerald-500">Nuevo Registro</h3>
               
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

               <form onSubmit={handleCreateEvent} className="flex flex-col gap-4">
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
                          {inventory.map(item => (
                              <option key={item.id} value={item.id}>
                                  {item.name} (Disp: {item.qty} {item.unit})
                              </option>
                          ))}
                       </select>
                    </div>
                    {selectedProduct && (
                        <div>
                           <label className="text-xs uppercase text-brand-slate-600 mb-1 block">Cantidad Extraída ({inventory.find(i=>i.id===selectedProduct)?.unit})</label>
                           <input type="number" step="0.1" required value={amount} onChange={(e)=>setAmount(e.target.value)} placeholder="Ej: 50" className="w-full bg-black/[0.03] dark:bg-black/20 border border-emerald-500/30 rounded-lg p-3 text-sm focus:border-emerald-500 outline-none shadow-[0_0_15px_rgba(16,185,129,0.1)_inset]" />
                           <div className="text-[10px] font-mono text-status-yellow mt-1">El stock se deducirá automáticamente de la BD.</div>
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
                    <textarea required={actionType === 'alerta'} value={desc} onChange={e=>setDesc(e.target.value)} rows={2} placeholder="Comentarios adicionales..." className="w-full bg-black/[0.03] dark:bg-black/20 border border-panel-border rounded-lg p-3 text-sm focus:border-emerald-500 outline-none resize-none"></textarea>
                  </div>

                  <button disabled={isSubmitting} type="submit" className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-bold transition-all disabled:opacity-50 mt-2 ${actionType === 'riego' ? 'bg-blue-600 hover:bg-blue-500 text-foreground shadow-[0_0_15px_rgba(37,99,235,0.2)]' : actionType === 'ipm' ? 'bg-red-600 hover:bg-red-500 text-foreground shadow-[0_0_15px_rgba(220,38,38,0.2)]' : actionType === 'alerta' ? 'bg-yellow-600 hover:bg-yellow-500 text-foreground shadow-[0_0_15px_rgba(234,179,8,0.2)]' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.2)]'}`}>
                     {isSubmitting ? 'Verificando BD...' : <><FloppyDisk size={20} /> Asentar Bitácora</>}
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
                              <div key={ev.id} className={`p-4 rounded-xl border ${evColor} flex flex-col gap-2 shadow-sm`}>
                                  <div className="flex justify-between items-start">
                                     <span className="flex items-center gap-1.5 font-bold text-xs uppercase"><EvIcon size={16} weight="bold"/> {ev.event_type}</span>
                                     <span className="text-[10px] font-mono opacity-80 bg-black/[0.08] dark:bg-black/40 px-2 py-1 rounded">{new Date(ev.date_occurred || ev.timestamp || ev.created_at).toLocaleDateString()}</span>
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
