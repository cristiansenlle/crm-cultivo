"use client";

import React, { useState, useEffect } from "react";
import { GlassCard } from "./ui/GlassCard";
import { supabase } from "../lib/supabase";
import { X, PencilSimple, Trash, Plus } from "@phosphor-icons/react";

interface ManageTandasModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchId?: string;
  onUpdated?: () => void;
}

export function ManageTandasModal({ isOpen, onClose, batchId, onUpdated }: ManageTandasModalProps) {
  const [activeBatchId, setActiveBatchId] = useState<string>(batchId || "");
  const [availableBatches, setAvailableBatches] = useState<string[]>([]);
  const [tandas, setTandas] = useState<any[]>([]);
  const [invItems, setInvItems] = useState<Record<string, number>>({});
  const [totalOpex, setTotalOpex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // Merge modal state
  const [mergeModal, setMergeModal] = useState<{
    isOpen: boolean;
    sourcePh: any;
    targetId: string;
  }>({
    isOpen: false,
    sourcePh: null,
    targetId: ""
  });

  useEffect(() => {
    if (batchId) {
      setActiveBatchId(batchId);
    }
  }, [batchId]);

  const loadData = async () => {
    if (!isOpen) return;
    setLoading(true);

    try {
      // 1. Fetch all partial harvests to discover batches
      const { data: allPartials } = await supabase
        .from('core_partial_harvests')
        .select('*')
        .order('harvest_date', { ascending: true });

      const uniqueBatches = Array.from(new Set((allPartials || []).map((p: any) => p.batch_id).filter(Boolean))) as string[];
      setAvailableBatches(uniqueBatches);

      const targetBatch = activeBatchId || batchId || uniqueBatches[0] || "";
      if (!activeBatchId && targetBatch) {
        setActiveBatchId(targetBatch);
      }

      if (targetBatch) {
        const batchPartials = (allPartials || []).filter((p: any) => p.batch_id === targetBatch);
        setTandas(batchPartials);

        // Fetch OpEx from events
        const { data: eventsData } = await supabase
          .from('core_agronomic_events')
          .select('total_cost')
          .eq('batch_id', targetBatch);
        
        const sumOpex = (eventsData || []).reduce((acc: number, ev: any) => acc + (Number(ev.total_cost) || 0), 0);
        setTotalOpex(sumOpex);

        // Fetch current inventory stock for these tandas
        const tandaIds = batchPartials.map((p: any) => p.id);
        if (tandaIds.length > 0) {
          const { data: invData } = await supabase
            .from('core_inventory_cosechas')
            .select('id, qty')
            .in('id', tandaIds);
          
          const invMap: Record<string, number> = {};
          (invData || []).forEach((item: any) => {
            invMap[item.id] = Number(item.qty) || 0;
          });
          setInvItems(invMap);
        }
      }
    } catch (err) {
      console.error("Error loading tandas:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, activeBatchId]);

  const reconcileBatch = async (targetBatchId: string) => {
    const { data: partials } = await supabase
      .from('core_partial_harvests')
      .select('*')
      .eq('batch_id', targetBatchId);

    if (!partials) return;

    const totalDryGrams = partials.reduce((sum: number, p: any) => sum + (Number(p.weight_dry) || 0), 0);
    
    const { data: eventsData } = await supabase
      .from('core_agronomic_events')
      .select('total_cost')
      .eq('batch_id', targetBatchId);

    const opex = (eventsData || []).reduce((acc: number, ev: any) => acc + (Number(ev.total_cost) || 0), 0);
    const reconciledCostPerGram = totalDryGrams > 0 ? (opex / totalDryGrams) : 0;

    // Actualizar opex_allocated en core_partial_harvests
    for (const p of partials) {
      const allocated = (Number(p.weight_dry) || 0) * reconciledCostPerGram;
      await supabase.from('core_partial_harvests').update({ opex_allocated: allocated }).eq('id', p.id);
    }

    // Actualizar costo unitario ponderado en core_inventory_cosechas
    const partialIds = partials.map((p: any) => p.id);
    if (partialIds.length > 0) {
      await supabase.from('core_inventory_cosechas').update({ price: reconciledCostPerGram }).in('id', partialIds);
    }
  };

  const handleEditGrams = async (tandaId: string, currentGrams: number, tandaName: string) => {
    const val = prompt(
      `Modificar gramos secos para "${tandaName}":\n(Valor actual: ${currentGrams}g)`,
      String(currentGrams)
    );
    if (!val) return;
    const newGrams = parseFloat(val);
    if (isNaN(newGrams) || newGrams <= 0) {
      alert("Ingrese un valor numérico válido mayor a 0.");
      return;
    }

    const delta = newGrams - currentGrams;

    // 1. Actualizar peso seco en core_partial_harvests
    await supabase.from('core_partial_harvests').update({ weight_dry: newGrams }).eq('id', tandaId);

    // 2. Actualizar stock en core_inventory_cosechas
    const { data: invItem } = await supabase.from('core_inventory_cosechas').select('qty').eq('id', tandaId).single();
    if (invItem) {
      const newQty = Math.max(0, (Number(invItem.qty) || 0) + delta);
      await supabase.from('core_inventory_cosechas').update({ qty: newQty }).eq('id', tandaId);
    }

    if (activeBatchId) {
      await reconcileBatch(activeBatchId);
    }

    alert(`¡Gramos de ${tandaName} corregidos a ${newGrams}g con éxito!`);
    await loadData();
    onUpdated?.();
  };

  const handleDelete = async (tandaId: string, tandaName: string) => {
    if (!confirm(`¿Eliminar permanentemente "${tandaName}"?\n\nSe retirará su stock de la bóveda de inventario y se recalcularán los costos del lote.`)) {
      return;
    }

    await supabase.from('core_partial_harvests').delete().eq('id', tandaId);
    await supabase.from('core_inventory_cosechas').delete().eq('id', tandaId);

    if (activeBatchId) {
      await reconcileBatch(activeBatchId);
    }

    alert(`Tanda "${tandaName}" eliminada con éxito.`);
    await loadData();
    onUpdated?.();
  };

  const handleMerge = async (sourceId: string, targetId: string) => {
    const sourcePh = tandas.find(p => p.id === sourceId);
    const targetPh = tandas.find(p => p.id === targetId);
    if (!sourcePh || !targetPh || sourceId === targetId) return;

    const combinedGrams = Number(targetPh.weight_dry) + Number(sourcePh.weight_dry);
    if (!confirm(`¿Confirmas fusionar "${sourcePh.tanda_name}" (${sourcePh.weight_dry}g) dentro de "${targetPh.tanda_name}" (${targetPh.weight_dry}g)?\n\nEl nuevo total de "${targetPh.tanda_name}" será ${combinedGrams.toFixed(1)}g y "${sourcePh.tanda_name}" se eliminará.`)) {
      return;
    }

    // Actualizar tanda destino
    await supabase.from('core_partial_harvests').update({ weight_dry: combinedGrams }).eq('id', targetId);

    const { data: targetInv } = await supabase.from('core_inventory_cosechas').select('qty').eq('id', targetId).single();
    const { data: sourceInv } = await supabase.from('core_inventory_cosechas').select('qty').eq('id', sourceId).single();
    if (targetInv) {
      const combinedInvQty = (Number(targetInv.qty) || 0) + (Number(sourceInv?.qty) || 0);
      await supabase.from('core_inventory_cosechas').update({ qty: combinedInvQty }).eq('id', targetId);
    }

    // Eliminar tanda origen
    await supabase.from('core_partial_harvests').delete().eq('id', sourceId);
    await supabase.from('core_inventory_cosechas').delete().eq('id', sourceId);

    setMergeModal({ isOpen: false, sourcePh: null, targetId: "" });

    if (activeBatchId) {
      await reconcileBatch(activeBatchId);
    }

    alert(`¡Tandas fusionadas exitosamente en ${targetPh.tanda_name}! Total resultante: ${combinedGrams.toFixed(1)}g.`);
    await loadData();
    onUpdated?.();
  };

  if (!isOpen) return null;

  const totalGrams = tandas.reduce((s: number, p: any) => s + (Number(p.weight_dry) || 0), 0);
  const costPerGram = totalGrams > 0 ? (totalOpex / totalGrams) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <GlassCard className="max-w-2xl w-full p-6 shadow-2xl relative border-t-4 border-t-purple-500 max-h-[90vh] flex flex-col">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-brand-slate-600 hover:text-foreground transition-colors"
        >
          <X size={24}/>
        </button>

        <div className="mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2 text-purple-400">
            📋 Gestor de Tandas de Cosecha
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-brand-slate-600 dark:text-slate-400">Lote:</span>
            {availableBatches.length > 1 ? (
              <select
                value={activeBatchId}
                onChange={e => setActiveBatchId(e.target.value)}
                className="bg-black/30 border border-panel-border rounded px-2 py-0.5 text-xs font-bold text-foreground outline-none focus:border-purple-500"
              >
                {availableBatches.map(b => (
                  <option key={b} value={b} className="bg-slate-900 text-white">
                    {b}
                  </option>
                ))}
              </select>
            ) : (
              <span className="font-bold text-foreground text-xs">{activeBatchId || 'Sin Lote'}</span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm font-mono text-slate-400">
            Cargando tandas y conciliando costos...
          </div>
        ) : (
          <>
            {/* Resumen Lote */}
            <div className="grid grid-cols-3 gap-2 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg mb-4 text-center">
              <div>
                <span className="text-[10px] font-mono text-purple-300 block">Total Seco Cosechado:</span>
                <span className="text-sm font-bold text-foreground">{totalGrams.toFixed(1)}g</span>
              </div>
              <div>
                <span className="text-[10px] font-mono text-purple-300 block">Tandas Registradas:</span>
                <span className="text-sm font-bold text-foreground">{tandas.length}</span>
              </div>
              <div>
                <span className="text-[10px] font-mono text-purple-300 block">Costo Ponderado / g:</span>
                <span className="text-sm font-bold text-emerald-400">${costPerGram.toFixed(2)}</span>
              </div>
            </div>

            {/* Tabla de Tandas */}
            <div className="overflow-y-auto flex-1 pr-1 space-y-2">
              {tandas.length === 0 ? (
                <p className="text-center text-sm text-slate-500 py-8">
                  No hay tandas registradas para este lote.
                </p>
              ) : (
                tandas.map((ph: any) => {
                  const currentStock = invItems[ph.id] ?? ph.weight_dry;
                  return (
                    <div 
                      key={ph.id} 
                      className="p-3 bg-black/20 border border-panel-border rounded-lg flex flex-wrap items-center justify-between gap-3 hover:border-purple-500/40 transition-colors"
                    >
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground text-sm">{ph.tanda_name}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                            {ph.harvest_date || 'Sin fecha'}
                          </span>
                        </div>
                        <div className="text-xs text-brand-slate-600 dark:text-slate-400 font-mono mt-1 flex gap-3 flex-wrap">
                          <span>Cosechado: <strong className="text-foreground">{ph.weight_dry}g</strong></span>
                          {currentStock !== ph.weight_dry && (
                            <span className="text-blue-400">En Bóveda: <strong>{currentStock}g</strong></span>
                          )}
                          <span>OpEx: <strong className="text-emerald-400">${Math.round(Number(ph.opex_allocated) || 0)}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleEditGrams(ph.id, Number(ph.weight_dry), ph.tanda_name)}
                          className="px-2.5 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded text-xs font-semibold flex items-center gap-1 transition-all"
                          title="Modificar peso seco cosechado"
                        >
                          <PencilSimple size={14}/> Editar g
                        </button>

                        {tandas.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const otherTandas = tandas.filter((t: any) => t.id !== ph.id);
                              setMergeModal({
                                isOpen: true,
                                sourcePh: ph,
                                targetId: otherTandas[0]?.id || ""
                              });
                            }}
                            className="px-2.5 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-500/30 rounded text-xs font-semibold flex items-center gap-1 transition-all"
                            title="Fusionar y sumar los gramos de esta tanda en otra tanda del lote"
                          >
                            🔗 Fusionar
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDelete(ph.id, ph.tanda_name)}
                          className="p-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 rounded transition-all"
                          title="Eliminar esta tanda y descontar stock de la bóveda"
                        >
                          <Trash size={14}/>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-panel-border flex justify-end items-center">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 bg-panel-border hover:bg-panel-border/80 text-foreground rounded-lg text-xs font-bold transition-all"
              >
                Cerrar
              </button>
            </div>
          </>
        )}

        {/* Modal Secundario: Fusión de Tandas */}
        {mergeModal.isOpen && mergeModal.sourcePh && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
            <GlassCard className="max-w-md w-full p-6 shadow-2xl relative border-t-4 border-t-amber-500">
              <button 
                onClick={() => setMergeModal({ isOpen: false, sourcePh: null, targetId: "" })} 
                className="absolute top-4 right-4 text-brand-slate-600 hover:text-foreground transition-colors"
              >
                <X size={20}/>
              </button>
              <h3 className="text-lg font-bold text-amber-400 mb-1 flex items-center gap-2">
                🔗 Fusionar Tandas
              </h3>
              <p className="text-xs text-brand-slate-600 dark:text-slate-400 mb-4">
                Une el gramaje de una tanda errónea dentro de otra tanda existente del mismo lote.
              </p>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-4 space-y-1 text-xs">
                <div>
                  <span className="text-slate-400">Tanda a transferir (se eliminará):</span>
                  <strong className="block text-foreground text-sm">
                    {mergeModal.sourcePh.tanda_name} ({mergeModal.sourcePh.weight_dry}g)
                  </strong>
                </div>
              </div>

              <div className="mb-4">
                <label className="text-xs font-mono text-brand-slate-600 uppercase mb-1 block">
                  Tanda Destino (donde se sumará el peso)
                </label>
                <select
                  value={mergeModal.targetId}
                  onChange={e => setMergeModal(prev => ({ ...prev, targetId: e.target.value }))}
                  className="w-full bg-black/[0.03] dark:bg-black/40 border border-panel-border rounded p-3 text-sm focus:border-amber-500 outline-none text-foreground font-bold"
                >
                  {tandas
                    .filter((ph: any) => ph.id !== mergeModal.sourcePh.id)
                    .map((ph: any) => (
                      <option key={ph.id} value={ph.id} className="bg-slate-900 text-white">
                        {ph.tanda_name} — Actualmente: {ph.weight_dry}g
                      </option>
                    ))
                  }
                </select>
              </div>

              {/* Previsualización del total tras fusionar */}
              {(() => {
                const targetPh = tandas.find((ph: any) => ph.id === mergeModal.targetId);
                const sourceGrams = Number(mergeModal.sourcePh.weight_dry) || 0;
                const targetGrams = Number(targetPh?.weight_dry) || 0;
                const combined = sourceGrams + targetGrams;

                return (
                  <div className="bg-black/30 border border-panel-border p-3 rounded-lg mb-4 text-xs space-y-1.5">
                    <div className="flex justify-between text-slate-300">
                      <span>{targetPh?.tanda_name || 'Destino'} actual:</span>
                      <span className="font-mono font-bold">{targetGrams.toFixed(1)}g</span>
                    </div>
                    <div className="flex justify-between text-amber-400">
                      <span>+ {mergeModal.sourcePh.tanda_name}:</span>
                      <span className="font-mono font-bold">+{sourceGrams.toFixed(1)}g</span>
                    </div>
                    <div className="pt-1 border-t border-panel-border flex justify-between font-bold text-foreground">
                      <span>Nuevo total {targetPh?.tanda_name}:</span>
                      <span className="font-mono text-amber-400 text-sm">{combined.toFixed(1)}g</span>
                    </div>
                  </div>
                );
              })()}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMergeModal({ isOpen: false, sourcePh: null, targetId: "" })}
                  className="flex-1 py-2.5 bg-panel-border hover:bg-panel-border/80 text-foreground font-bold rounded-lg text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleMerge(mergeModal.sourcePh.id, mergeModal.targetId)}
                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs shadow-lg transition-all"
                >
                  Confirmar Fusión
                </button>
              </div>
            </GlassCard>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
