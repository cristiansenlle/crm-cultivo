"use client";

import React, { useState, useEffect } from "react";
import { X, Drop, Bug, Scissors, Warning, FloppyDisk, Info, Plant } from "@phosphor-icons/react";
import { supabase } from "../../lib/supabase";

export function BitacoraGlobalModal({ room, batches, onClose, onRefreshBatches }: { room: any, batches: any[], onClose: () => void, onRefreshBatches: () => void }) {
  const [inventory, setInventory] = useState<any[]>([]);
  const [actionType, setActionType] = useState<"riego" | "ipm" | "poda" | "manejo" | "alerta">("riego");
  
  // States Modal Forms
  const [selectedProduct, setSelectedProduct] = useState("");
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [podaType, setPodaType] = useState("Defoliación Baja");
  const [manejoType, setManejoType] = useState("Transplante a Maceta Mayor");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    const { data } = await supabase
      .from('core_inventory_quimicos')
      .select('*')
      .order('name');
    if (data) setInventory(data);
  };

  const handleCreateGlobalEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (batches.length === 0) {
       alert("No hay lotes activos en esta sala para distribuir la aplicación.");
       setIsSubmitting(false);
       return;
    }

    let finalDescGlobal = desc;
    let finalCostTotal = 0;
    const splitFactor = batches.length;
    
    // Verificación de stock y armado de Payload
    if (actionType === 'riego' || actionType === 'ipm') {
       if (selectedProduct) {
          const item = inventory.find(i => i.id === selectedProduct);
          const reqAmount = parseFloat(amount) || 0;
          
          if (!item) {
             alert("Producto no encontrado."); setIsSubmitting(false); return;
          }
          if (reqAmount <= 0) {
             alert("Ingresa una cantidad mayor a 0."); setIsSubmitting(false); return;
          }
          if (reqAmount > item.qty) {
             alert(`Stock Insuficiente. Requerís ${reqAmount} pero quedan ${item.qty} disponibles en Bodega.`); setIsSubmitting(false); return;
          }
          
          // Costo total de lo extraído de la bodega principal
          finalCostTotal = parseFloat(item.unit_cost || 0) * reqAmount;
          
          // Anotar en descripción global el extraído por lote
          const qtyPerBatch = (reqAmount / splitFactor).toFixed(2);
          finalDescGlobal = `${actionType.toUpperCase()}: ${item.name} (${qtyPerBatch} ml/g per cápita). ` + desc;

          // 1. Deducir stock global inmediatamente
          const newQty = item.qty - reqAmount;
          await supabase.from('core_inventory_quimicos').update({ qty: newQty }).eq('id', item.id);
       } else {
          finalDescGlobal = `${actionType === 'riego' ? 'Sólo Agua / Preventivo Manual' : 'Acción Manual (sin insumo)'}. ` + desc;
       }
    } else if (actionType === 'poda') {
       finalDescGlobal = `PODA: ${podaType}. ` + desc;
    } else if (actionType === 'manejo') {
       finalDescGlobal = `MANEJO: ${manejoType}. ` + desc;
    } else if (actionType === 'alerta') {
       finalDescGlobal = `⚠️ EVENTO/PLAGA: ` + desc;
    }

    // Dividimos el costo total del producto extraído entre la cantidad de Lotes Activos
    const costPerBatch = finalCostTotal / splitFactor;

    // 2. Crear las Inserciones Distribuidas
    const eventsToInsert = batches.map(batch => ({
      batch_id: batch.id,
      room_id: room.id,
      event_type: actionType === 'riego' ? 'Riego' : actionType === 'ipm' ? 'IPM' : actionType,
      amount_applied: (actionType === 'riego' || actionType === 'ipm') && selectedProduct && amount ? parseFloat((parseFloat(amount) / splitFactor).toFixed(2)) : null,
      product_id: (actionType === 'riego' || actionType === 'ipm') && selectedProduct ? selectedProduct : null,
      total_cost: costPerBatch,
      description: finalDescGlobal,
      date_occurred: new Date().toISOString()
    }));

    const { error } = await supabase.from('core_agronomic_events').insert(eventsToInsert);
    
    if (!error) {
       alert(`✅ Aplicación global exitosa. Insumos distribuidos en ${splitFactor} lotes. Costo p/capita: $${costPerBatch.toFixed(2)}`);
       onRefreshBatches();
       onClose();
    } else {
       alert("Error insertando registros masivos. " + error.message);
    }
    
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      <div className="bg-panel-base border border-emerald-500/50 w-full max-w-xl rounded-2xl shadow-2xl flex flex-col slide-in-from-bottom-5 duration-300 relative overflow-hidden">
        
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2"></div>

        {/* Header */}
        <div className="p-6 border-b border-panel-border bg-emerald-500/5 flex justify-between items-center relative">
           <div>
             <h2 className="text-xl font-bold flex items-center gap-2 text-emerald-500">
               Aplicación Global Distribuida
             </h2>
             <p className="text-sm font-mono text-brand-slate-600 mt-1">Sala: {room.name}</p>
           </div>
           <button onClick={onClose} className="text-brand-slate-600 hover:text-foreground transition-colors bg-black/[0.08] dark:bg-black/40 p-2 rounded-lg">
             <X size={24} />
           </button>
        </div>

        <div className="p-6 flex flex-col relative z-10">
           
           <div className="flex bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl mb-6 items-start gap-3">
               <Info size={24} className="text-blue-500 shrink-0 mt-0.5" />
               <div className="text-xs text-blue-100/80 leading-relaxed font-mono">
                  Esta operación impactará simultáneamente sus costos e historiales a los <strong className="text-blue-400 text-sm mx-1">{batches.length} lotes</strong> vinculados a este recinto. Indique el volumen total de litros/insumos que utilizó en la labor. El gestor lo dividirá automáticamente.
               </div>
           </div>

           <div className="flex flex-wrap gap-2 mb-6">
             <button onClick={() => setActionType('riego')} className={`flex-1 min-w-[70px] flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${actionType === 'riego' ? 'bg-blue-500/20 border-blue-500 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-black/[0.03] dark:bg-black/20 border-panel-border text-brand-slate-600 hover:border-blue-500/50'}`}>
                <Drop size={24} weight={actionType === 'riego' ? 'fill' : 'regular'} />
                <span className="text-[10px] font-bold uppercase tracking-wider">RIEGO</span>
             </button>
             <button onClick={() => setActionType('ipm')} className={`flex-1 min-w-[70px] flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${actionType === 'ipm' ? 'bg-red-500/20 border-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'bg-black/[0.03] dark:bg-black/20 border-panel-border text-brand-slate-600 hover:border-red-500/50'}`}>
                <Bug size={24} weight={actionType === 'ipm' ? 'fill' : 'regular'} />
                <span className="text-[10px] font-bold uppercase tracking-wider">IPM</span>
             </button>
             <button onClick={() => setActionType('poda')} className={`flex-1 min-w-[70px] flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${actionType === 'poda' ? 'bg-green-500/20 border-green-500 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'bg-black/[0.03] dark:bg-black/20 border-panel-border text-brand-slate-600 hover:border-green-500/50'}`}>
                <Scissors size={24} weight={actionType === 'poda' ? 'fill' : 'regular'} />
                <span className="text-[10px] font-bold uppercase tracking-wider">PODA</span>
             </button>
             <button onClick={() => setActionType('manejo')} className={`flex-1 min-w-[70px] flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${actionType === 'manejo' ? 'bg-purple-500/20 border-purple-500 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'bg-black/[0.03] dark:bg-black/20 border-panel-border text-brand-slate-600 hover:border-purple-500/50'}`}>
                <Plant size={24} weight={actionType === 'manejo' ? 'fill' : 'regular'} />
                <span className="text-[10px] font-bold uppercase tracking-wider">MANEJO</span>
             </button>
             <button onClick={() => setActionType('alerta')} className={`flex-1 min-w-[70px] flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${actionType === 'alerta' ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'bg-black/[0.03] dark:bg-black/20 border-panel-border text-brand-slate-600 hover:border-yellow-500/50'}`}>
                <Warning size={24} weight={actionType === 'alerta' ? 'fill' : 'regular'} />
                <span className="text-[10px] font-bold uppercase tracking-wider">ALERTA</span>
             </button>
           </div>

           <form onSubmit={handleCreateGlobalEvent} className="flex flex-col gap-5">
              {(actionType === 'riego' || actionType === 'ipm') && (
                <div className="bg-black/[0.02] dark:bg-black/20 border border-panel-border/50 p-4 rounded-xl flex flex-col gap-4">
                <div>
                   <label className="text-xs uppercase font-bold text-brand-slate-600 mb-2 block">Extracción de Insumo (Bodega Principal)</label>
                   <select 
                      value={selectedProduct} 
                      onChange={(e)=>setSelectedProduct(e.target.value)} 
                      className="w-full bg-panel-base border border-panel-border rounded-lg p-3 text-sm focus:border-emerald-500 outline-none truncate"
                   >
                      <option value="">{actionType === 'riego' ? '— Sólo Agua (Sin Costo) —' : '— Acción Física (Sin Producto) —'}</option>
                      {inventory.map(item => (
                          <option key={item.id} value={item.id}>
                              {item.name} | Disponible: {item.qty} {item.unit} (${item.unit_cost}/u)
                          </option>
                      ))}
                   </select>
                </div>
                {selectedProduct && (
                    <div>
                       <div className="flex justify-between items-end mb-2">
                           <label className="text-xs uppercase font-bold text-brand-slate-600 block">Cantidad Bruta Extraída</label>
                           <span className="text-[10px] font-mono text-emerald-500/60 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Se dividirá entre {batches.length} lotes</span>
                       </div>
                       
                       <div className="relative">
                           <input type="number" step="0.1" required value={amount} onChange={(e)=>setAmount(e.target.value)} placeholder="Ej: 15" className="w-full bg-panel-base border border-emerald-500/50 rounded-lg p-3 text-lg font-mono text-emerald-400 focus:border-emerald-500 outline-none shadow-[0_0_15px_rgba(16,185,129,0.1)_inset]" />
                           <span className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-brand-slate-600 text-sm pointer-events-none">
                               {inventory.find(i=>i.id===selectedProduct)?.unit || 'ml'}
                           </span>
                       </div>
                    </div>
                )}
                </div>
              )}

              {actionType === 'poda' && (
                <div>
                   <label className="text-xs uppercase font-bold text-brand-slate-600 mb-2 block">Técnica a Aplicar Grupalmente</label>
                   <select 
                      value={podaType} 
                      onChange={(e)=>setPodaType(e.target.value)} 
                      className="w-full bg-black/[0.03] dark:bg-black/20 border border-panel-border rounded-lg p-3 text-sm focus:border-green-500 outline-none"
                   >
                      <option value="Defoliación Baja">Defoliación Baja (Lollipop)</option>
                      <option value="Topping / Poda Apical">Topping / Poda Apical</option>
                      <option value="FIM">FIM</option>
                      <option value="Mantenimiento Limpieza">Revisión / Limpieza Físico</option>
                   </select>
                </div>
              )}

              {actionType === 'manejo' && (
                <div>
                   <label className="text-xs uppercase font-bold text-brand-slate-600 mb-2 block">Tarea / Manejo Estructural Grupal</label>
                   <select 
                      value={manejoType} 
                      onChange={(e)=>setManejoType(e.target.value)} 
                      className="w-full bg-black/[0.03] dark:bg-black/20 border border-panel-border rounded-lg p-3 text-sm focus:border-purple-500 outline-none"
                   >
                      <option value="Transplante a Maceta Mayor">Transplante a Maceta Mayor</option>
                      <option value="Instalación Red SCROG">Instalación Red SCROG</option>
                      <option value="Tutorado / Soporte Físico">Tutorado / Soporte Físico</option>
                      <option value="Lavado de Raíces (Flushing)">Lavado de Raíces (Flushing)</option>
                      <option value="Toma de Esquejes (Clonación)">Toma de Esquejes (Clonación)</option>
                      <option value="Sexado / Descarte de Plantas">Sexado / Descarte de Plantas</option>
                      <option value="LST (Low Stress Training)">LST (Low Stress Training)</option>
                      <option value="Cambio de Fotoperíodo">Cambio de Fotoperíodo (Vege a Flora)</option>
                      <option value="Ajuste de Iluminación">Ajuste/Mantenimiento de Iluminación</option>
                   </select>
                </div>
              )}
              
              <div>
                <label className="text-xs uppercase font-bold text-brand-slate-600 mb-2 block">Observaciones Históricas (Opcional)</label>
                <textarea value={desc} onChange={e=>setDesc(e.target.value)} rows={3} placeholder="Comentarios que se replicarán en el historial de todos los lotes..." className="w-full bg-black/[0.03] dark:bg-black/20 border border-panel-border rounded-lg p-3 text-sm focus:border-emerald-500 outline-none resize-none font-mono"></textarea>
              </div>

              <button disabled={isSubmitting || batches.length === 0} type="submit" className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold transition-all disabled:opacity-50 mt-2 uppercase tracking-widest text-sm ${actionType === 'riego' || actionType === 'ipm' ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]'}`}>
                 {isSubmitting ? 'Procesando Nodos...' : <><FloppyDisk size={20} /> Confirmar Aplicación Masiva</>}
              </button>
           </form>
        </div>
      </div>
    </div>
  );
}
