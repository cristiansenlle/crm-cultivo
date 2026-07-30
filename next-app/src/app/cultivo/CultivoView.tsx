"use client";

import React, { useEffect, useState } from "react";
import { GlassCard } from "../../components/ui/GlassCard";
import { Info, MapPinLine, Tree, Plus, Plant, Coins, AppWindow, FloppyDisk, PencilSimple, Trash, Stack } from "@phosphor-icons/react";
import { supabase } from "../../lib/supabase";
import { BitacoraModal } from "./BitacoraModal";
import { BitacoraGlobalModal } from "./BitacoraGlobalModal";
import { PhotoperiodChartModal } from "../../components/PhotoperiodChartModal";
import { BatchReportModal } from "./BatchReportModal";
import { AiHealthChartModal } from "../../components/AiHealthChartModal";
import { Camera, ShieldCheck, X } from "@phosphor-icons/react";
import { Activity } from "lucide-react";

export function CultivoView() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [batchCosts, setBatchCosts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  
  const [activeBitacora, setActiveBitacora] = useState<any | null>(null);
  const [activeGlobalBitacora, setActiveGlobalBitacora] = useState<boolean>(false);

  // Machine State Modals
  const [fotoModal, setFotoModal] = useState<{isOpen: boolean, batch: any, nextStage: string}>({isOpen: false, batch: null, nextStage: ""});
  const [fotoLuz, setFotoLuz] = useState("18");
  const [fotoOsc, setFotoOsc] = useState("6");

  const [harvestModal, setHarvestModal] = useState<{isOpen: boolean, batch: any, nextStage: string}>({isOpen: false, batch: null, nextStage: ""});
  const [harvestGrams, setHarvestGrams] = useState("");
  const [partialHarvests, setPartialHarvests] = useState<any[]>([]);
  const [harvestTandaName, setHarvestTandaName] = useState("");
  const [harvestPlantsCount, setHarvestPlantsCount] = useState("1");

  const [chartModal, setChartModal] = useState<{isOpen: boolean, batch: any}>({isOpen: false, batch: null});
  const [healthChartModal, setHealthChartModal] = useState<{isOpen: boolean, batch: any}>({isOpen: false, batch: null});

  // New Batch State
  const [addBatchModalOpen, setAddBatchModalOpen] = useState(false);
  const [newBatch, setNewBatch] = useState({ name: "", strain: "", num_plants: 1, origen: "Semilla" });
  const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);

  // Edit Batch State
  const [editBatchModalOpen, setEditBatchModalOpen] = useState(false);
  const [editBatch, setEditBatch] = useState<{id: string, strain: string, num_plants: number, origen: string, location: string, stage: string}>({ id: "", strain: "", num_plants: 1, origen: "Semilla", location: "", stage: "vegetativo" });
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Finalize Batch & Report State
  const [activeReportBatch, setActiveReportBatch] = useState<any | null>(null);
  const [finalizeModal, setFinalizeModal] = useState<{isOpen: boolean, batch: any}>({isOpen: false, batch: null});
  const [finalizeNotes, setFinalizeNotes] = useState("");
  const [finalizePhotos, setFinalizePhotos] = useState<FileList | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);

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

  const handleCreateBatch = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedRoom || !newBatch.name || !newBatch.strain || newBatch.num_plants < 1) return;
      setIsSubmittingBatch(true);
      
      const payload = {
          id: newBatch.name,
          strain: newBatch.strain,
          num_plants: newBatch.num_plants,
          origen: newBatch.origen,
          location: selectedRoom.id,
          stage: 'vegetativo',
          start_date: new Date().toISOString().split('T')[0]
      };

      const { error } = await supabase.from('core_batches').insert([payload]);
      if (!error) {
          setAddBatchModalOpen(false);
          setNewBatch({ name: "", strain: "", num_plants: 1, origen: "Semilla" });
          fetchBatches();
      } else {
          alert("Error creando lote: " + error.message);
      }
      setIsSubmittingBatch(false);
  };

  const handleUpdateBatch = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editBatch.id) return;
      setIsSubmittingEdit(true);
      
      const payload = {
          strain: editBatch.strain,
          num_plants: editBatch.num_plants,
          origen: editBatch.origen
      };

      const { error } = await supabase.from('core_batches').update(payload).eq('id', editBatch.id);
      if (!error) {
          setEditBatchModalOpen(false);
          fetchBatches();
      } else {
          alert("Error editando lote: " + error.message);
      }
      setIsSubmittingEdit(false);
  };

  const handleDeleteBatch = async (batchId: string) => {
      if(!confirm("¿Está absolutamente seguro de eliminar este lote de cultivo? Esta acción podría fallar si el lote ya tiene histórico/operaciones adjuntas.")) return;
      
      // 1. Obtener IDs de las tandas de cosecha parcial de este lote
      const { data: pHarvests } = await supabase.from('core_partial_harvests').select('id').eq('batch_id', batchId);
      const harvestIds = (pHarvests || []).map((ph: any) => ph.id);

      // 2. Eliminar stock de inventario de las tandas (y el registro heredado si existiera)
      if (harvestIds.length > 0) {
          await supabase.from('core_inventory_cosechas').delete().in('id', harvestIds);
      }
      await supabase.from('core_inventory_cosechas').delete().eq('id', batchId); // legacy delete

      // 3. Eliminar el lote (las cosechas parciales se eliminarán en cascada en la BD)
      const { error } = await supabase.from('core_batches').delete().eq('id', batchId);
      if(error) {
          alert("No se pudo eliminar el lote debido a restricciones de integridad (el lote ya cuenta con un historial económico o agrónomo):\n" + error.message);
      } else {
          fetchBatches();
      }
  };

  const fetchBatches = async () => {
    if(!selectedRoom) return;
    const { data, error } = await supabase.from('core_batches').select('*').eq('location', selectedRoom.id);
    if (data && !error) {
      setBatches(data);
      const batchIds = data.map((b: any) => b.id);
      if (batchIds.length > 0) {
          // Fetch costs
          const { data: eventsData } = await supabase.from('core_agronomic_events').select('batch_id, total_cost').in('batch_id', batchIds);
          if (eventsData) {
              const costsMap: Record<string, number> = {};
              eventsData.forEach((ev: any) => {
                  if (ev.total_cost) {
                      costsMap[ev.batch_id] = (costsMap[ev.batch_id] || 0) + ev.total_cost;
                  }
              });
              setBatchCosts(costsMap);
          }
          // Fetch partial harvests
          const { data: harvestsData } = await supabase.from('core_partial_harvests').select('*').in('batch_id', batchIds);
          if (harvestsData) {
              setPartialHarvests(harvestsData);
          } else {
              setPartialHarvests([]);
          }
      } else {
          setPartialHarvests([]);
      }
    } else {
      setBatches([]);
      setPartialHarvests([]);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, [selectedRoom]);

  const advanceStageIndicator = (batch: any) => {
      const stages = ['vegetativo', 'floración', 'cosecha', 'finalizado'];
      const current = (batch.stage || 'vegetativo').toLowerCase();
      const curIdx = Math.max(0, stages.indexOf(current));
      
      // Si la etapa actual ya es finalizado, avisar que el ciclo termino
      if(curIdx === 3) {
          alert('Este lote ya se encuentra en estado Finalizado (Ciclo cerrado).');
          return;
      }
      
      const nextStage = stages[curIdx + 1];
      
      // Interceptar Transiciones Criticas
      if (nextStage === 'floración' || nextStage === 'vegetativo') {
          // Requiere Fotoperiodo Inicial, el modal llama luego a commitStage
          setFotoLuz(nextStage === 'floración' ? "12" : "18");
          setFotoOsc(nextStage === 'floración' ? "12" : "12"); // User requested no limit to 24h
          setFotoModal({ isOpen: true, batch, nextStage });
          return;
      }

      if (nextStage === 'cosecha') {
          if(confirm(`¿Avanzar lote a fase de COSECHA (Activa por tandas)?`)) {
              commitStage(batch.id, nextStage, {});
          }
          return;
      }

      if (nextStage === 'finalizado') {
          setFinalizeNotes("");
          setFinalizePhotos(null);
          setFinalizeModal({ isOpen: true, batch });
          return;
      }

      // Default (Cualquier otra trancisión imprevista)
      if(confirm(`¿Avanzar lote a ${nextStage.toUpperCase()}?`)) {
          commitStage(batch.id, nextStage, {});
      }
  };

  const commitStage = async (batchId: string, nextStage: string, updates: any = {}) => {
      const batch = batches.find(b => b.id === batchId);
      if (batch) {
          const lastDate = batch.last_stage_date ? new Date(batch.last_stage_date) : new Date(batch.start_date || batch.created_at || Date.now());
          const daysInStage = Math.max(0, Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24)));
          
          const currentHistory = batch.stage_history || [];
          const newHistory = [...currentHistory, { stage: batch.stage || 'vegetativo', days: daysInStage }];
          
          updates.stage = nextStage;
          updates.last_stage_date = new Date().toISOString();
          updates.stage_history = newHistory;

          // Si se finaliza el lote, calcular el total cosechado acumulado
          if (nextStage === 'finalizado') {
              const { data: allHarvests } = await supabase.from('core_partial_harvests').select('weight_dry').eq('batch_id', batchId);
              const totalDryWeight = (allHarvests || []).reduce((sum: number, h: any) => sum + Number(h.weight_dry || 0), 0);
              updates.weight_dry = totalDryWeight;
              updates.num_plants = 0; // Al finalizar no quedan plantas activas vivas
          }
      } else {
          updates.stage = nextStage;
      }
      
      const { error } = await supabase.from('core_batches').update(updates).eq('id', batchId);
      if(!error) {
          // CHECK AUTO-TRANSICIÓN DE ROOM
          if (selectedRoom && nextStage === 'floración') {
              const {data: siblings} = await supabase.from('core_batches').select('stage').eq('location', selectedRoom.id);
              if (siblings && siblings.length > 0) {
                  const allFloro = siblings.every((s: any) => (s.stage || '').toLowerCase() === 'floración' || (s.stage || '').toLowerCase().includes('cosecha'));
                  if (allFloro && selectedRoom.phase !== 'Floración') {
                       await supabase.from('core_rooms').update({phase: 'Floración'}).eq('id', selectedRoom.id);
                       setSelectedRoom({...selectedRoom, phase: 'Floración'});
                       fetchRooms();
                  }
              }
          }
          fetchBatches(); 
      } else {
          alert("Error crítico actualizando etapa: " + error.message);
      }
  };

  const fileToBase64 = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = error => reject(error);
      });
  };

  const uploadPhotos = async (batchId: string, files: FileList): Promise<string[]> => {
      const urls: string[] = [];
      for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const fileExt = file.name.split('.').pop();
          const fileName = `${batchId}/${Date.now()}-${i}.${fileExt}`;
          
          try {
              const { data, error } = await supabase.storage
                  .from('batch-harvests')
                  .upload(fileName, file, {
                      cacheControl: '3600',
                      upsert: true
                  });
                  
              if (!error && data) {
                  const { data: { publicUrl } } = supabase.storage
                      .from('batch-harvests')
                      .getPublicUrl(fileName);
                  if (publicUrl) {
                      urls.push(publicUrl);
                      continue;
                  }
              }
          } catch (e) {
              console.warn("Supabase Storage error, using Base64 fallback:", e);
          }
          
          const base64 = await fileToBase64(file);
          urls.push(base64);
      }
      return urls;
  };

  const handleFinalizeSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!finalizeModal.batch) return;
      setIsFinalizing(true);
      
      try {
          let photoUrls: string[] = [];
          if (finalizePhotos && finalizePhotos.length > 0) {
              photoUrls = await uploadPhotos(finalizeModal.batch.id, finalizePhotos);
          }
          
          const updates: any = {
              harvest_notes: finalizeNotes,
              harvest_photos: photoUrls
          };
          
          const batchId = finalizeModal.batch.id;
          
          setFinalizeModal({ isOpen: false, batch: null });
          setFinalizeNotes("");
          setFinalizePhotos(null);
          
          await commitStage(batchId, 'finalizado', updates);
          alert("Lote finalizado y archivado. Reporte de cultivo disponible.");
          fetchBatches();
      } catch (err: any) {
          alert("Error al finalizar lote: " + err.message);
      } finally {
          setIsFinalizing(false);
      }
  };

  const savePhotoperiodLog = async (batch: any, lH: number, dH: number) => {
      // Close previous logs
      await supabase.from('core_photoperiod_history').update({ end_date: new Date().toISOString() }).eq('batch_id', batch.id).is('end_date', null);
      // Insert new log
      await supabase.from('core_photoperiod_history').insert([{
         batch_id: batch.id,
         light_hours: lH,
         dark_hours: dH,
         start_date: new Date().toISOString()
      }]);
  };

  const handleFotoSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setFotoModal(prev => ({...prev, isOpen: false}));
      
      const lH = parseFloat(fotoLuz);
      const dH = parseFloat(fotoOsc);

      // Si es un update fotoperíodo local sin cambio de state (nextStage empty o igual)
      if (!fotoModal.nextStage || fotoModal.nextStage === fotoModal.batch.stage) {
          await supabase.from('core_batches').update({ light_hours: lH, dark_hours: dH }).eq('id', fotoModal.batch.id);
          await savePhotoperiodLog(fotoModal.batch, lH, dH);
          fetchBatches();
      } else {
          // Si conlleva un cambio de State (ej de Veg a Flora)
          await savePhotoperiodLog(fotoModal.batch, lH, dH);
          await commitStage(fotoModal.batch.id, fotoModal.nextStage, {
              light_hours: lH,
              dark_hours: dH
          });
      }
  };

  const openPartialHarvestModal = (batch: any) => {
      const existing = partialHarvests.filter(ph => ph.batch_id === batch.id);
      setHarvestTandaName(`Tanda ${existing.length + 1}`);
      setHarvestPlantsCount("1");
      setHarvestGrams("");
      setHarvestModal({ isOpen: true, batch, nextStage: "" });
  };

  const handleHarvestSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const grams = parseFloat(harvestGrams);
      if (isNaN(grams) || grams <= 0) return alert("Ingrese un gramaje válido");
      
      const plantsCount = parseFloat(harvestPlantsCount);
      if (isNaN(plantsCount) || plantsCount < 0) return alert("Ingrese un número de plantas válido");

      setHarvestModal(prev => ({...prev, isOpen: false}));

      // 1. Registrar la Tanda en la tabla de Cosechas Parciales
      const totalOpex = batchCosts[harvestModal.batch.id] || 0;
      const totalPlants = harvestModal.batch.num_plants || 1;
      const proportionalOpex = Math.min(totalOpex, (plantsCount / totalPlants) * totalOpex);

      const partialPayload = {
          batch_id: harvestModal.batch.id,
          tanda_name: harvestTandaName || 'Tanda General',
          plants_harvested: plantsCount,
          weight_dry: grams,
          opex_allocated: proportionalOpex,
          harvest_date: new Date().toISOString().split('T')[0]
      };

      const { data: partialData, error: partialError } = await supabase
          .from('core_partial_harvests')
          .insert([partialPayload])
          .select();

      if (partialError || !partialData || partialData.length === 0) {
          return alert("Error al registrar la cosecha parcial en la BD: " + (partialError?.message || "Sin datos devueltos"));
      }

      const generatedId = partialData[0].id;

      // 2. Inyectar a POS Inventario (Cross-module logic)
      const lotName = `${harvestModal.batch.strain || harvestModal.batch.id.substring(0,8)} - ${harvestTandaName || 'Tanda'} (Lote ${harvestModal.batch.id.substring(0,4)})`;
      const invPayload = {
          id: generatedId, // UUID único de la tanda
          name: lotName,
          type: (harvestModal.batch.origen || '').toLowerCase() === 'externo' ? 'b2b' : 'cosecha_local',
          qty: grams,
          price: proportionalOpex / grams, // Costo unitario por gramo real (OpEx unitario)
          date_added: new Date().toISOString()
      };
      
      const { error: invError } = await supabase.from('core_inventory_cosechas').insert([invPayload]);
      if (invError) {
          return alert("Error de Inyección a Inventario POS: " + invError.message);
      }

      // 3. Decrementar población del lote y cerrar si llega a 0
      const newPlantsCount = Math.max(0, totalPlants - plantsCount);
      const batchUpdates: any = { num_plants: newPlantsCount };

      if (newPlantsCount === 0) {
          batchUpdates.stage = 'finalizado';
          batchUpdates.last_stage_date = new Date().toISOString();
          
          const lastDate = harvestModal.batch.last_stage_date ? new Date(harvestModal.batch.last_stage_date) : new Date(harvestModal.batch.start_date || harvestModal.batch.created_at || Date.now());
          const daysInStage = Math.max(0, Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24)));
          
          const currentHistory = harvestModal.batch.stage_history || [];
          batchUpdates.stage_history = [...currentHistory, { stage: harvestModal.batch.stage || 'cosecha', days: daysInStage }];

          // Calcular la suma de todos los pesos secos parciales de este lote
          const { data: allHarvests } = await supabase.from('core_partial_harvests').select('weight_dry').eq('batch_id', harvestModal.batch.id);
          const totalDryWeight = (allHarvests || []).reduce((sum: number, h: any) => sum + Number(h.weight_dry || 0), 0) + grams;
          batchUpdates.weight_dry = totalDryWeight;
      }

      const { error: batchError } = await supabase.from('core_batches').update(batchUpdates).eq('id', harvestModal.batch.id);
      if (!batchError) {
          alert("Tanda cosechada exitosamente. Stock inyectado en el POS con costo unitario calculado.");
          fetchBatches();
      } else {
          alert("Error de actualización del lote: " + batchError.message);
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
               <div className="flex flex-col sm:flex-row gap-2 items-center">
                   {batches.length > 0 && (
                       <button onClick={() => setActiveGlobalBitacora(true)} className="flex w-full sm:w-auto justify-center items-center gap-2 px-4 py-2 bg-blue-600/20 text-blue-500 hover:bg-blue-600 hover:text-white rounded-lg transition-colors font-bold text-sm border border-blue-500/30">
                          <Stack size={16} weight="bold" /> Aplicación Global
                       </button>
                   )}
                   <button onClick={() => setAddBatchModalOpen(true)} className="flex w-full sm:w-auto justify-center items-center gap-2 px-4 py-2 bg-emerald-600/20 text-emerald-500 hover:bg-emerald-600 hover:text-white rounded-lg transition-colors font-bold text-sm border border-emerald-500/30">
                      <Plus size={16} weight="bold" /> Añadir Lote Activo
                   </button>
               </div>
             </div>

             <div className="overflow-x-auto">
               <table className="w-full text-left text-sm whitespace-nowrap">
                 <thead>
                   <tr className="border-b border-panel-border/50 text-brand-slate-600 font-mono text-xs uppercase tracking-wider">
                     <th className="py-3 px-2.5 font-normal">Identidad / Genética</th>
                     <th className="py-3 px-2.5 font-normal">Población</th>
                     <th className="py-3 px-2.5 font-normal text-center">Fase de Ciclo</th>
                     <th className="py-3 px-2.5 text-center">Fotoperiodo</th>
                     <th className="py-3 px-2.5 font-normal text-right">Inversión Recurrente</th>
                     <th className="py-3 px-2.5 text-right">Operaciones Máquina</th>
                   </tr>
                 </thead>
                 <tbody className="font-sans">
                   {batches.length === 0 && (
                       <tr><td colSpan={6} className="py-8 px-2.5 text-center text-brand-slate-600 italic">Sala sin lotes asignados.</td></tr>
                   )}
                   {batches.map(b => {
                      const isSecado = (b.stage || '').toLowerCase() === 'finalizado' || (b.stage || '').toLowerCase() === 'cosecha seca';
                      const lastDateStr = b.last_stage_date || b.start_date || b.created_at;
                      const days = Math.max(0, Math.floor((Date.now() - new Date(lastDateStr).getTime()) / (1000 * 60 * 60 * 24)));
                      const cost = batchCosts[b.id] || 0;
                      const stageStr = (b.stage || 'vegetativo').toLowerCase();
                      const stageColor = stageStr.includes('floración') ? 'text-purple-400' : stageStr.includes('cosecha') ? 'text-orange-400' : stageStr.includes('finalizado') ? 'text-brand-slate-500 line-through' : 'text-foreground';
                      
                      return (
                      <tr key={b.id} className={`border-b border-panel-border/20 transition-colors group ${isSecado ? 'opacity-40 hover:opacity-100' : 'hover:bg-black/5 dark:hover:bg-black/5 dark:hover:bg-white/5'}`}>
                        <td className={`py-3 px-2.5 border-l-2 ${isSecado ? 'border-orange-500' : 'border-emerald-500'}`}>
                          <div className={`font-bold text-base mb-1 ${isSecado ? 'line-through text-brand-slate-600' : 'text-foreground'}`}>{b.id}</div>
                          <div className="text-xs font-mono text-brand-slate-600 flex items-center gap-1"><Info size={12}/> {b.strain || 'S/N'} <span className="uppercase text-emerald-500/80 ml-1">({b.origen || 'Clon'})</span></div>
                        </td>
                        <td className="py-3 px-2.5">
                            <span className="flex items-center gap-1 font-bold text-foreground bg-panel-border/30 px-2.5 py-1 rounded-lg w-max">
                               <Plant size={16} className={isSecado ? "text-orange-500" : "text-emerald-500"} /> {b.num_plants || '0'} indivs
                            </span>
                        </td>
                        <td className="py-3 px-2.5 text-center">
                            {b.stage_history && b.stage_history.length > 0 && (
                                <div className="text-[10px] font-mono text-brand-slate-500 mb-1 flex flex-col items-center leading-tight">
                                    {b.stage_history.map((sh: any, idx: number) => (
                                        <span key={idx} className="capitalize">{sh.stage}: {sh.days}d</span>
                                    ))}
                                </div>
                            )}
                            <div className={`text-sm font-bold capitalize ${stageColor}`}>{b.stage || 'Vegetativo'}</div>
                            <div className="text-xs font-mono text-emerald-500/80 mt-0.5">Día {days} Activo</div>
                            
                            {(b.stage === 'cosecha' || b.stage === 'finalizado' || b.stage === 'cosecha seca') && (
                                <div className="mt-2 flex flex-col gap-1 items-center max-w-[150px] mx-auto">
                                    {partialHarvests.filter(ph => ph.batch_id === b.id).map((ph, idx) => (
                                        <span key={idx} className="px-1.5 py-0.5 bg-orange-500/10 text-orange-400 rounded text-[9px] font-mono block w-full text-center truncate" title={`${ph.tanda_name}: ${ph.weight_dry}g`}>
                                            {ph.tanda_name}: {ph.weight_dry}g
                                        </span>
                                    ))}
                                </div>
                            )}
                        </td>
                        <td className="py-3 px-2.5 text-center">
                            <div className="text-[11px] font-mono bg-black/[0.03] dark:bg-black/20 px-2 py-1 rounded text-foreground flex gap-1 justify-center">
                              <span className="text-yellow-400">{b.light_hours || '-'}L</span> / <span className="text-blue-400">{b.dark_hours || '-'}O</span>
                            </div>
                            <div className="flex items-center justify-center gap-1 mt-2">
                              <button onClick={() => { setFotoLuz(b.light_hours); setFotoOsc(b.dark_hours); setFotoModal({isOpen:true, batch:b, nextStage: b.stage}); }} className="btn-glow-emerald py-0.5 px-1.5 border border-panel-border text-[9px] uppercase font-bold text-brand-slate-600 rounded transition-all">Editar</button>
                              <button onClick={() => setChartModal({isOpen: true, batch: b})} className="btn-glow-purple py-0.5 px-1.5 border border-panel-border text-[9px] uppercase font-bold text-brand-slate-600 rounded transition-all">Chart</button>
                            </div>
                        </td>
                        <td className="py-3 px-2.5 text-right">
                            <div className={`inline-flex items-center gap-1 font-mono font-bold text-base ${cost > 0 ? 'text-status-yellow' : 'text-brand-slate-600'}`}>
                               <Coins size={16} /> {cost > 0 ? `$${cost.toFixed(2)}` : 'N/A'}
                            </div>
                        </td>
                        <td className="py-3 px-2.5 align-middle">
                           <div className="flex items-center justify-end gap-1.5 flex-wrap">
                           {b.stage === 'cosecha' && (
                              <button onClick={() => openPartialHarvestModal(b)} className="btn-glow-emerald px-2 py-1 border border-emerald-500/30 text-emerald-500 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all">
                                 + Cosechar
                              </button>
                           )}
                           {isSecado ? (
                                <div className="inline-flex gap-1.5">
                                    <button onClick={() => setActiveReportBatch(b)} className="btn-glow-purple px-1.5 py-1 border border-purple-500/30 text-purple-400 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all">
                                       📊 Reporte
                                    </button>
                                   <button onClick={() => { setFinalizeNotes(b.harvest_notes || ""); setFinalizePhotos(null); setFinalizeModal({ isOpen: true, batch: b }); }} className="btn-glow-yellow px-1.5 py-1 border border-yellow-500/30 text-yellow-400 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1">
                                      📷 Fotos
                                   </button>
                               </div>
                            ) : (
                               <button onClick={() => advanceStageIndicator(b)} className="btn-glow-purple px-2 py-1 border border-panel-border text-brand-slate-600 text-[10px] font-bold uppercase tracking-wider transition-all rounded-lg">
                                  &#10148; {b.stage === 'cosecha' ? 'Finalizar' : 'Ciclar'}
                               </button>
                            )}
                           <button onClick={() => setHealthChartModal({isOpen: true, batch: b})} className="btn-glow-purple px-2 py-1 border border-panel-border text-brand-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1"><Activity size={12}/> IA</button>
                           <button onClick={() => setActiveBitacora(b)} className="btn-glow-emerald px-2 py-1 border border-panel-border text-brand-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all">
                              Bitácora
                           </button>
                           <button onClick={() => { setEditBatch(b as any); setEditBatchModalOpen(true); }} className="btn-glow-yellow px-2 py-1 border border-panel-border text-brand-slate-600 rounded-lg transition-all" title="Editar">
                              <PencilSimple size={14} weight="bold" />
                           </button>
                            <button onClick={() => handleDeleteBatch(b.id)} className="btn-glow-red px-2 py-1 border border-panel-border text-brand-slate-600 rounded-lg transition-all" title="Eliminar">
                               <Trash size={14} weight="bold" />
                            </button>
                           </div>
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

      {activeGlobalBitacora && selectedRoom && (
        <BitacoraGlobalModal room={selectedRoom} batches={batches} onClose={() => setActiveGlobalBitacora(false)} onRefreshBatches={fetchBatches} />
      )}

      {/* Modal Fotoperiodo */}
      {fotoModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <GlassCard className="max-w-md w-full p-6 shadow-2xl relative">
                <button onClick={() => setFotoModal(prev => ({...prev, isOpen: false}))} className="absolute top-4 right-4 text-brand-slate-600 hover:text-foreground transition-colors"><AppWindow size={24}/></button>
                <h2 className="text-lg font-bold mb-2 flex items-center gap-2"><AppWindow className="text-yellow-500"/> Definir Fotoperiodo</h2>
                <p className="text-brand-slate-600 dark:text-slate-400 text-sm mb-6">Ajusta los ciclos lumínicos del lote. No tienen límite de suma igual a 24hs.</p>
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

      {/* Modal Cosecha Balance (Tanda Cosecha Seca Parcial) */}
      {harvestModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <GlassCard className="max-w-md w-full p-6 shadow-2xl relative border-t-4 border-t-orange-500">
                <button onClick={() => setHarvestModal(prev => ({...prev, isOpen: false}))} className="absolute top-4 right-4 text-brand-slate-600 hover:text-foreground transition-colors"><AppWindow size={24}/></button>
                <h2 className="text-xl font-bold mb-2 flex items-center gap-2 text-orange-500">Carga de Cosecha Seca Parcial</h2>
                <p className="text-brand-slate-600 dark:text-slate-400 text-sm mb-4">Ingrese los datos para la inyección de stock de esta tanda. El costo se distribuirá proporcionalmente por planta.</p>
                
                <div className="bg-orange-500/10 border border-orange-500/20 p-3 rounded-lg mb-6 grid grid-cols-2 gap-2 text-left">
                   <div>
                       <span className="text-[10px] font-mono text-orange-400 block">OpEx Total Acumulado:</span>
                       <span className="text-sm font-bold text-foreground">${batchCosts[harvestModal.batch.id] || 0} ARG</span>
                   </div>
                   <div>
                       <span className="text-[10px] font-mono text-orange-400 block">Plantas Restantes:</span>
                       <span className="text-sm font-bold text-foreground">{harvestModal.batch.num_plants || 0} vivas</span>
                   </div>
                </div>

                <form onSubmit={handleHarvestSubmit} className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-mono text-brand-slate-600 uppercase mb-1 block">Identificador Tanda</label>
                            <input type="text" required placeholder="Ej: Tanda 1" value={harvestTandaName} onChange={e=>setHarvestTandaName(e.target.value)} className="w-full bg-black/[0.03] dark:bg-black/20 border border-panel-border rounded p-3 text-sm focus:border-orange-500 outline-none text-foreground font-bold"/>
                        </div>
                        <div>
                            <label className="text-xs font-mono text-brand-slate-600 uppercase mb-1 block">Plantas Cosechadas</label>
                            <input type="number" min="1" max={harvestModal.batch.num_plants || 1} required value={harvestPlantsCount} onChange={e=>setHarvestPlantsCount(e.target.value)} className="w-full bg-black/[0.03] dark:bg-black/20 border border-panel-border rounded p-3 text-sm focus:border-orange-500 outline-none text-foreground text-center font-bold"/>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-mono text-brand-slate-600 uppercase mb-1 block">Peso Seco Neto (Gramos)</label>
                        <input type="number" step="0.01" required placeholder="Ej: 85.5" value={harvestGrams} onChange={e=>setHarvestGrams(e.target.value)} className="w-full bg-black/[0.03] dark:bg-black/20 border border-panel-border rounded p-4 text-2xl font-black text-right focus:border-orange-500 outline-none text-foreground"/>
                    </div>
                    <button type="submit" className="mt-2 w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-lg shadow-lg">INYECTAR TANDA A INVENTARIO POS</button>
                </form>
            </GlassCard>
        </div>
      )}

      {/* Modal Chart de Fotoperiodo Histórico */}
      {chartModal.isOpen && (
        <PhotoperiodChartModal batch={chartModal.batch} onClose={() => setChartModal({isOpen: false, batch: null})} />
      )}

      {/* Modal Historial IA */}
      {healthChartModal.isOpen && (
        <AiHealthChartModal batch={healthChartModal.batch} onClose={() => setHealthChartModal({isOpen: false, batch: null})} />
      )}
      {/* Modal Nuevo Lote */}
      {addBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <GlassCard className="max-w-md w-full p-6 shadow-2xl relative border-t-4 border-t-emerald-500">
                <button onClick={() => setAddBatchModalOpen(false)} className="absolute top-4 right-4 text-brand-slate-600 hover:text-foreground transition-colors"><AppWindow size={24}/></button>
                <h2 className="text-xl font-bold mb-2 flex items-center gap-2 text-emerald-500">
                   <Plant size={24} /> Sembrar Nuevo Lote
                </h2>
                <p className="text-brand-slate-600 dark:text-slate-400 text-sm mb-6">El lote ingresará en estado Vegetativo directamente sobre la sala actual ({selectedRoom?.name}).</p>
                
                <form onSubmit={handleCreateBatch} className="flex flex-col gap-4">
                    <div>
                        <label className="text-xs font-mono text-brand-slate-600 uppercase mb-1 block">Identificador / Nombre Personalizado</label>
                        <input type="text" required placeholder="Ej: Esquejes Amnesia #2" value={newBatch.name} onChange={e=>setNewBatch({...newBatch, name: e.target.value})} className="w-full bg-black/[0.03] dark:bg-black/20 border border-panel-border rounded p-3 focus:border-emerald-500 outline-none text-foreground font-bold"/>
                    </div>
                    <div>
                        <label className="text-xs font-mono text-brand-slate-600 uppercase mb-1 block">Genética / Cepa</label>
                        <input type="text" required placeholder="Ej: Amnesia Haze" value={newBatch.strain} onChange={e=>setNewBatch({...newBatch, strain: e.target.value})} className="w-full bg-black/[0.03] dark:bg-black/20 border border-panel-border rounded p-3 focus:border-emerald-500 outline-none text-foreground"/>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-mono text-brand-slate-600 uppercase mb-1 block">Población (Indivs)</label>
                            <input type="number" min="1" required value={newBatch.num_plants} onChange={e=>setNewBatch({...newBatch, num_plants: parseInt(e.target.value) || 1})} className="w-full bg-black/[0.03] dark:bg-black/20 border border-panel-border rounded p-3 focus:border-emerald-500 outline-none text-foreground text-center"/>
                        </div>
                        <div>
                            <label className="text-xs font-mono text-brand-slate-600 uppercase mb-1 block">Raza / Origen</label>
                            <select value={newBatch.origen} onChange={e=>setNewBatch({...newBatch, origen: e.target.value})} className="w-full bg-black/[0.03] dark:bg-black/20 border border-panel-border rounded p-3 focus:border-emerald-500 outline-none text-foreground appearance-none">
                                <option value="Semilla" className="bg-panel-base">Semilla</option>
                                <option value="Clon" className="bg-panel-base">Clon / Esqueje</option>
                                <option value="Externo" className="bg-panel-base">Externo (B2B)</option>
                            </select>
                        </div>
                    </div>
                    <button disabled={isSubmittingBatch} type="submit" className="mt-4 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg shadow-lg flex justify-center items-center gap-2 transition-all">
                        {isSubmittingBatch ? 'PROCESANDO...' : 'ALTA DE LOTE'}
                    </button>
                </form>
            </GlassCard>
        </div>
      )}
      
      {/* Modal Editar Lote */}
      {editBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <GlassCard className="max-w-md w-full p-6 shadow-2xl relative border-t-4 border-t-yellow-500">
                <button onClick={() => setEditBatchModalOpen(false)} className="absolute top-4 right-4 text-brand-slate-600 hover:text-foreground transition-colors"><AppWindow size={24}/></button>
                <h2 className="text-xl font-bold mb-2 flex items-center gap-2 text-yellow-500">
                   <PencilSimple size={24} /> Editar Lote Activo
                </h2>
                <p className="text-brand-slate-600 dark:text-slate-400 text-sm mb-6">El Identificador / Llave primaria no puede ser modificado para preservar la integridad visual y contable del lote.</p>
                
                <form onSubmit={handleUpdateBatch} className="flex flex-col gap-4">
                    <div>
                        <label className="text-xs font-mono text-brand-slate-600 uppercase mb-1 block">Identificador (Inalterable)</label>
                        <input type="text" disabled value={editBatch.id} className="w-full bg-black/[0.03] dark:bg-black/20 border border-panel-border/30 text-brand-light font-medium rounded p-3 italic outline-none cursor-not-allowed opacity-50"/>
                    </div>
                    <div>
                        <label className="text-xs font-mono text-brand-slate-600 uppercase mb-1 block">Genética / Cepa</label>
                        <input type="text" required value={editBatch.strain || ''} onChange={e=>setEditBatch({...editBatch, strain: e.target.value})} className="w-full bg-black/[0.03] dark:bg-black/20 border border-panel-border rounded p-3 focus:border-yellow-500 outline-none text-foreground"/>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-mono text-brand-slate-600 uppercase mb-1 block">Población (Indivs)</label>
                            <input type="number" min="1" required value={editBatch.num_plants} onChange={e=>setEditBatch({...editBatch, num_plants: parseInt(e.target.value) || 1})} className="w-full bg-black/[0.03] dark:bg-black/20 border border-panel-border rounded p-3 focus:border-yellow-500 outline-none text-foreground text-center"/>
                        </div>
                        <div>
                            <label className="text-xs font-mono text-brand-slate-600 uppercase mb-1 block">Raza / Origen</label>
                            <select value={editBatch.origen} onChange={e=>setEditBatch({...editBatch, origen: e.target.value})} className="w-full bg-black/[0.03] dark:bg-black/20 border border-panel-border rounded p-3 focus:border-yellow-500 outline-none text-foreground appearance-none">
                                <option value="semilla" className="bg-panel-base">Semilla</option>
                                <option value="clon" className="bg-panel-base">Clon / Esqueje</option>
                                <option value="externo" className="bg-panel-base">Externo (B2B)</option>
                            </select>
                        </div>
                    </div>
                    <button disabled={isSubmittingEdit} type="submit" className="mt-4 w-full bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-3 rounded-lg shadow-lg flex justify-center items-center gap-2 transition-all">
                        {isSubmittingEdit ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
                    </button>
                </form>
            </GlassCard>
        </div>
      )}
      
      {/* Modal Finalizar Lote (Conclusión + Fotos) */}
      {finalizeModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
            <GlassCard className="max-w-md w-full p-6 shadow-2xl relative border-t-4 border-t-purple-500">
                <button onClick={() => setFinalizeModal({isOpen: false, batch: null})} className="absolute top-4 right-4 text-brand-slate-600 hover:text-foreground transition-colors"><X size={20}/></button>
                <h2 className="text-xl font-bold mb-2 flex items-center gap-2 text-purple-400">
                   <ShieldCheck size={24}/> Finalizar y Archivar Lote
                </h2>
                <p className="text-brand-slate-600 dark:text-slate-400 text-sm mb-4">
                   El lote pasará al historial de archivados. Ingrese una conclusión y suba fotos del resultado del cultivo.
                </p>
                
                <form onSubmit={handleFinalizeSubmit} className="flex flex-col gap-4">
                    <div>
                        <label className="text-xs font-mono text-brand-slate-600 uppercase mb-1 block">Conclusión / Notas Finales</label>
                        <textarea 
                            rows={3}
                            placeholder="Describa el resultado del cultivo, aroma, calidad, problemas surgidos, etc..."
                            value={finalizeNotes}
                            onChange={e=>setFinalizeNotes(e.target.value)}
                            className="w-full bg-black/[0.03] dark:bg-black/20 border border-panel-border rounded p-3 text-sm focus:border-purple-500 outline-none text-foreground resize-none"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-mono text-brand-slate-600 uppercase mb-1 block">Fotos de la Cosecha</label>
                        <div className="flex items-center justify-center w-full">
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-panel-border hover:border-purple-500/50 rounded-xl cursor-pointer bg-black/5 hover:bg-black/10 transition-colors">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                                    <Camera size={28} className="text-brand-slate-600 mb-2"/>
                                    <p className="text-xs text-brand-slate-600 font-bold mb-1">Haga clic para subir fotos</p>
                                    <p className="text-[10px] text-brand-slate-600/70 font-mono">PNG, JPG hasta 5MB {finalizePhotos ? `(${finalizePhotos.length} seleccionadas)` : '(múltiple)'}</p>
                                </div>
                                <input 
                                    type="file" 
                                    multiple 
                                    accept="image/*"
                                    onChange={e => setFinalizePhotos(e.target.files)}
                                    className="hidden" 
                                />
                            </label>
                        </div>
                    </div>
                    <button 
                        disabled={isFinalizing}
                        type="submit" 
                        className="mt-4 w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-lg shadow-lg flex justify-center items-center gap-2 transition-all"
                    >
                        {isFinalizing ? 'PROCESANDO...' : 'CONFIRMAR CIERRE Y GENERAR REPORTE'}
                    </button>
                </form>
            </GlassCard>
        </div>
      )}

      {/* Modal Reporte de Lote */}
      {activeReportBatch && (
        <BatchReportModal 
          batch={activeReportBatch} 
          onClose={() => setActiveReportBatch(null)} 
          onEditReport={(b) => {
             setActiveReportBatch(null);
             setFinalizeNotes(b.harvest_notes || "");
             setFinalizePhotos(null);
             setFinalizeModal({ isOpen: true, batch: b });
          }}
        />
      )}
    </>
  );
}
