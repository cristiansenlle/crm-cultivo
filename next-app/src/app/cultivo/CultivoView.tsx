"use client";

import React, { useEffect, useState } from "react";
import { GlassCard } from "../../components/ui/GlassCard";
import { Info, MapPinLine, Tree, Plus, Plant, Coins, AppWindow, FloppyDisk } from "@phosphor-icons/react";
import { supabase } from "../../lib/supabase";
import { BitacoraModal } from "./BitacoraModal";

export function CultivoView() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [batchCosts, setBatchCosts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  
  const [activeBitacora, setActiveBitacora] = useState<any | null>(null);

  // Machine State Modals
  const [fotoModal, setFotoModal] = useState<{isOpen: boolean, batch: any, nextStage: string}>({isOpen: false, batch: null, nextStage: ""});
  const [fotoLuz, setFotoLuz] = useState("18");
  const [fotoOsc, setFotoOsc] = useState("6");

  const [harvestModal, setHarvestModal] = useState<{isOpen: boolean, batch: any, nextStage: string}>({isOpen: false, batch: null, nextStage: ""});
  const [harvestGrams, setHarvestGrams] = useState("");

  const fetchRooms = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('core_rooms').select('id, name, phase');
    if (data && !error) {
      setRooms(data);
      if (data.length > 0 && !selectedRoom) setSelectedRoom(data[0]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchBatches = async () => {
    if(!selectedRoom) return;
    const { data, error } = await supabase.from('core_batches').select('*').eq('location', selectedRoom.id);
    if (data && !error) {
      setBatches(data);
      const batchIds = data.map(b => b.id);
      if (batchIds.length > 0) {
          const { data: eventsData } = await supabase.from('core_agronomic_events').select('batch_id, total_cost').in('batch_id', batchIds);
          if (eventsData) {
              const costsMap: Record<string, number> = {};
              eventsData.forEach(ev => {
                  if (ev.total_cost) {
                      costsMap[ev.batch_id] = (costsMap[ev.batch_id] || 0) + ev.total_cost;
                  }
              });
              setBatchCosts(costsMap);
          }
      }
    } else {
      setBatches([]);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, [selectedRoom]);

  const advanceStageIndicator = (batch: any) => {
      const stages = ['vegetativo', 'floración', 'cosecha húmeda', 'cosecha seca'];
      const current = (batch.stage || 'vegetativo').toLowerCase();
      const curIdx = Math.max(0, stages.indexOf(current));
      
      // Si la etapa actual ya es cosecha seca, avisar que el ciclo termino
      if(curIdx === 3) {
          alert('Este lote ya se encuentra en Cosecha Seca (Finalizado).');
          return;
      }
      
      const nextStage = stages[curIdx + 1];
      
      // Interceptar Transiciones Criticas
      if (nextStage === 'floración' || nextStage === 'vegetativo') {
          // Requiere Fotoperiodo
          setFotoLuz(nextStage === 'floración' ? "12" : "18");
          setFotoOsc(nextStage === 'floración' ? "12" : "6");
          setFotoModal({ isOpen: true, batch, nextStage });
          return;
      }

      if (nextStage === 'cosecha húmeda') {
          if(confirm(`¿Registrar Corte y avanzar estado a COSECHA HÚMEDA?`)) {
              commitStage(batch.id, nextStage, {});
          }
          return;
      }

      if (nextStage === 'cosecha seca') {
          setHarvestGrams("");
          setHarvestModal({ isOpen: true, batch, nextStage });
          return;
      }

      // Default (Cualquier otra trancisión imprevista)
      if(confirm(`¿Avanzar lote a ${nextStage.toUpperCase()}?`)) {
          commitStage(batch.id, nextStage, {});
      }
  };

  const commitStage = async (batchId: string, nextStage: string, updates: any = {}) => {
      updates.stage = nextStage;
      const { error } = await supabase.from('core_batches').update(updates).eq('id', batchId);
      if(!error) {
          fetchBatches(); // Refrescar lista local
      } else {
          alert("Error crítico actualizando etapa: " + error.message);
      }
  };

  const handleFotoSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setFotoModal(prev => ({...prev, isOpen: false}));
      await commitStage(fotoModal.batch.id, fotoModal.nextStage, {
          light_hours: parseFloat(fotoLuz),
          dark_hours: parseFloat(fotoOsc)
      });
  };

  const handleHarvestSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const grams = parseFloat(harvestGrams);
      if (isNaN(grams) || grams <= 0) return alert("Ingrese un gramaje válido");
      
      setHarvestModal(prev => ({...prev, isOpen: false}));

      // 1. Update Core Batches
      const updates = { 
          stage: harvestModal.nextStage, 
          weight_dry: grams 
      };
      const { error } = await supabase.from('core_batches').update(updates).eq('id', harvestModal.batch.id);
      
      if (!error) {
          // 2. Inyectar a POS Inventario (Cross-module logic)
          const lotName = `${harvestModal.batch.strain || harvestModal.batch.id.substring(0,8)} (Lote ${harvestModal.batch.id.substring(0,4)})`;
          const invPayload = {
              id: harvestModal.batch.id, // match UUID
              name: lotName,
              type: harvestModal.batch.origen === 'externo' ? 'b2b' : 'cosecha_local',
              qty: grams,
              price: batchCosts[harvestModal.batch.id] || 0, // Inyectamos el Opex
              created_at: new Date().toISOString()
          };
          
          await supabase.from('core_inventory_cosechas').upsert([invPayload]);
          alert("Cosecha Seca registrada exitosamente. Suministro habilitado en Inventario B2B.");
          fetchBatches();
      } else {
          alert("Error de Registro de Cosecha: " + error.message);
      }
  };

  const removeRoom = async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if(!confirm("¿Borrar sala permanentemente?")) return;
      await supabase.from('core_rooms').delete().eq('id', id);
      setRooms(rooms.filter(r => r.id !== id));
      if(selectedRoom?.id === id) setSelectedRoom(null);
  };

  return (
    <>
      <section className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <MapPinLine size={24} className="text-brand-slate-600 dark:text-slate-400" />
            Infraestructura y Cuartos ({rooms.length})
          </h2>
          <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors font-bold text-sm">
            <Plus size={16} weight="bold" /> Añadir Sala
          </button>
        </div>

        {loading ? (
            <div className="text-brand-slate-600 font-mono">Cargando Salas...</div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rooms.map((room) => (
                <GlassCard 
                  key={room.id} 
                  glowColor={selectedRoom?.id === room.id ? "emerald" : "none"} 
                  className={`cursor-pointer hover:-translate-y-1 transition-transform duration-300 relative \${selectedRoom?.id === room.id ? 'border-emerald-500' : ''}`}
                  onClick={() => setSelectedRoom(room)}
                >
                  <button onClick={(e)=>removeRoom(room.id, e)} className="absolute top-2 right-2 text-xs text-brand-slate-600 hover:text-red-500 bg-black/[0.03] dark:bg-black/20 px-2 py-1 rounded">X</button>
                  <div className="flex justify-between items-start mt-2">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <Tree size={20} className={room.phase === 'Floración' ? 'text-purple-400' : 'text-emerald-500'} />
                      {room.name}
                    </h3>
                  </div>
                  <div className="flex flex-col gap-1 mt-3">
                    <span className={`self-start px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-status-green/10 text-status-green`}>
                      {room.phase || 'Vegetativo'}
                    </span>
                  </div>
                </GlassCard>
              ))}
            </div>
        )}
      </section>

      {selectedRoom && (
        <section>
          <GlassCard className="w-full border-t border-t-emerald-500 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
             
             <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6 border-b border-panel-border pb-4">
               <div>
                  <h2 className="text-2xl font-extrabold flex items-center gap-2">{selectedRoom.name}</h2>
                  <p className="text-brand-slate-600 dark:text-slate-400 text-sm font-mono flex items-center gap-1 mt-1">
                    <Info size={16} /> {batches.length} Lotes activos vinculados.
                  </p>
               </div>
             </div>

             <div className="overflow-x-auto">
               <table className="w-full text-left text-sm whitespace-nowrap">
                 <thead>
                   <tr className="border-b border-panel-border/50 text-brand-slate-600 font-mono text-xs uppercase tracking-wider">
                     <th className="py-3 px-4 font-normal">Identidad / Genética</th>
                     <th className="py-3 px-4 font-normal">Población</th>
                     <th className="py-3 px-4 font-normal text-center">Fase de Ciclo</th>
                     <th className="py-3 px-4 text-center">Fotoperiodo</th>
                     <th className="py-3 px-4 font-normal text-right">Inversión Recurrente</th>
                     <th className="py-3 px-4 text-right">Operaciones Máquina</th>
                   </tr>
                 </thead>
                 <tbody className="font-sans">
                   {batches.length === 0 && (
                       <tr><td colSpan={6} className="py-8 px-4 text-center text-brand-slate-600 italic">Sala sin lotes asignados.</td></tr>
                   )}
                   {batches.map(b => {
                     const isSecado = b.stage === 'cosecha seca';
                     const days = Math.max(0, Math.floor((Date.now() - new Date(b.start_date || b.created_at).getTime()) / (1000 * 60 * 60 * 24)));
                     const cost = batchCosts[b.id] || 0;
                     const stageStr = (b.stage || 'vegetativo').toLowerCase();
                     const stageColor = stageStr.includes('floración') ? 'text-purple-400' : stageStr.includes('cosecha') ? 'text-orange-400' : 'text-foreground';
                     
                     return (
                     <tr key={b.id} className={`border-b border-panel-border/20 transition-colors group \${isSecado ? 'opacity-40 hover:opacity-100' : 'hover:bg-black/5 dark:hover:bg-black/5 dark:hover:bg-white/5'}`}>
                       <td className={`py-4 px-4 border-l-2 \${isSecado ? 'border-orange-500' : 'border-emerald-500'}`}>
                         <div className={`font-bold text-base mb-1 \${isSecado ? 'line-through text-brand-slate-600' : 'text-foreground'}`}>{b.strain || b.id.substring(0,8)}</div>
                         <div className="text-xs font-mono text-brand-slate-600 flex items-center gap-1"><Info size={12}/> {b.id.substring(0,6)} <span className="uppercase text-emerald-500/80 ml-1">{b.origen || 'Clon'}</span></div>
                       </td>
                       <td className="py-4 px-4">
                           <span className="flex items-center gap-1 font-bold text-foreground bg-panel-border/30 px-2.5 py-1 rounded-lg w-max">
                              <Plant size={16} className={isSecado ? "text-orange-500" : "text-emerald-500"} /> {b.num_plants || '1'} indivs
                           </span>
                       </td>
                       <td className="py-4 px-4 text-center">
                           <div className={`text-sm font-bold capitalize \${stageColor}`}>{b.stage || 'Vegetativo'}</div>
                           <div className="text-xs font-mono text-brand-slate-600">Día {days} Activo</div>
                       </td>
                       <td className="py-4 px-4 text-center">
                           <div className="text-[11px] font-mono bg-black/[0.03] dark:bg-black/20 px-2 py-1 rounded text-foreground flex gap-1 justify-center">
                             <span className="text-yellow-400">{b.light_hours || '-'}L</span> / <span className="text-blue-400">{b.dark_hours || '-'}O</span>
                           </div>
                       </td>
                       <td className="py-4 px-4 text-right">
                           <div className={`inline-flex items-center gap-1 font-mono font-bold text-base \${cost > 0 ? 'text-status-yellow' : 'text-brand-slate-600'}`}>
                              <Coins size={16} /> {cost > 0 ? `$${cost.toFixed(2)}` : 'N/A'}
                           </div>
                       </td>
                       <td className="py-4 px-4 text-right align-middle">
                          <button onClick={() => advanceStageIndicator(b)} className={`px-2 py-2 mr-2 border text-xs font-bold uppercase tracking-wider transition-all rounded-lg \${isSecado ? 'border-brand-slate-600 text-brand-slate-600 cursor-not-allowed' : 'border-panel-border text-brand-slate-600 hover:border-purple-500 hover:text-purple-500'}`} disabled={isSecado}>
                             &#10148; Ciclar Etapa
                          </button>
                          <button onClick={() => setActiveBitacora(b)} className="px-3 py-2 border border-panel-border text-brand-slate-600 hover:border-emerald-500 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg text-sm font-bold uppercase tracking-wider transition-all">
                             Bitácora
                          </button>
                       </td>
                     </tr>
                     )
                   })}
                 </tbody>
               </table>
             </div>
          </GlassCard>
        </section>
      )}

      {activeBitacora && (
        <BitacoraModal batch={activeBitacora} onClose={() => setActiveBitacora(null)} />
      )}

      {/* Modal Fotoperiodo */}
      {fotoModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <GlassCard className="max-w-md w-full p-6 shadow-2xl relative">
                <button onClick={() => setFotoModal(prev => ({...prev, isOpen: false}))} className="absolute top-4 right-4 text-brand-slate-600 hover:text-foreground transition-colors"><AppWindow size={24}/></button>
                <h2 className="text-lg font-bold mb-2 flex items-center gap-2"><AppWindow className="text-yellow-500"/> Definir Fotoperiodo</h2>
                <p className="text-brand-slate-600 dark:text-slate-400 text-sm mb-6">Vas a migrar a fase <b>{fotoModal.nextStage.toUpperCase()}</b>. Configura biológicamente el ciclo de iluminación para bitácora.</p>
                <form onSubmit={handleFotoSubmit} className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-mono text-yellow-500 uppercase mb-1 block">Horas de Luz ☀️</label>
                            <input type="number" step="0.5" required value={fotoLuz} onChange={e=>setFotoLuz(e.target.value)} className="w-full bg-black/[0.03] dark:bg-black/20 border border-panel-border rounded p-3 font-mono text-lg focus:border-yellow-500 outline-none text-foreground"/>
                        </div>
                        <div>
                            <label className="text-xs font-mono text-blue-500 uppercase mb-1 block">Horas Oscuridad 🌙</label>
                            <input type="number" step="0.5" required value={fotoOsc} onChange={e=>setFotoOsc(e.target.value)} className="w-full bg-black/[0.03] dark:bg-black/20 border border-panel-border rounded p-3 font-mono text-lg focus:border-blue-500 outline-none text-foreground"/>
                        </div>
                    </div>
                    <button type="submit" className="mt-4 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg shadow-lg flex items-center justify-center gap-2"><FloppyDisk size={20}/> Procesar Cambio de Estado</button>
                </form>
            </GlassCard>
        </div>
      )}

      {/* Modal Cosecha Balance */}
      {harvestModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <GlassCard className="max-w-md w-full p-6 shadow-2xl relative border-t-4 border-t-orange-500">
                <button onClick={() => setHarvestModal(prev => ({...prev, isOpen: false}))} className="absolute top-4 right-4 text-brand-slate-600 hover:text-foreground transition-colors"><AppWindow size={24}/></button>
                <h2 className="text-xl font-bold mb-2 flex items-center gap-2 text-orange-500">Cierre de Ciclo productivo</h2>
                <p className="text-brand-slate-600 dark:text-slate-400 text-sm mb-4">La red biométrica enviará el volumen Cosechado-Seco al POS como Producto Terminado. Ingrese el resultado.</p>
                
                <div className="bg-orange-500/10 border border-orange-500/20 p-3 rounded-lg mb-6">
                   <span className="text-xs font-mono text-orange-400 block mb-1">Costo Acumulado OpEx para traspaso:</span>
                   <span className="text-lg font-bold text-foreground">${batchCosts[harvestModal.batch.id] || 0} ARG</span>
                </div>

                <form onSubmit={handleHarvestSubmit} className="flex flex-col gap-4">
                    <div>
                        <label className="text-xs font-mono text-brand-slate-600 uppercase mb-1 block">Peso Final Neto (Dry - gramos)</label>
                        <input type="number" step="0.01" required placeholder="Ej: 450.5" value={harvestGrams} onChange={e=>setHarvestGrams(e.target.value)} className="w-full bg-black/[0.03] dark:bg-black/20 border border-panel-border rounded p-4 text-2xl font-black text-right focus:border-orange-500 outline-none text-foreground"/>
                    </div>
                    <button type="submit" className="mt-2 w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-lg shadow-lg">INYECTAR A INVENTARIO POS</button>
                </form>
            </GlassCard>
        </div>
      )}
    </>
  );
}
