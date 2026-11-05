"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Sparkle as Sparkles } from "@phosphor-icons/react";
import {
  X,
  Lightning,
  Drop,
  Leaf,
  Flask,
  CheckCircle,
  Warning,
  Sun,
  Plus,
  PencilSimple,
  Trash,
  FloppyDisk,
  Copy,
  CloudArrowDown
} from "@phosphor-icons/react";
import { supabase } from "../../lib/supabase";
import {
  FertilizationPlan,
  FertilizationPlanWeek,
  PlanNutrientDose,
  RED_HOT_COOKIES_FEEDING_PLAN,
  DEFAULT_FERTILIZATION_PLANS,
  createBlankFertilizationPlan,
  loadFertilizationPlans,
  saveFertilizationPlan,
  deleteFertilizationPlan,
  getBatchPlanAssignment,
  updateBatchPlanAssignment,
  resolveBatchActivePlanWeek,
  evaluateVisionPlanCorrelation
} from "../../lib/agronomy/fertilizationPlanEngine";

export function FertilizationPlanModal({
  batch,
  initialPlanToInspect,
  startInEditMode = false,
  onClose,
  onUpdated,
  onOpenBitacoraWithRecipe
}: {
  batch?: any | null;
  initialPlanToInspect?: FertilizationPlan | null;
  startInEditMode?: boolean;
  onClose: () => void;
  onUpdated?: () => void;
  onOpenBitacoraWithRecipe?: (batch: any) => void;
}) {
  const [plans, setPlans] = useState<FertilizationPlan[]>(DEFAULT_FERTILIZATION_PLANS);
  const initialAssign = batch
    ? getBatchPlanAssignment(batch)
    : {
        planId: initialPlanToInspect?.id || RED_HOT_COOKIES_FEEDING_PLAN.id,
        weekOffset: 0,
        syncMode: "biological_cycles" as const
      };

  const [assignedPlanId, setAssignedPlanId] = useState<string>(
    batch ? initialAssign.planId : initialPlanToInspect?.id || RED_HOT_COOKIES_FEEDING_PLAN.id
  );
  // Solo mostramos un plan en pantalla si el lote YA tiene uno asignado, o si el usuario pidió explícitamente inspeccionar/editar uno
  const [inspectingPlanId, setInspectingPlanId] = useState<string | null>(
    batch ? (initialAssign.planId || null) : (initialPlanToInspect?.id || RED_HOT_COOKIES_FEEDING_PLAN.id)
  );

  const [weekOffset, setWeekOffset] = useState<number>(initialAssign.weekOffset);
  const [syncMode, setSyncMode] = useState<"biological_cycles" | "calendar_days">(initialAssign.syncMode);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [latestVision, setLatestVision] = useState<any | null>(null);
  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const [savingAssign, setSavingAssign] = useState(false);

  // Estados de Edición y Creación de Planes
  const [isEditingPlan, setIsEditingPlan] = useState<boolean>(startInEditMode);
  const [draftPlan, setDraftPlan] = useState<FertilizationPlan | null>(null);
  const [editingWeekId, setEditingWeekId] = useState<string | null>(null);
  const [savingPlan, setSavingPlan] = useState<boolean>(false);

  // Estados de Importación desde Google Sheets
  const [showSheetImporter, setShowSheetImporter] = useState<boolean>(false);
  const [sheetUrl, setSheetUrl] = useState<string>("");
  const [sheetCustomName, setSheetCustomName] = useState<string>("");
  const [isImportingSheet, setIsImportingSheet] = useState<boolean>(false);

  useEffect(() => {
    loadFertilizationPlans(supabase).then(list => {
      if (list.length > 0) setPlans(list);
      if (batch) {
        const refreshedAssign = getBatchPlanAssignment(batch);
        setAssignedPlanId(refreshedAssign.planId);
        setInspectingPlanId(refreshedAssign.planId || null);
      }
    });

    supabase
      .from("core_inventory_quimicos")
      .select("id, name, type, origin_type, recommended_dose, dose_uom, uom")
      .order("name")
      .then(({ data }: { data: any }) => {
        if (data) setInventoryList(data);
      });

    if (batch?.id) {
      supabase
        .from("core_agronomic_events")
        .select("*")
        .eq("batch_id", batch.id)
        .order("date_occurred", { ascending: false })
        .limit(8)
        .then(({ data }: { data: any }) => {
          if (data) setRecentEvents(data);
        });

      supabase
        .from("core_image_analyses")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5)
        .then(({ data }: { data: any }) => {
          if (data && data.length > 0) {
            const matchBatch = data.find((a: any) => a.batch_id === batch.id) || data[0];
            setLatestVision(matchBatch);
          }
        });
    }
  }, [batch?.id]);

  // El plan activo en pantalla: nulo cuando el lote está "Sin Plan Asignado" y no se está inspeccionando ni editando ninguno
  const activeViewPlan = useMemo<FertilizationPlan | null>(() => {
    if (isEditingPlan && draftPlan) return draftPlan;
    const targetId = inspectingPlanId || assignedPlanId;
    if (!targetId) return null;
    return plans.find(p => p.id === targetId) || null;
  }, [plans, inspectingPlanId, assignedPlanId, isEditingPlan, draftPlan]);

  // Fallback interno sólo para cálculos de reloj del lote cuando no hay plan activo
  const currentPlan = activeViewPlan || RED_HOT_COOKIES_FEEDING_PLAN;

  useEffect(() => {
    if (startInEditMode && !draftPlan) {
      const target = initialPlanToInspect || activeViewPlan || RED_HOT_COOKIES_FEEDING_PLAN;
      setDraftPlan(JSON.parse(JSON.stringify(target)));
      setInspectingPlanId(target.id);
    }
  }, [startInEditMode, initialPlanToInspect, activeViewPlan, draftPlan]);

  const resolution = useMemo(() => {
    return resolveBatchActivePlanWeek(batch || { stage: "vegetativo", num_plants: 10 }, currentPlan, recentEvents, {
      weekOffset,
      syncMode
    });
  }, [batch, currentPlan, recentEvents, weekOffset, syncMode]);

  const visionCorrelation = useMemo(() => {
    return evaluateVisionPlanCorrelation(resolution, latestVision);
  }, [resolution, latestVision]);

  const handleSaveAssignment = async (
    newPlanId: string,
    newOffset = weekOffset,
    newSyncMode = syncMode
  ) => {
    setAssignedPlanId(newPlanId);
    setInspectingPlanId(newPlanId || null);
    if (!batch?.id) return;
    setSavingAssign(true);
    await updateBatchPlanAssignment(supabase, batch.id, {
      planId: newPlanId,
      weekOffset: newOffset,
      syncMode: newSyncMode
    });
    setSavingAssign(false);
    if (onUpdated) onUpdated();
  };

  // Funciones de Creación, Duplicación, Importación y Edición de Planes
  const handleStartEdit = (planToEdit?: FertilizationPlan) => {
    const base = planToEdit || activeViewPlan || RED_HOT_COOKIES_FEEDING_PLAN;
    const clone: FertilizationPlan = JSON.parse(JSON.stringify(base));
    setDraftPlan(clone);
    setInspectingPlanId(clone.id);
    setIsEditingPlan(true);
  };

  const handleCreateNewPlan = () => {
    const newPlan = createBlankFertilizationPlan(
      batch?.strain ? `Plan Personalizado • ${batch.strain}` : "Nuevo Plan de Fertilización",
      batch?.strain || "General"
    );
    setDraftPlan(newPlan);
    setInspectingPlanId(newPlan.id);
    setIsEditingPlan(true);
    setEditingWeekId(newPlan.weeks_schedule[0]?.week_id || null);
  };

  const handleDuplicatePlan = (planToDup?: FertilizationPlan) => {
    const base = planToDup || activeViewPlan || RED_HOT_COOKIES_FEEDING_PLAN;
    const clone: FertilizationPlan = JSON.parse(JSON.stringify(base));
    clone.id = `plan-copy-${Date.now()}`;
    clone.name = `${base.name} (Copia Editable)`;
    setDraftPlan(clone);
    setInspectingPlanId(clone.id);
    setIsEditingPlan(true);
  };

  const handleSaveEditedPlan = async () => {
    if (!draftPlan) return;
    setSavingPlan(true);

    // Recalcular resúmenes de texto de cada semana a partir de la lista de nutrientes si fueron editados
    const cleanedWeeks: FertilizationPlanWeek[] = draftPlan.weeks_schedule.map((w, idx) => {
      const primarySummary =
        w.primary_nutrients.length > 0
          ? w.primary_nutrients.map(n => `${n.product_name} ${n.dose} ${n.dose_uom}`).join(" + ")
          : w.primary_summary || "0 g/L (Sólo Agua)";
      const secondarySummary =
        w.secondary_nutrients.length > 0
          ? w.secondary_nutrients.map(n => `${n.product_name} ${n.dose} ${n.dose_uom}`).join(" + ")
          : w.secondary_summary || "Solo Agua";

      return {
        ...w,
        week_id: `${w.stage}-${w.week_number}-${idx}`,
        primary_summary: primarySummary,
        secondary_summary: secondarySummary
      };
    });

    const finalPlan: FertilizationPlan = {
      ...draftPlan,
      weeks_schedule: cleanedWeeks
    };

    await saveFertilizationPlan(supabase, finalPlan);
    const updatedList = await loadFertilizationPlans(supabase);
    setPlans(updatedList);
    setInspectingPlanId(finalPlan.id);
    // Si estamos dentro de un lote, preguntamos o asignamos automáticamente el plan recién creado/editado si estaba sin plan
    if (batch?.id && !assignedPlanId) {
      await handleSaveAssignment(finalPlan.id, weekOffset, syncMode);
    }
    setIsEditingPlan(false);
    setDraftPlan(null);
    setEditingWeekId(null);
    setSavingPlan(false);
    if (onUpdated) onUpdated();
  };

  const handleDeleteCurrentPlan = async () => {
    if (!activeViewPlan) return;
    if (activeViewPlan.id === RED_HOT_COOKIES_FEEDING_PLAN.id) {
      alert("El plan piloto base no se puede eliminar, pero podés editarlo o duplicarlo.");
      return;
    }
    if (!window.confirm(`¿Eliminar el plan "${activeViewPlan.name}"?`)) return;
    await deleteFertilizationPlan(supabase, activeViewPlan.id);
    const updatedList = await loadFertilizationPlans(supabase);
    setPlans(updatedList);
    if (assignedPlanId === activeViewPlan.id && batch?.id) {
      await handleSaveAssignment("");
    } else {
      setInspectingPlanId(batch ? null : (updatedList[0]?.id || RED_HOT_COOKIES_FEEDING_PLAN.id));
    }
    if (onUpdated) onUpdated();
  };

  const handleImportSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheetUrl.trim()) return;
    setIsImportingSheet(true);
    try {
      const res = await fetch("/api/agronomy/import-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheetUrl: sheetUrl.trim(),
          customName: sheetCustomName.trim() || undefined
        })
      });
      const data = await res.json();
      if (!res.ok || !data.plan) {
        throw new Error(data.error || "No se pudo importar el Google Sheet.");
      }
      await saveFertilizationPlan(supabase, data.plan);
      const updatedList = await loadFertilizationPlans(supabase);
      setPlans(updatedList);
      setInspectingPlanId(data.plan.id);
      if (batch?.id && !assignedPlanId) {
        await handleSaveAssignment(data.plan.id, weekOffset, syncMode);
      }
      setShowSheetImporter(false);
      setSheetUrl("");
      setSheetCustomName("");
      if (onUpdated) onUpdated();
    } catch (err: any) {
      alert("Error al importar Google Sheet: " + err.message);
    } finally {
      setIsImportingSheet(false);
    }
  };

  const handleAddWeekToDraft = (stage: "vegetativo" | "floración") => {
    if (!draftPlan) return;
    const existingStageWeeks = draftPlan.weeks_schedule.filter(w => w.stage === stage);
    const nextNum = existingStageWeeks.length + 1;
    const newWeekId = `${stage}-${nextNum}-${Date.now()}`;
    const newWeek: FertilizationPlanWeek = {
      week_id: newWeekId,
      stage,
      week_number: nextNum,
      label: stage === "vegetativo" ? `Semana ${nextNum}` : `Flora Sem ${nextNum}`,
      phenology: stage === "vegetativo" ? "Desarrollo Vegetativo" : "Engorde / Floración",
      primary_nutrients: [],
      primary_summary: "Sin productos",
      secondary_nutrients: [],
      secondary_summary: "Solo Agua",
      target_ph_min: stage === "vegetativo" ? 5.9 : 6.1,
      target_ph_max: stage === "vegetativo" ? 6.1 : 6.3,
      target_ec_min: stage === "vegetativo" ? 1.0 : 1.5,
      target_ec_max: stage === "vegetativo" ? 1.2 : 1.8,
      target_ppm_min: stage === "vegetativo" ? 500 : 750,
      target_ppm_max: stage === "vegetativo" ? 600 : 900,
      notes: ""
    };

    setDraftPlan({
      ...draftPlan,
      weeks_schedule: [...draftPlan.weeks_schedule, newWeek]
    });
    setEditingWeekId(newWeekId);
  };

  const handleRemoveWeekFromDraft = (weekId: string) => {
    if (!draftPlan) return;
    const filtered = draftPlan.weeks_schedule.filter(w => w.week_id !== weekId);
    // Re-numerar semanas por etapa
    let vegCounter = 1;
    let floraCounter = 1;
    const reindexed = filtered.map(w => {
      if (w.stage === "vegetativo") {
        const num = vegCounter++;
        return { ...w, week_number: num, label: `Semana ${num}` };
      } else {
        const num = floraCounter++;
        return { ...w, week_number: num, label: `Flora Sem ${num}` };
      }
    });
    setDraftPlan({ ...draftPlan, weeks_schedule: reindexed });
  };

  const updateDraftWeek = (weekId: string, updater: (w: FertilizationPlanWeek) => FertilizationPlanWeek) => {
    if (!draftPlan) return;
    setDraftPlan({
      ...draftPlan,
      weeks_schedule: draftPlan.weeks_schedule.map(w => (w.week_id === weekId ? updater(w) : w))
    });
  };

  const vegWeeks = currentPlan.weeks_schedule.filter(w => w.stage === "vegetativo");
  const floraWeeks = currentPlan.weeks_schedule.filter(w => w.stage === "floración");

  const renderEditableWeekRow = (w: FertilizationPlanWeek, stageAccent: "emerald" | "purple") => {
    const isThisWeekEditing = isEditingPlan && editingWeekId === w.week_id;
    const isActive =
      assignedPlanId === currentPlan.id &&
      resolution.activeWeek.stage === w.stage &&
      resolution.activeWeek.week_number === w.week_number;

    const tankPrep =
      w.primary_nutrients.length === 0
        ? "0 g / 0 ml (Sólo agua)"
        : w.primary_nutrients
            .map(
              n =>
                `${n.product_name} ${Number((n.dose * currentPlan.tank_reference_liters).toFixed(1))} ${
                  n.dose_uom === "g/L" ? "g" : "ml"
                }`
            )
            .join(" + ");

    return (
      <React.Fragment key={w.week_id}>
        <tr
          className={`transition-colors ${
            isActive
              ? stageAccent === "emerald"
                ? "bg-emerald-500/20 border-l-4 border-l-emerald-400 font-bold"
                : "bg-purple-500/25 border-l-4 border-l-purple-400 font-bold"
              : "hover:bg-white/5"
          }`}
        >
          <td className="p-2.5 whitespace-nowrap">
            <span className="flex items-center gap-1.5">
              {isActive && (
                <span
                  className={`w-2 h-2 rounded-full animate-ping ${
                    stageAccent === "emerald" ? "bg-emerald-400" : "bg-purple-400"
                  }`}
                />
              )}
              <span className={isActive ? "text-emerald-300 font-black" : "text-foreground"}>{w.label}</span>
            </span>
          </td>
          <td className="p-2.5 text-slate-200">{w.phenology}</td>
          <td className="p-2.5 text-cyan-300">{w.primary_summary}</td>
          <td className="p-2.5 text-emerald-300">{tankPrep}</td>
          <td className="p-2.5 text-amber-300">{w.secondary_summary}</td>
          <td className="p-2.5 text-center whitespace-nowrap text-purple-300 font-bold">
            {w.target_ph_min === w.target_ph_max ? w.target_ph_min : `${w.target_ph_min} - ${w.target_ph_max}`}
          </td>
          <td className="p-2.5 text-center whitespace-nowrap text-cyan-300 font-bold">
            {w.target_ec_min === w.target_ec_max ? w.target_ec_min : `${w.target_ec_min} - ${w.target_ec_max}`}
          </td>
          <td className="p-2.5 text-center whitespace-nowrap text-indigo-300 font-bold">
            {w.target_ppm_min === w.target_ppm_max ? w.target_ppm_min : `${w.target_ppm_min} - ${w.target_ppm_max}`}
          </td>
          <td className="p-2.5 text-slate-300 max-w-xs">{w.notes}</td>
          {isEditingPlan && (
            <td className="p-2.5 text-right whitespace-nowrap">
              <div className="inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setEditingWeekId(isThisWeekEditing ? null : w.week_id)}
                  className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-bold cursor-pointer"
                >
                  {isThisWeekEditing ? "Cerrar" : "✏️ Editar"}
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveWeekFromDraft(w.week_id)}
                  className="p-1 rounded bg-red-500/15 hover:bg-red-500/30 text-red-400 border border-red-500/30 cursor-pointer"
                  title="Eliminar semana"
                >
                  <Trash size={13} />
                </button>
              </div>
            </td>
          )}
        </tr>

        {/* Panel Desplegable para Editar la Semana Seleccionada */}
        {isThisWeekEditing && (
          <tr className="bg-black/60 border-b border-amber-500/40">
            <td colSpan={10} className="p-4">
              <div className="flex flex-col gap-4 rounded-xl bg-zinc-950/90 border border-amber-500/40 p-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-xs font-bold uppercase text-amber-400">
                    ✏️ Editando {w.label} ({w.stage.toUpperCase()})
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditingWeekId(null)}
                    className="text-xs text-slate-400 hover:text-white cursor-pointer"
                  >
                    Listo ✓
                  </button>
                </div>

                {/* Fila 1: Fenología, pH, EC, PPM, Notas */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2.5">
                  <div className="col-span-2">
                    <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                      Etapa / Fenología
                    </label>
                    <input
                      type="text"
                      value={w.phenology}
                      onChange={e => updateDraftWeek(w.week_id, cur => ({ ...cur, phenology: e.target.value }))}
                      className="w-full bg-black/40 border border-panel-border rounded px-2.5 py-1.5 text-xs text-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono uppercase text-purple-300 block mb-1">pH Mín</label>
                    <input
                      type="number"
                      step="0.1"
                      value={w.target_ph_min}
                      onChange={e =>
                        updateDraftWeek(w.week_id, cur => ({ ...cur, target_ph_min: parseFloat(e.target.value) || 0 }))
                      }
                      className="w-full bg-black/40 border border-panel-border rounded px-2 py-1.5 text-xs text-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono uppercase text-purple-300 block mb-1">pH Máx</label>
                    <input
                      type="number"
                      step="0.1"
                      value={w.target_ph_max}
                      onChange={e =>
                        updateDraftWeek(w.week_id, cur => ({ ...cur, target_ph_max: parseFloat(e.target.value) || 0 }))
                      }
                      className="w-full bg-black/40 border border-panel-border rounded px-2 py-1.5 text-xs text-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono uppercase text-cyan-300 block mb-1">EC Mín</label>
                    <input
                      type="number"
                      step="0.1"
                      value={w.target_ec_min}
                      onChange={e => {
                        const ecMin = parseFloat(e.target.value) || 0;
                        updateDraftWeek(w.week_id, cur => ({
                          ...cur,
                          target_ec_min: ecMin,
                          target_ppm_min: Math.round(ecMin * (draftPlan?.tds_scale || 500))
                        }));
                      }}
                      className="w-full bg-black/40 border border-panel-border rounded px-2 py-1.5 text-xs text-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono uppercase text-cyan-300 block mb-1">EC Máx</label>
                    <input
                      type="number"
                      step="0.1"
                      value={w.target_ec_max}
                      onChange={e => {
                        const ecMax = parseFloat(e.target.value) || 0;
                        updateDraftWeek(w.week_id, cur => ({
                          ...cur,
                          target_ec_max: ecMax,
                          target_ppm_max: Math.round(ecMax * (draftPlan?.tds_scale || 500))
                        }));
                      }}
                      className="w-full bg-black/40 border border-panel-border rounded px-2 py-1.5 text-xs text-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono uppercase text-indigo-300 block mb-1">PPM Mín</label>
                    <input
                      type="number"
                      step="10"
                      value={w.target_ppm_min}
                      onChange={e =>
                        updateDraftWeek(w.week_id, cur => ({ ...cur, target_ppm_min: parseInt(e.target.value) || 0 }))
                      }
                      className="w-full bg-black/40 border border-panel-border rounded px-2 py-1.5 text-xs text-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono uppercase text-indigo-300 block mb-1">PPM Máx</label>
                    <input
                      type="number"
                      step="10"
                      value={w.target_ppm_max}
                      onChange={e =>
                        updateDraftWeek(w.week_id, cur => ({ ...cur, target_ppm_max: parseInt(e.target.value) || 0 }))
                      }
                      className="w-full bg-black/40 border border-panel-border rounded px-2 py-1.5 text-xs text-foreground"
                    />
                  </div>
                </div>

                {/* Fila 2: Productos Riego Principal 🅰️ y Riego Secundario 🅱️ */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Riego Principal 🅰️ */}
                  <div className="p-3 rounded-lg bg-cyan-950/20 border border-cyan-500/30 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-cyan-300">
                        🅰️ Productos Riego Principal (g/L o ml/L)
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateDraftWeek(w.week_id, cur => ({
                            ...cur,
                            primary_nutrients: [
                              ...cur.primary_nutrients,
                              { product_name: "", dose: 0.5, dose_uom: "g/L", origin_type: "mineral" }
                            ]
                          }))
                        }
                        className="px-2 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold cursor-pointer"
                      >
                        + Producto 🅰️
                      </button>
                    </div>
                    {w.primary_nutrients.length === 0 ? (
                      <div className="text-[11px] text-slate-400 italic">
                        Sin nutrientes principales (Sólo Agua).
                      </div>
                    ) : (
                      w.primary_nutrients.map((nut, nIdx) => (
                        <div key={nIdx} className="flex items-center gap-1.5">
                          <input
                            type="text"
                            list="fert-inventory-datalist"
                            placeholder="Producto (ej. Feeding Grow)"
                            value={nut.product_name}
                            onChange={e => {
                              const val = e.target.value;
                              updateDraftWeek(w.week_id, cur => {
                                const copy = [...cur.primary_nutrients];
                                copy[nIdx] = { ...copy[nIdx], product_name: val };
                                return { ...cur, primary_nutrients: copy };
                              });
                            }}
                            className="flex-1 min-w-0 bg-black/50 border border-panel-border rounded px-2 py-1 text-xs text-foreground"
                          />
                          <input
                            type="number"
                            step="0.05"
                            value={nut.dose}
                            onChange={e => {
                              const val = parseFloat(e.target.value) || 0;
                              updateDraftWeek(w.week_id, cur => {
                                const copy = [...cur.primary_nutrients];
                                copy[nIdx] = { ...copy[nIdx], dose: val };
                                return { ...cur, primary_nutrients: copy };
                              });
                            }}
                            className="w-20 bg-black/50 border border-panel-border rounded px-2 py-1 text-xs text-right text-foreground"
                          />
                          <select
                            value={nut.dose_uom}
                            onChange={e => {
                              const uom = e.target.value as "g/L" | "ml/L";
                              updateDraftWeek(w.week_id, cur => {
                                const copy = [...cur.primary_nutrients];
                                copy[nIdx] = { ...copy[nIdx], dose_uom: uom };
                                return { ...cur, primary_nutrients: copy };
                              });
                            }}
                            className="bg-black/50 border border-panel-border rounded px-1.5 py-1 text-xs text-foreground"
                          >
                            <option value="g/L">g/L</option>
                            <option value="ml/L">ml/L</option>
                          </select>
                          <button
                            type="button"
                            onClick={() =>
                              updateDraftWeek(w.week_id, cur => ({
                                ...cur,
                                primary_nutrients: cur.primary_nutrients.filter((_, i) => i !== nIdx)
                              }))
                            }
                            className="p-1 text-red-400 hover:bg-red-500/20 rounded cursor-pointer"
                          >
                            <Trash size={13} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Riego Secundario 🅱️ */}
                  <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-500/30 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-amber-300">
                        🅱️ Productos Riego Secundario / Intermedio
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateDraftWeek(w.week_id, cur => ({
                            ...cur,
                            secondary_nutrients: [
                              ...cur.secondary_nutrients,
                              { product_name: "Feeding Bio Enhancer", dose: 0.5, dose_uom: "g/L", origin_type: "organico" }
                            ]
                          }))
                        }
                        className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-bold cursor-pointer"
                      >
                        + Producto 🅱️
                      </button>
                    </div>
                    {w.secondary_nutrients.length === 0 ? (
                      <input
                        type="text"
                        placeholder="Descripción riego secundario (ej. Solo Agua declorada)"
                        value={w.secondary_summary}
                        onChange={e =>
                          updateDraftWeek(w.week_id, cur => ({ ...cur, secondary_summary: e.target.value }))
                        }
                        className="w-full bg-black/50 border border-panel-border rounded px-2 py-1 text-xs text-foreground"
                      />
                    ) : (
                      w.secondary_nutrients.map((nut, nIdx) => (
                        <div key={nIdx} className="flex items-center gap-1.5">
                          <input
                            type="text"
                            list="fert-inventory-datalist"
                            placeholder="Producto (ej. BioEnhancer / Big One)"
                            value={nut.product_name}
                            onChange={e => {
                              const val = e.target.value;
                              updateDraftWeek(w.week_id, cur => {
                                const copy = [...cur.secondary_nutrients];
                                copy[nIdx] = { ...copy[nIdx], product_name: val };
                                return { ...cur, secondary_nutrients: copy };
                              });
                            }}
                            className="flex-1 min-w-0 bg-black/50 border border-panel-border rounded px-2 py-1 text-xs text-foreground"
                          />
                          <input
                            type="number"
                            step="0.05"
                            value={nut.dose}
                            onChange={e => {
                              const val = parseFloat(e.target.value) || 0;
                              updateDraftWeek(w.week_id, cur => {
                                const copy = [...cur.secondary_nutrients];
                                copy[nIdx] = { ...copy[nIdx], dose: val };
                                return { ...cur, secondary_nutrients: copy };
                              });
                            }}
                            className="w-20 bg-black/50 border border-panel-border rounded px-2 py-1 text-xs text-right text-foreground"
                          />
                          <select
                            value={nut.dose_uom}
                            onChange={e => {
                              const uom = e.target.value as "g/L" | "ml/L";
                              updateDraftWeek(w.week_id, cur => {
                                const copy = [...cur.secondary_nutrients];
                                copy[nIdx] = { ...copy[nIdx], dose_uom: uom };
                                return { ...cur, secondary_nutrients: copy };
                              });
                            }}
                            className="bg-black/50 border border-panel-border rounded px-1.5 py-1 text-xs text-foreground"
                          >
                            <option value="g/L">g/L</option>
                            <option value="ml/L">ml/L</option>
                          </select>
                          <button
                            type="button"
                            onClick={() =>
                              updateDraftWeek(w.week_id, cur => ({
                                ...cur,
                                secondary_nutrients: cur.secondary_nutrients.filter((_, i) => i !== nIdx)
                              }))
                            }
                            className="p-1 text-red-400 hover:bg-red-500/20 rounded cursor-pointer"
                          >
                            <Trash size={13} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Fila 3: Observaciones */}
                <div>
                  <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                    Observaciones y Manejo Clave de la Semana
                  </label>
                  <input
                    type="text"
                    value={w.notes}
                    onChange={e => updateDraftWeek(w.week_id, cur => ({ ...cur, notes: e.target.value }))}
                    className="w-full bg-black/40 border border-panel-border rounded px-2.5 py-1.5 text-xs text-foreground"
                  />
                </div>
              </div>
            </td>
          </tr>
        )}
      </React.Fragment>
    );
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
      <datalist id="fert-inventory-datalist">
        {inventoryList.map(item => (
          <option key={item.id} value={item.name} />
        ))}
      </datalist>

      <div className="bg-panel-base border border-panel-border w-full max-w-6xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-panel-border bg-black/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {batch ? (
                assignedPlanId ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    ✅ Plan Activo en Lote: {batch.id}
                  </span>
                ) : activeViewPlan ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    👁️ Inspeccionando Plantilla (Lote {batch.id} sigue Sin Plan)
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-slate-500/20 text-slate-300 border border-slate-500/40">
                    ⚪ Lote {batch.id}: Sin Plan Asignado (Cultivo Libre)
                  </span>
                )
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Gestor y Editor de Planes de Fertilización
                </span>
              )}

              {resolution.isExtendedPhotoperiod && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                  <Sun size={12} weight="fill" /> Fotoperiodo Extendido {resolution.lightHours}L/{resolution.darkHours}O ({resolution.cycleTotalHours}h = {resolution.photoperiodStretchFactor}x)
                </span>
              )}
            </div>

            {isEditingPlan && draftPlan ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mt-2">
                <input
                  type="text"
                  value={draftPlan.name}
                  onChange={e => setDraftPlan({ ...draftPlan, name: e.target.value })}
                  placeholder="Nombre del Plan"
                  className="md:col-span-2 bg-black/50 border border-amber-500/50 rounded-lg px-3 py-1.5 text-sm font-black text-foreground"
                />
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-mono text-slate-400 whitespace-nowrap">Agua/Planta (L):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={draftPlan.water_per_plant_liters}
                    onChange={e =>
                      setDraftPlan({ ...draftPlan, water_per_plant_liters: parseFloat(e.target.value) || 2.0 })
                    }
                    className="w-24 bg-black/50 border border-amber-500/50 rounded-lg px-2.5 py-1.5 text-xs font-mono text-foreground"
                  />
                </div>
                <input
                  type="text"
                  value={draftPlan.subtitle}
                  onChange={e => setDraftPlan({ ...draftPlan, subtitle: e.target.value })}
                  placeholder="Subtítulo / Línea de nutrientes y sustrato"
                  className="md:col-span-3 bg-black/50 border border-panel-border rounded-lg px-3 py-1 text-xs font-mono text-slate-300"
                />
              </div>
            ) : activeViewPlan ? (
              <>
                <h2 className="text-xl sm:text-2xl font-black text-foreground mt-1 truncate">
                  {activeViewPlan.name}
                </h2>
                <p className="text-xs font-mono text-brand-slate-600 dark:text-slate-400">
                  {activeViewPlan.subtitle}
                </p>
              </>
            ) : (
              <>
                <h2 className="text-xl sm:text-2xl font-black text-foreground mt-1">
                  Lote {batch?.id} ({batch?.strain}) • Sin Plan de Fertilización Asignado
                </h2>
                <p className="text-xs font-mono text-brand-slate-600 dark:text-slate-400 mt-0.5">
                  Este lote opera en Modo Libre. Elegí abajo si querés asignarle un plan existente, crear un plan nuevo desde cero o importar un Google Sheet.
                </p>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 self-end md:self-center">
            {isEditingPlan ? (
              <>
                <button
                  type="button"
                  disabled={savingPlan}
                  onClick={handleSaveEditedPlan}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-lg cursor-pointer"
                >
                  <FloppyDisk size={16} weight="bold" />
                  {savingPlan ? "Guardando..." : "Guardar Plan"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingPlan(false);
                    setDraftPlan(null);
                    setEditingWeekId(null);
                    if (!assignedPlanId && batch) setInspectingPlanId(null);
                  }}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Cancelar Edición
                </button>
              </>
            ) : (
              <>
                {batch && !assignedPlanId && activeViewPlan && (
                  <>
                    <button
                      type="button"
                      onClick={() => setInspectingPlanId(null)}
                      className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-bold cursor-pointer"
                    >
                      ← Volver (Sin Plan)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveAssignment(activeViewPlan.id, weekOffset, syncMode)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg cursor-pointer"
                    >
                      <CheckCircle size={15} weight="fill" /> Asignar este Plan al Lote
                    </button>
                  </>
                )}
                {activeViewPlan && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleStartEdit(activeViewPlan)}
                      className="px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <PencilSimple size={15} weight="bold" /> Editar Plan
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuplicatePlan(activeViewPlan)}
                      className="px-3 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      title="Duplicar este plan para crear una variante"
                    >
                      <Copy size={15} weight="bold" /> Duplicar
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={handleCreateNewPlan}
                  className="px-3 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={15} weight="bold" /> Crear Nuevo
                </button>
                <button
                  type="button"
                  onClick={() => setShowSheetImporter(!showSheetImporter)}
                  className="px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <CloudArrowDown size={15} weight="bold" /> Importar Sheet
                </button>
                {activeViewPlan && activeViewPlan.id !== RED_HOT_COOKIES_FEEDING_PLAN.id && (
                  <button
                    type="button"
                    onClick={handleDeleteCurrentPlan}
                    className="p-2 rounded-xl bg-red-500/15 hover:bg-red-500/30 text-red-400 border border-red-500/30 cursor-pointer"
                    title="Eliminar este plan personalizado"
                  >
                    <Trash size={16} />
                  </button>
                )}
              </>
            )}

            {batch && onOpenBitacoraWithRecipe && assignedPlanId && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenBitacoraWithRecipe(batch);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-lg cursor-pointer"
              >
                <Drop size={15} weight="fill" /> Ir a Bitácora
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Barra Desplegable de Importación desde Google Sheets */}
        {showSheetImporter && (
          <form
            onSubmit={handleImportSheet}
            className="px-5 py-3.5 bg-emerald-950/30 border-b border-emerald-500/30 flex flex-col sm:flex-row items-center gap-3"
          >
            <input
              type="text"
              placeholder="Nombre para el plan (Opcional)"
              value={sheetCustomName}
              onChange={e => setSheetCustomName(e.target.value)}
              className="w-full sm:w-64 bg-black/50 border border-panel-border rounded-lg px-3 py-2 text-xs text-foreground"
            />
            <input
              type="url"
              required
              placeholder="Pegá el link de Google Sheets compartido (https://docs.google.com/spreadsheets/d/...)"
              value={sheetUrl}
              onChange={e => setSheetUrl(e.target.value)}
              className="flex-1 w-full bg-black/50 border border-panel-border rounded-lg px-3 py-2 text-xs font-mono text-foreground"
            />
            <button
              type="submit"
              disabled={isImportingSheet}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase whitespace-nowrap cursor-pointer"
            >
              {isImportingSheet ? "Importando..." : "📥 Descargar y Guardar"}
            </button>
          </form>
        )}

        {/* Contenido Principal Scrolleable */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">
          {!activeViewPlan ? (
            /* PANTALLA LIMPIA CUANDO EL LOTE NO TIENE PLAN ASIGNADO */
            <div className="flex flex-col gap-5">
              {/* Estado actual del Lote */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-black/30 border border-panel-border flex flex-col justify-between gap-2">
                  <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">
                    Estado Nutricional de Lote {batch?.id}
                  </span>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-base font-extrabold text-foreground">
                        ⚪ Sin Plan Asignado (Cultivo Libre)
                      </div>
                      <p className="text-xs font-mono text-slate-400 mt-0.5">
                        Podés cargar riegos libremente en la Bitácora sin metas semanales fijas, o asignarle un plan abajo.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-black/30 border border-panel-border flex flex-col justify-between gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">
                      Reloj del Lote & Fotoperiodo
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-yellow-500/15 text-yellow-300 border border-yellow-500/30 font-bold">
                      {resolution.lightHours}L / {resolution.darkHours}O ({resolution.cycleTotalHours}h)
                    </span>
                  </div>
                  <div className="text-sm font-bold text-foreground font-mono">
                    Día {resolution.calendarDaysInStage} Calendario (Semana {resolution.calendarWeekInStage} de {batch?.stage || "Vegetativo"})
                  </div>
                  <div className="text-xs font-mono text-cyan-400">
                    ☀️ {resolution.biologicalCyclesCompleted} Ciclos Lumínicos completados → Semana Fenológica {resolution.biologicalWeekInStage}
                  </div>
                </div>
              </div>

              {/* Acciones Rápidas: Crear desde Cero o Importar */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={handleCreateNewPlan}
                  className="p-5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/40 text-left flex items-start gap-4 transition-all cursor-pointer group"
                >
                  <div className="p-3 rounded-xl bg-cyan-500/20 text-cyan-300">
                    <Plus size={24} weight="bold" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-cyan-300 group-hover:underline">
                      ➕ Crear un Plan Nuevo desde Cero para {batch?.strain || "este Lote"}
                    </div>
                    <p className="text-xs font-mono text-slate-300 mt-1">
                      Armá tu propio cronograma semana por semana con tus productos, dosis en g/L o ml/L, pH, EC y PPM.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setShowSheetImporter(true)}
                  className="p-5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 text-left flex items-start gap-4 transition-all cursor-pointer group"
                >
                  <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-300">
                    <CloudArrowDown size={24} weight="bold" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-emerald-300 group-hover:underline">
                      📥 Importar Plan desde Google Sheets
                    </div>
                    <p className="text-xs font-mono text-slate-300 mt-1">
                      Pegá el enlace compartido de tu hoja de cálculo y convertilo automáticamente en un plan semanal editable.
                    </p>
                  </div>
                </button>
              </div>

              {/* Biblioteca de Planes / Plantillas Disponibles para Asignar o Editar */}
              <div className="flex flex-col gap-3">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                  📚 O seleccioná uno de los Planes / Plantillas guardados en la Biblioteca ({plans.length}):
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {plans.map(planItem => {
                    const vegCount = planItem.weeks_schedule.filter(w => w.stage === "vegetativo").length;
                    const floraCount = planItem.weeks_schedule.filter(w => w.stage === "floración").length;
                    return (
                      <div
                        key={planItem.id}
                        className="p-4 rounded-xl bg-black/30 border border-panel-border hover:border-emerald-500/40 flex flex-col justify-between gap-3 transition-all"
                      >
                        <div>
                          <div className="text-sm font-black text-foreground">{planItem.name}</div>
                          <p className="text-[11px] font-mono text-slate-400 mt-1">{planItem.subtitle}</p>
                          <div className="flex flex-wrap gap-2 mt-2.5 text-[10px] font-mono">
                            <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                              🌱 {vegCount} Sem. Vegetativo
                            </span>
                            <span className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">
                              🌸 {floraCount} Sem. Floración
                            </span>
                            <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30">
                              💧 {planItem.water_per_plant_liters}L / Planta
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-panel-border/40">
                          <button
                            type="button"
                            onClick={() => handleSaveAssignment(planItem.id, weekOffset, syncMode)}
                            className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle size={15} weight="fill" /> Asignar al Lote
                          </button>
                          <button
                            type="button"
                            onClick={() => setInspectingPlanId(planItem.id)}
                            className="py-2 px-3 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-bold cursor-pointer"
                          >
                            👁️ Ver Tabla
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(planItem)}
                            className="py-2 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold cursor-pointer"
                          >
                            ✏️ Editar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* 1. Tarjetas Resumen de Configuración del Lote y Sincronización (>24h) */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
                {/* Selector de Plan / Asignación al Lote */}
                <div className="p-3.5 rounded-xl bg-black/25 border border-panel-border flex flex-col justify-between gap-2">
                  <span className="text-[10px] font-mono uppercase text-brand-slate-600 dark:text-slate-400 font-bold">
                    {batch ? `Asignación para Lote ${batch.id}` : "Seleccionar Plan para Ver/Editar"}
                  </span>
                  {batch ? (
                    <>
                      <select
                        value={assignedPlanId}
                        onChange={e => handleSaveAssignment(e.target.value, weekOffset, syncMode)}
                        className="w-full bg-panel-base border border-panel-border rounded-lg p-2 text-xs font-mono text-foreground focus:border-emerald-500 outline-none"
                      >
                        <option value="">-- Sin Plan Asignado (Libre) --</option>
                        {plans.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      {!assignedPlanId ? (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-mono text-amber-300 truncate">
                            👁️ Vista previa sin asignar
                          </span>
                          <button
                            type="button"
                            onClick={() => handleSaveAssignment(activeViewPlan.id, weekOffset, syncMode)}
                            className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold whitespace-nowrap cursor-pointer"
                          >
                            Asignar a Lote
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] font-mono text-emerald-400">
                          ✅ Activo • Agua/Planta: {activeViewPlan.water_per_plant_liters}L
                        </span>
                      )}
                    </>
                  ) : (
                    <select
                      value={activeViewPlan.id}
                      onChange={e => setInspectingPlanId(e.target.value)}
                      className="w-full bg-panel-base border border-panel-border rounded-lg p-2 text-xs font-mono text-foreground focus:border-emerald-500 outline-none"
                    >
                      {plans.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Estado de Días y Fotoperiodo (>24h) */}
                <div className="p-3.5 rounded-xl bg-black/25 border border-panel-border flex flex-col justify-between gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-brand-slate-600 dark:text-slate-400 font-bold">
                      Reloj del Lote & Fotoperiodo
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-300 border border-yellow-500/30 font-bold">
                      {resolution.lightHours}L / {resolution.darkHours}O ({resolution.cycleTotalHours}h)
                    </span>
                  </div>
                  <div className="text-sm font-bold text-foreground font-mono">
                    Día {resolution.calendarDaysInStage} Calendario (Sem {resolution.calendarWeekInStage})
                  </div>
                  <div className="text-[11px] font-mono text-cyan-400">
                    ☀️ {resolution.biologicalCyclesCompleted} Ciclos Lumínicos → Sem Fenológica {resolution.biologicalWeekInStage}
                  </div>
                </div>

                {/* Modo de Sincronización (>24h) y Ajuste de Semana (Estiramiento) */}
                <div className="p-3.5 rounded-xl bg-black/25 border border-cyan-500/30 flex flex-col justify-between gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-cyan-400 font-bold">
                      Sincronización de Semana
                    </span>
                    {savingAssign && (
                      <span className="text-[9px] font-mono text-emerald-400 animate-pulse">Guardando...</span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSyncMode("biological_cycles");
                        if (assignedPlanId) handleSaveAssignment(assignedPlanId, weekOffset, "biological_cycles");
                      }}
                      className={`flex-1 py-1 px-2 rounded text-[10px] font-mono font-bold border transition-colors cursor-pointer ${
                        syncMode === "biological_cycles"
                          ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50"
                          : "bg-black/30 text-slate-400 border-panel-border"
                      }`}
                    >
                      Por Ciclos ({resolution.cycleTotalHours}h)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSyncMode("calendar_days");
                        if (assignedPlanId) handleSaveAssignment(assignedPlanId, weekOffset, "calendar_days");
                      }}
                      className={`flex-1 py-1 px-2 rounded text-[10px] font-mono font-bold border transition-colors cursor-pointer ${
                        syncMode === "calendar_days"
                          ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50"
                          : "bg-black/30 text-slate-400 border-panel-border"
                      }`}
                    >
                      Calendario (24h)
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        const next = weekOffset - 1;
                        setWeekOffset(next);
                        if (assignedPlanId) handleSaveAssignment(assignedPlanId, next, syncMode);
                      }}
                      className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-panel-border text-xs font-mono font-bold cursor-pointer"
                    >
                      -1 Sem
                    </button>
                    <span className="text-[11px] font-mono font-bold text-emerald-400">
                      Activa: {resolution.activeWeek.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const next = weekOffset + 1;
                        setWeekOffset(next);
                        if (assignedPlanId) handleSaveAssignment(assignedPlanId, next, syncMode);
                      }}
                      className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-panel-border text-xs font-mono font-bold cursor-pointer"
                    >
                      +1 Sem
                    </button>
                  </div>
                </div>

                {/* Objetivos de la Semana Actual */}
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/40 flex flex-col justify-between gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold">
                      🎯 Meta {resolution.activeWeek.label}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-300 font-bold">
                      ~{resolution.suggestedBatchWaterLiters}L / Lote ({resolution.numPlants} pl)
                    </span>
                  </div>
                  <div className="text-xs font-bold text-foreground truncate">
                    {resolution.activeWeek.phenology}
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-[10px] font-mono font-bold">
                    <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      pH {resolution.activeWeek.target_ph_min === resolution.activeWeek.target_ph_max ? resolution.activeWeek.target_ph_min : `${resolution.activeWeek.target_ph_min}–${resolution.activeWeek.target_ph_max}`}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      EC {resolution.activeWeek.target_ec_min === resolution.activeWeek.target_ec_max ? resolution.activeWeek.target_ec_min : `${resolution.activeWeek.target_ec_min}–${resolution.activeWeek.target_ec_max}`}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {resolution.activeWeek.target_ppm_min === resolution.activeWeek.target_ppm_max ? resolution.activeWeek.target_ppm_min : `${resolution.activeWeek.target_ppm_min}–${resolution.activeWeek.target_ppm_max}`} ppm
                    </span>
                  </div>
                </div>
              </div>

              {isEditingPlan && (
                <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-xs font-mono text-amber-200 flex items-center justify-between gap-2">
                  <span>
                    🛠️ <strong>Modo Edición Activo:</strong> Hacé clic en <strong>"✏️ Editar"</strong> en cualquier fila para modificar sus productos (`g/L` o `ml/L`), pH, EC y PPM, o agregá nuevas semanas. Al finalizar presioná <strong>"Guardar Plan"</strong> arriba a la derecha.
                  </span>
                </div>
              )}

              {/* 3. FASE 1: TABLA VEGETATIVO */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                    <Leaf size={16} weight="fill" /> Fase 1: Vegetativo y Desarrollo Radicular ({vegWeeks.length} Semanas)
                  </h3>
                  {isEditingPlan && (
                    <button
                      type="button"
                      onClick={() => handleAddWeekToDraft("vegetativo")}
                      className="px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={14} weight="bold" /> + Semana Vegetativo
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto rounded-xl border border-panel-border">
                  <table className="w-full text-left text-xs font-mono border-collapse">
                    <thead>
                      <tr className="bg-emerald-950/40 border-b border-panel-border text-emerald-300 uppercase text-[10px]">
                        <th className="p-2.5">Semana</th>
                        <th className="p-2.5">Etapa / Fenología</th>
                        <th className="p-2.5">🅰️ Nutrición Principal (Dosis/L)</th>
                        <th className="p-2.5">Por Bidón ({activeViewPlan.tank_reference_liters}L)</th>
                        <th className="p-2.5">🅱️ Riego Secundario / Intermedio</th>
                        <th className="p-2.5 text-center">pH Obj.</th>
                        <th className="p-2.5 text-center">EC (mS/cm)</th>
                        <th className="p-2.5 text-center">PPM ({activeViewPlan.tds_scale})</th>
                        <th className="p-2.5">Observaciones</th>
                        {isEditingPlan && <th className="p-2.5 text-right">Acciones</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-panel-border/40">
                      {vegWeeks.map(w => renderEditableWeekRow(w, "emerald"))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 4. FASE 2: TABLA FLORACIÓN */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-wider text-purple-400 flex items-center gap-2">
                    <Lightning size={16} weight="fill" /> Fase 2: Floración y Engorde de Cogollos ({floraWeeks.length} Semanas)
                  </h3>
                  {isEditingPlan && (
                    <button
                      type="button"
                      onClick={() => handleAddWeekToDraft("floración")}
                      className="px-3 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={14} weight="bold" /> + Semana Floración
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto rounded-xl border border-panel-border">
                  <table className="w-full text-left text-xs font-mono border-collapse">
                    <thead>
                      <tr className="bg-purple-950/40 border-b border-panel-border text-purple-300 uppercase text-[10px]">
                        <th className="p-2.5">Semana</th>
                        <th className="p-2.5">Etapa / Fenología</th>
                        <th className="p-2.5">🅰️ Nutrición Principal (Dosis/L)</th>
                        <th className="p-2.5">Por Bidón ({activeViewPlan.tank_reference_liters}L)</th>
                        <th className="p-2.5">🅱️ Riego Secundario / Intermedio</th>
                        <th className="p-2.5 text-center">pH Obj.</th>
                        <th className="p-2.5 text-center">EC (mS/cm)</th>
                        <th className="p-2.5 text-center">PPM ({activeViewPlan.tds_scale})</th>
                        <th className="p-2.5">Observaciones</th>
                        {isEditingPlan && <th className="p-2.5 text-right">Acciones</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-panel-border/40">
                      {floraWeeks.map(w => renderEditableWeekRow(w, "purple"))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 5. PROTOCOLOS TÉCNICOS Y REGLAS DE ORO DEL PLAN */}
              {activeViewPlan.technical_protocols && activeViewPlan.technical_protocols.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeViewPlan.technical_protocols.map((sec, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-black/25 border border-panel-border flex flex-col gap-2"
                    >
                      <h4 className="text-xs font-mono font-bold uppercase text-amber-400">
                        {sec.title}
                      </h4>
                      <ul className="flex flex-col gap-1.5 text-xs font-mono text-slate-300">
                        {sec.bullets.map((b, bIdx) => (
                          <li key={bIdx} className="leading-relaxed">
                            • {b}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
