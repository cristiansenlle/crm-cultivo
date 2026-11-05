"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Sparkle as Sparkles } from "@phosphor-icons/react";
import {
  X,
  Calendar,
  Lightning,
  Drop,
  Leaf,
  Flask,
  CaretLeft,
  CaretRight,
  CheckCircle,
  Warning,
  BookOpen,
  Sun,
  ArrowsClockwise
} from "@phosphor-icons/react";
import { supabase } from "../../lib/supabase";
import {
  FertilizationPlan,
  RED_HOT_COOKIES_FEEDING_PLAN,
  loadFertilizationPlans,
  getBatchPlanAssignment,
  updateBatchPlanAssignment,
  resolveBatchActivePlanWeek,
  evaluateVisionPlanCorrelation
} from "../../lib/agronomy/fertilizationPlanEngine";

export function FertilizationPlanModal({
  batch,
  onClose,
  onUpdated,
  onOpenBitacoraWithRecipe
}: {
  batch: any;
  onClose: () => void;
  onUpdated?: () => void;
  onOpenBitacoraWithRecipe?: (batch: any) => void;
}) {
  const [plans, setPlans] = useState<FertilizationPlan[]>([RED_HOT_COOKIES_FEEDING_PLAN]);
  const initialAssign = getBatchPlanAssignment(batch);
  const [selectedPlanId, setSelectedPlanId] = useState<string>(initialAssign.planId);
  const [weekOffset, setWeekOffset] = useState<number>(initialAssign.weekOffset);
  const [syncMode, setSyncMode] = useState<"biological_cycles" | "calendar_days">(initialAssign.syncMode);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [latestVision, setLatestVision] = useState<any | null>(null);
  const [savingAssign, setSavingAssign] = useState(false);

  useEffect(() => {
    loadFertilizationPlans(supabase).then(list => {
      if (list.length > 0) setPlans(list);
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

  const currentPlan = useMemo(() => {
    return plans.find(p => p.id === selectedPlanId) || RED_HOT_COOKIES_FEEDING_PLAN;
  }, [plans, selectedPlanId]);

  const resolution = useMemo(() => {
    return resolveBatchActivePlanWeek(batch, currentPlan, recentEvents, {
      weekOffset,
      syncMode
    });
  }, [batch, currentPlan, recentEvents, weekOffset, syncMode]);

  const visionCorrelation = useMemo(() => {
    return evaluateVisionPlanCorrelation(resolution, latestVision);
  }, [resolution, latestVision]);

  const handleSaveAssignment = async (
    newPlanId = selectedPlanId,
    newOffset = weekOffset,
    newSyncMode = syncMode
  ) => {
    setSavingAssign(true);
    await updateBatchPlanAssignment(supabase, batch.id, {
      planId: newPlanId,
      weekOffset: newOffset,
      syncMode: newSyncMode
    });
    setSavingAssign(false);
  };

  const vegWeeks = currentPlan.weeks_schedule.filter(w => w.stage === "vegetativo");
  const floraWeeks = currentPlan.weeks_schedule.filter(w => w.stage === "floración");

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
      <div className="bg-panel-base border border-panel-border w-full max-w-6xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-panel-border bg-black/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Plan de Fertilización Asignado
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Lote: {batch.id} ({batch.strain || "S/N"})
              </span>
              {resolution.isExtendedPhotoperiod && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                  <Sun size={12} weight="fill" /> Fotoperiodo Extendido {resolution.lightHours}L/{resolution.darkHours}O ({resolution.cycleTotalHours}h = {resolution.photoperiodStretchFactor}x)
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-foreground mt-1">
              {currentPlan.name}
            </h2>
            <p className="text-xs font-mono text-brand-slate-600 dark:text-slate-400">
              {currentPlan.subtitle}
            </p>
          </div>

          <div className="flex items-center gap-2 self-end md:self-center">
            {onOpenBitacoraWithRecipe && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenBitacoraWithRecipe(batch);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-lg cursor-pointer"
              >
                <Drop size={15} weight="fill" /> Ir a Regar con este Plan
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

        {/* Contenido Principal Scrolleable */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">
          {/* 1. Tarjetas Resumen de Configuración del Lote y Sincronización (>24h) */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
            {/* Selector de Plan */}
            <div className="p-3.5 rounded-xl bg-black/25 border border-panel-border flex flex-col justify-between gap-2">
              <span className="text-[10px] font-mono uppercase text-brand-slate-600 dark:text-slate-400 font-bold">
                Programa Nutricional Activo
              </span>
              <select
                value={selectedPlanId}
                onChange={e => {
                  setSelectedPlanId(e.target.value);
                  handleSaveAssignment(e.target.value, weekOffset, syncMode);
                }}
                className="w-full bg-panel-base border border-panel-border rounded-lg p-2 text-xs font-mono text-foreground focus:border-emerald-500 outline-none"
              >
                {plans.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <span className="text-[10px] font-mono text-emerald-400">
                Agua Base: EC {currentPlan.base_water_ec} mS/cm • {currentPlan.base_water_ppm} ppm
              </span>
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
                    handleSaveAssignment(selectedPlanId, weekOffset, "biological_cycles");
                  }}
                  className={`flex-1 py-1 px-2 rounded text-[10px] font-mono font-bold border transition-colors cursor-pointer ${
                    syncMode === "biological_cycles"
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50"
                      : "bg-black/30 text-slate-400 border-panel-border"
                  }`}
                  title="Calcula la semana cada 7 ciclos completos de Luz+Oscuridad (Ideal para fotoperiodos >24h)"
                >
                  Por Ciclos ({resolution.cycleTotalHours}h)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSyncMode("calendar_days");
                    handleSaveAssignment(selectedPlanId, weekOffset, "calendar_days");
                  }}
                  className={`flex-1 py-1 px-2 rounded text-[10px] font-mono font-bold border transition-colors cursor-pointer ${
                    syncMode === "calendar_days"
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50"
                      : "bg-black/30 text-slate-400 border-panel-border"
                  }`}
                  title="Calcula la semana cada 7 días calendario de 24h"
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
                    handleSaveAssignment(selectedPlanId, next, syncMode);
                  }}
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-panel-border text-xs font-mono font-bold cursor-pointer"
                  title="Retrasar/estirar 1 semana del plan"
                >
                  -1 Sem
                </button>
                <span className="text-[11px] font-mono font-bold text-emerald-400">
                  Activa: {resolution.activeWeek.label} {weekOffset !== 0 ? `(Offset ${weekOffset > 0 ? `+${weekOffset}` : weekOffset})` : ""}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const next = weekOffset + 1;
                    setWeekOffset(next);
                    handleSaveAssignment(selectedPlanId, next, syncMode);
                  }}
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-panel-border text-xs font-mono font-bold cursor-pointer"
                  title="Adelantar 1 semana del plan"
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

          {resolution.stretchExplanation && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs font-mono text-amber-300 flex items-center gap-2">
              <Sun size={18} weight="fill" className="text-amber-400 shrink-0" />
              <span>{resolution.stretchExplanation}</span>
            </div>
          )}

          {/* 2. Panel de Correlación Bidireccional con el Módulo de Visión IA */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/30 via-cyan-950/20 to-purple-950/30 border border-cyan-500/30 flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold uppercase text-cyan-400 flex items-center gap-1.5">
                  <Sparkles size={16} weight="fill" className="text-amber-400" /> Correlación Visión IA × Plan de Fertilización
                </span>
                <span className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full border font-bold ${visionCorrelation.badgeColor}`}>
                  {visionCorrelation.badgeLabel}
                </span>
              </div>
              {visionCorrelation.lastVisionTimestamp && (
                <span className="text-[10px] font-mono text-slate-400">
                  Última captura IA: {new Date(visionCorrelation.lastVisionTimestamp).toLocaleString()} • Salud: {visionCorrelation.lastVisionHealthScore}/100
                </span>
              )}
            </div>

            <div className="text-sm font-bold text-foreground">
              {visionCorrelation.headline}
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-mono">
              {visionCorrelation.explanation}
            </p>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/10 text-xs font-mono">
              <span className="text-cyan-300">
                🔄 <strong>Alternancia de Riego Hoy:</strong> {resolution.recommendedModeReason}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                 Factor Dosis IA: {(visionCorrelation.doseMultiplier * 100).toFixed(0)}% ({visionCorrelation.recommendedActionLabel})
              </span>
            </div>
          </div>

          {/* 3. FASE 1: TABLA VEGETATIVO */}
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <Leaf size={16} weight="fill" /> Fase 1: Vegetativo y Desarrollo Radicular ({vegWeeks.length} Semanas Base)
            </h3>
            <div className="overflow-x-auto rounded-xl border border-panel-border">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="bg-emerald-950/40 border-b border-panel-border text-emerald-300 uppercase text-[10px]">
                    <th className="p-2.5">Semana</th>
                    <th className="p-2.5">Etapa / Fenología</th>
                    <th className="p-2.5">🅰️ Nutrición Principal (Dosis/L)</th>
                    <th className="p-2.5">Por Bidón ({currentPlan.tank_reference_liters}L)</th>
                    <th className="p-2.5">🅱️ Riego Secundario / Intermedio</th>
                    <th className="p-2.5 text-center">pH Obj.</th>
                    <th className="p-2.5 text-center">EC (mS/cm)</th>
                    <th className="p-2.5 text-center">PPM ({currentPlan.tds_scale})</th>
                    <th className="p-2.5">Observaciones y Manejo Clave</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-panel-border/40">
                  {vegWeeks.map(w => {
                    const isActive =
                      resolution.activeWeek.stage === "vegetativo" &&
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
                      <tr
                        key={w.week_id}
                        className={`transition-colors ${
                          isActive
                            ? "bg-emerald-500/20 border-l-4 border-l-emerald-400 font-bold"
                            : "hover:bg-white/5"
                        }`}
                      >
                        <td className="p-2.5 whitespace-nowrap">
                          <span className="flex items-center gap-1.5">
                            {isActive && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />}
                            <span className={isActive ? "text-emerald-300 font-black" : "text-foreground"}>
                              {w.label}
                            </span>
                          </span>
                        </td>
                        <td className="p-2.5 whitespace-nowrap text-slate-200">{w.phenology}</td>
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. FASE 2: TABLA FLORACIÓN */}
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-black uppercase tracking-wider text-purple-400 flex items-center gap-2">
              <Lightning size={16} weight="fill" /> Fase 2: Floración y Engorde de Cogollos ({floraWeeks.length} Semanas Base)
            </h3>
            <div className="overflow-x-auto rounded-xl border border-panel-border">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="bg-purple-950/40 border-b border-panel-border text-purple-300 uppercase text-[10px]">
                    <th className="p-2.5">Semana</th>
                    <th className="p-2.5">Etapa / Fenología</th>
                    <th className="p-2.5">🅰️ Nutrición Principal (Dosis/L)</th>
                    <th className="p-2.5">Por Bidón ({currentPlan.tank_reference_liters}L)</th>
                    <th className="p-2.5">🅱️ Riego Secundario / Intermedio</th>
                    <th className="p-2.5 text-center">pH Obj.</th>
                    <th className="p-2.5 text-center">EC (mS/cm)</th>
                    <th className="p-2.5 text-center">PPM ({currentPlan.tds_scale})</th>
                    <th className="p-2.5">Observaciones y Manejo Clave</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-panel-border/40">
                  {floraWeeks.map(w => {
                    const isActive =
                      resolution.activeWeek.stage === "floración" &&
                      resolution.activeWeek.week_number === w.week_number;
                    const tankPrep =
                      w.primary_nutrients.length === 0
                        ? "0 g / 0 ml (Sólo agua pura)"
                        : w.primary_nutrients
                            .map(
                              n =>
                                `${n.product_name} ${Number((n.dose * currentPlan.tank_reference_liters).toFixed(1))} ${
                                  n.dose_uom === "g/L" ? "g" : "ml"
                                }`
                            )
                            .join(" + ");

                    return (
                      <tr
                        key={w.week_id}
                        className={`transition-colors ${
                          isActive
                            ? "bg-purple-500/25 border-l-4 border-l-purple-400 font-bold"
                            : "hover:bg-white/5"
                        }`}
                      >
                        <td className="p-2.5 whitespace-nowrap">
                          <span className="flex items-center gap-1.5">
                            {isActive && <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />}
                            <span className={isActive ? "text-purple-300 font-black" : "text-foreground"}>
                              {w.label}
                            </span>
                          </span>
                        </td>
                        <td className="p-2.5 whitespace-nowrap text-slate-200">{w.phenology}</td>
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 5. PROTOCOLOS TÉCNICOS Y REGLAS DE ORO DEL PLAN */}
          {currentPlan.technical_protocols && currentPlan.technical_protocols.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentPlan.technical_protocols.map((sec, idx) => (
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
        </div>
      </div>
    </div>
  );
}
