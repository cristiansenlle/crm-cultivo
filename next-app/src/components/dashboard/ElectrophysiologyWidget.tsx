"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { GlassCard } from '../ui/GlassCard';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Scatter
} from 'recharts';
import {
  Activity,
  Zap,
  Droplets,
  Sun,
  Moon,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  Camera,
  RefreshCw,
  Sparkles,
  FlaskConical,
  Sprout
} from 'lucide-react';
import { PhytoDiagnosisResult } from '../../lib/electrophysiology/PhytoDiagnosticEngine';

interface ElectrophysiologyWidgetProps {
  initialRoomId?: string;
  className?: string;
}

export function ElectrophysiologyWidget({
  initialRoomId = '5a650ff8-9b93-40cc-a7f9-c672bad50014',
  className = ''
}: ElectrophysiologyWidgetProps) {
  // Estados de Selección
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>(initialRoomId);
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [soilSensors, setSoilSensors] = useState<any[]>([]);
  const [selectedSoilSensorIdCh1, setSelectedSoilSensorIdCh1] = useState<string>('');
  const [selectedSoilSensorIdCh2, setSelectedSoilSensorIdCh2] = useState<string>('');

  // Estados de Datos
  const [loading, setLoading] = useState<boolean>(true);
  const [diagnosisData, setDiagnosisData] = useState<PhytoDiagnosisResult | null>(null);
  const [timeRange, setTimeRange] = useState<number>(100); // Límite de puntos
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

  // 1. Cargar Salas, Lotes y Sensores de Suelo de la Sala
  useEffect(() => {
    async function loadMetadata() {
      // Salas
      const { data: rData } = await supabase.from('core_rooms').select('id, name, phase');
      if (rData && rData.length > 0) {
        setRooms(rData);
        if (!selectedRoomId) setSelectedRoomId(rData[0].id);
      }

      // Lotes
      const { data: bData } = await supabase
        .from('core_batches')
        .select('id, strain, stage, start_date, last_stage_date, light_hours, dark_hours, room_id');
      if (bData && bData.length > 0) {
        setBatches(bData);
        const match = bData.find((b: any) => b.room_id === selectedRoomId);
        if (match) setSelectedBatchId(match.id);
        else setSelectedBatchId(bData[0].id);
      }

      // Sensores de Suelo
      const { data: sData } = await supabase
        .from('core_soil_sensors')
        .select('id, name, pin_index, room_id')
        .order('pin_index', { ascending: true });
      if (sData && sData.length > 0) {
        setSoilSensors(sData);
        const roomMatch = sData.filter((s: any) => !s.room_id || s.room_id === selectedRoomId);
        if (roomMatch.length > 0) {
          setSelectedSoilSensorIdCh1(roomMatch[0].id);
          setSelectedSoilSensorIdCh2(roomMatch.length > 1 ? roomMatch[1].id : roomMatch[0].id);
        } else {
          setSelectedSoilSensorIdCh1(sData[0].id);
          setSelectedSoilSensorIdCh2(sData.length > 1 ? sData[1].id : sData[0].id);
        }
      }
    }
    loadMetadata();
  }, [selectedRoomId]);

  // Actualizar filtros cuando cambia de sala
  const filteredSoilSensors = useMemo(() => {
    return soilSensors.filter(s => !s.room_id || s.room_id === selectedRoomId);
  }, [soilSensors, selectedRoomId]);

  const filteredBatches = useMemo(() => {
    return batches.filter(b => !b.room_id || b.room_id === selectedRoomId);
  }, [batches, selectedRoomId]);

  // 2. Consultar Datos y Diagnóstico Bioeléctrico desde la API
  const fetchData = async () => {
    try {
      let url = `/api/iot/electrophysiology?room_id=${selectedRoomId}&limit=${timeRange}`;
      if (selectedBatchId) url += `&batch_id=${selectedBatchId}`;
      if (selectedSoilSensorIdCh1) url += `&soil_sensor_id_ch1=${selectedSoilSensorIdCh1}`;
      if (selectedSoilSensorIdCh2) url += `&soil_sensor_id_ch2=${selectedSoilSensorIdCh2}`;

      const res = await fetch(url);
      const json = await res.json();

      if (json.success && json.data) {
        setDiagnosisData(json.data);
      }
    } catch (err) {
      console.error('Error cargando electrofisiología:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    if (autoRefresh) {
      const interval = setInterval(fetchData, 8000); // Polling suave cada 8s
      return () => clearInterval(interval);
    }
  }, [selectedRoomId, selectedBatchId, selectedSoilSensorIdCh1, selectedSoilSensorIdCh2, timeRange, autoRefresh]);

  // Información del Lote Seleccionado
  const currentBatch = useMemo(() => {
    return batches.find(b => b.id === selectedBatchId);
  }, [batches, selectedBatchId]);

  const daysInStage = useMemo(() => {
    if (!currentBatch) return null;
    const baseDate = currentBatch.last_stage_date || currentBatch.start_date;
    if (!baseDate) return null;
    return Math.max(1, Math.floor((Date.now() - new Date(baseDate).getTime()) / (1000 * 3600 * 24)));
  }, [currentBatch]);

  if (loading && !diagnosisData) {
    return (
      <GlassCard className={`p-8 flex flex-col items-center justify-center min-h-[300px] ${className}`}>
        <RefreshCw className="animate-spin text-emerald-500 mb-3" size={32} />
        <span className="font-mono text-sm text-foreground/70">Cargando Telemetría Electrofisiológica & Diagnóstico...</span>
      </GlassCard>
    );
  }

  const {
    live_metrics,
    ch1_assessment,
    ch2_assessment,
    differential_assessment,
    state_assessment,
    correlations,
    recommended_protocols,
    chart_timeline
  } = diagnosisData || {
    live_metrics: { voltage_mv: 1640, baseline_mv: 1640, delta_mv: 0, stress_index: 0, event: 'steady', ads_online: true, timestamp: '' },
    ch1_assessment: { channel_name: 'Canal 1', channel_pin: 'A0', voltage_mv: 1640, baseline_mv: 1640, delta_mv: 0, stress_index: 0, event: 'steady', category: 'optimal', title: 'Metabolismo Basal', description: 'Monitoreando...', color: '#22c55e' },
    state_assessment: { category: 'optimal', code: 'STEADY', title: 'Monitoreo Inicial', description: 'Conectando...', color: '#22c55e' },
    correlations: {
      hydration: { status: 'optima', soil_moisture_pct: 0, ch1_soil_moisture_pct: 0, ch2_soil_moisture_pct: 0, absorption_efficiency: '' },
      nutrition: { recent_product: null, active_ingredients: [], response_evaluation: '', detected_trend: 'estable' },
      circadian_and_lights: { photoperiod_applied: '18/6', phase_days: '', light_state_now: 'Luz Encendida', circadian_health: 'sincronizado' },
      climate_vpd: { vpd_leaf: 1.1, vpd_ambient: 1.3, transpiration_status: 'optima' },
      visual_ai_crosscheck: { health_score: 90, visual_issue: '', corroboration: '' }
    },
    recommended_protocols: [],
    chart_timeline: []
  };

  return (
    <div className={`flex flex-col gap-5 ${className}`}>
      {/* 1. Barra de Encabezado y Selectores de Contexto */}
      <GlassCard className="p-5 border border-emerald-500/30 bg-gradient-to-r from-emerald-950/20 via-zinc-900/40 to-black/40 backdrop-blur-xl shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              <Zap className="animate-pulse" size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-wide text-foreground">Electrofisiología Vegetal</h2>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  ADS1115 16-BIT EN VIVO
                </span>
              </div>
              <p className="text-xs text-foreground/60">Monitoreo bioeléctrico de membrana, fotosíntesis y nutrición en tiempo real</p>
            </div>
          </div>

          {/* Selectores de Sala, Lote y Sensores de Maceta CH1 y CH2 */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Selector de Sala */}
            <div className="flex flex-col">
              <label className="text-[10px] font-mono text-foreground/50 uppercase">Sala / Carpa</label>
              <select
                value={selectedRoomId}
                onChange={e => setSelectedRoomId(e.target.value)}
                className="bg-black/40 border border-panel-border rounded-lg px-2.5 py-1.5 text-xs text-foreground font-mono focus:border-emerald-500 outline-none"
              >
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            {/* Selector de Lote */}
            <div className="flex flex-col">
              <label className="text-[10px] font-mono text-foreground/50 uppercase">Lote Activo</label>
              <select
                value={selectedBatchId}
                onChange={e => setSelectedBatchId(e.target.value)}
                className="bg-black/40 border border-panel-border rounded-lg px-2.5 py-1.5 text-xs text-foreground font-mono focus:border-emerald-500 outline-none"
              >
                {filteredBatches.map(b => (
                  <option key={b.id} value={b.id}>{b.strain || b.id}</option>
                ))}
              </select>
            </div>

            {/* Selector de Maceta 1 (Canal 1 A0) */}
            <div className="flex flex-col">
              <label className="text-[10px] font-mono text-emerald-400 uppercase font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Maceta CH1
              </label>
              <select
                value={selectedSoilSensorIdCh1}
                onChange={e => setSelectedSoilSensorIdCh1(e.target.value)}
                className="bg-emerald-950/30 border border-emerald-500/40 rounded-lg px-2.5 py-1.5 text-xs text-emerald-300 font-mono focus:border-emerald-500 outline-none"
              >
                {filteredSoilSensors.map(s => (
                  <option key={s.id} value={s.id}>{s.name || `Sensor Pin ${s.pin_index}`}</option>
                ))}
              </select>
            </div>

            {/* Selector de Maceta 2 (Canal 2 A1) */}
            <div className="flex flex-col">
              <label className="text-[10px] font-mono text-amber-400 uppercase font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span> Maceta CH2
              </label>
              <select
                value={selectedSoilSensorIdCh2}
                onChange={e => setSelectedSoilSensorIdCh2(e.target.value)}
                className="bg-amber-950/30 border border-amber-500/40 rounded-lg px-2.5 py-1.5 text-xs text-amber-300 font-mono focus:border-amber-500 outline-none"
              >
                {filteredSoilSensors.map(s => (
                  <option key={s.id} value={s.id}>{s.name || `Sensor Pin ${s.pin_index}`}</option>
                ))}
              </select>
            </div>

            {/* Botón de Refresco */}
            <button
              onClick={fetchData}
              className="mt-3 p-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg transition-colors"
              title="Actualizar datos ahora"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* 2. Insignias de Contexto Real Cargado en la App Web */}
        <div className="mt-4 pt-3 border-t border-panel-border/40 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-foreground/70 bg-black/20 p-2 rounded-lg border border-panel-border/30">
            <Sprout size={14} className="text-emerald-400" />
            <span>Fase: <strong className="text-foreground uppercase">{currentBatch?.stage || 'Vegetativo'} {daysInStage ? `(Día ${daysInStage})` : ''}</strong></span>
          </div>

          <div className="flex items-center gap-1.5 text-foreground/70 bg-black/20 p-2 rounded-lg border border-panel-border/30">
            <Sun size={14} className="text-amber-400" />
            <span>Fotoperíodo: <strong className="text-foreground">{currentBatch?.light_hours || 18}h Luz / {currentBatch?.dark_hours || 6}h Osc</strong></span>
          </div>

          <div className="flex items-center gap-1.5 text-foreground/70 bg-black/20 p-2 rounded-lg border border-panel-border/30">
            <Droplets size={14} className="text-blue-400" />
            <span>Humedad M1 / M2: <strong className="text-emerald-300">{correlations.hydration.ch1_soil_moisture_pct !== null && correlations.hydration.ch1_soil_moisture_pct !== undefined ? `${correlations.hydration.ch1_soil_moisture_pct}%` : 'N/A'}</strong> / <strong className="text-amber-300">{correlations.hydration.ch2_soil_moisture_pct !== null && correlations.hydration.ch2_soil_moisture_pct !== undefined ? `${correlations.hydration.ch2_soil_moisture_pct}%` : 'N/A'}</strong></span>
          </div>

          <div className="flex items-center gap-1.5 text-foreground/70 bg-black/20 p-2 rounded-lg border border-panel-border/30">
            <Activity size={14} className="text-purple-400" />
            <span>VPD Foliar: <strong className="text-foreground">{correlations.climate_vpd.vpd_leaf !== null ? `${correlations.climate_vpd.vpd_leaf} kPa` : 'N/A'}</strong></span>
          </div>
        </div>
      </GlassCard>

      {/* 3. PANELES DUALES DESTACADOS PARA AMBOS CANALES AD8232 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* PANEL CANAL 1 (AD8232 #1 -> Pin A0) */}
        <GlassCard className="p-5 border-2 border-emerald-500/40 bg-emerald-950/10 relative overflow-hidden shadow-[0_0_25px_rgba(16,185,129,0.1)]">
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <h3 className="font-bold text-sm font-mono text-emerald-400 tracking-wider">
                CANAL 1 — AD8232 #1 (Pin A0)
              </h3>
            </div>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Sensor Primario
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-[11px] font-mono text-foreground/50 uppercase block mb-0.5">Biopotencial en Vivo</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl sm:text-4xl font-black font-mono text-emerald-400">
                  {(live_metrics.ch1?.voltage_mv ?? live_metrics.voltage_mv).toFixed(1)}
                </span>
                <span className="text-xs font-mono text-foreground/50">mV</span>
              </div>
              <div className="mt-2 text-[11px] font-mono text-foreground/70 flex items-center gap-2">
                <span>Línea Base:</span>
                <span className="text-purple-400 font-bold">
                  {(live_metrics.ch1?.baseline_mv ?? live_metrics.baseline_mv).toFixed(1)} mV
                </span>
              </div>
              <div className="mt-1 text-[11px] font-mono text-foreground/70 flex items-center gap-1.5">
                <Droplets size={12} className="text-blue-400" />
                <span>Humedad M1:</span>
                <span className="text-blue-400 font-bold">
                  {correlations.hydration.ch1_soil_moisture_pct !== null && correlations.hydration.ch1_soil_moisture_pct !== undefined ? `${correlations.hydration.ch1_soil_moisture_pct}%` : 'N/A'}
                </span>
              </div>
            </div>

            <div className="flex flex-col justify-between border-l border-emerald-500/20 pl-4">
              <div>
                <span className="text-[11px] font-mono text-foreground/50 uppercase block mb-1">Índice de Estrés CH1</span>
                <span className={`text-2xl font-black font-mono ${
                  (live_metrics.ch1?.stress_index ?? live_metrics.stress_index) < 35 ? 'text-emerald-400' :
                  (live_metrics.ch1?.stress_index ?? live_metrics.stress_index) < 70 ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {(live_metrics.ch1?.stress_index ?? live_metrics.stress_index).toFixed(0)}%
                </span>
                <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden mt-1.5 border border-panel-border/30">
                  <div
                    className={`h-full transition-all duration-500 ${
                      (live_metrics.ch1?.stress_index ?? live_metrics.stress_index) < 35 ? 'bg-emerald-500' :
                      (live_metrics.ch1?.stress_index ?? live_metrics.stress_index) < 70 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(100, (live_metrics.ch1?.stress_index ?? live_metrics.stress_index))}%` }}
                  />
                </div>
              </div>

              <div className="text-[10px] font-mono text-foreground/60 flex items-center justify-between pt-2">
                <span>Dinámica:</span>
                <span className="text-emerald-300 font-bold uppercase">
                  {live_metrics.ch1?.event ?? live_metrics.event}
                </span>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* PANEL CANAL 2 (AD8232 #2 -> Pin A1) */}
        <GlassCard className="p-5 border-2 border-amber-500/40 bg-amber-950/10 relative overflow-hidden shadow-[0_0_25px_rgba(245,158,11,0.1)]">
          <div className="flex items-center justify-between border-b border-amber-500/20 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
              <h3 className="font-bold text-sm font-mono text-amber-400 tracking-wider">
                CANAL 2 — AD8232 #2 (Pin A1)
              </h3>
            </div>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Sensor Secundario
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-[11px] font-mono text-foreground/50 uppercase block mb-0.5">Biopotencial en Vivo</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl sm:text-4xl font-black font-mono text-amber-400">
                  {live_metrics.ch2 ? live_metrics.ch2.voltage_mv.toFixed(1) : '---'}
                </span>
                <span className="text-xs font-mono text-foreground/50">mV</span>
              </div>
              <div className="mt-2 text-[11px] font-mono text-foreground/70 flex items-center gap-2">
                <span>Línea Base:</span>
                <span className="text-purple-400 font-bold">
                  {live_metrics.ch2 ? `${live_metrics.ch2.baseline_mv.toFixed(1)} mV` : 'Calculando...'}
                </span>
              </div>
              <div className="mt-1 text-[11px] font-mono text-foreground/70 flex items-center gap-1.5">
                <Droplets size={12} className="text-amber-400" />
                <span>Humedad M2:</span>
                <span className="text-amber-400 font-bold">
                  {correlations.hydration.ch2_soil_moisture_pct !== null && correlations.hydration.ch2_soil_moisture_pct !== undefined ? `${correlations.hydration.ch2_soil_moisture_pct}%` : 'N/A'}
                </span>
              </div>
            </div>

            <div className="flex flex-col justify-between border-l border-amber-500/20 pl-4">
              <div>
                <span className="text-[11px] font-mono text-foreground/50 uppercase block mb-1">Índice de Estrés CH2</span>
                <span className={`text-2xl font-black font-mono ${
                  !live_metrics.ch2 ? 'text-foreground/40' :
                  live_metrics.ch2.stress_index < 35 ? 'text-emerald-400' :
                  live_metrics.ch2.stress_index < 70 ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {live_metrics.ch2 ? `${live_metrics.ch2.stress_index.toFixed(0)}%` : '---'}
                </span>
                <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden mt-1.5 border border-panel-border/30">
                  <div
                    className={`h-full transition-all duration-500 ${
                      !live_metrics.ch2 ? 'bg-zinc-700' :
                      live_metrics.ch2.stress_index < 35 ? 'bg-emerald-500' :
                      live_metrics.ch2.stress_index < 70 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${live_metrics.ch2 ? Math.min(100, live_metrics.ch2.stress_index) : 0}%` }}
                  />
                </div>
              </div>

              <div className="text-[10px] font-mono text-foreground/60 flex items-center justify-between pt-2">
                <span>Dinámica:</span>
                <span className="text-amber-300 font-bold uppercase">
                  {live_metrics.ch2 ? live_metrics.ch2.event : 'steady'}
                </span>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* 4. SUITE DE DIAGNÓSTICO INTELIGENTE: DUAL-CHANNEL & GRADIENTE SISTÉMICO */}
      <GlassCard className="p-6 border border-panel-border/60 bg-gradient-to-br from-black/60 to-zinc-950/70 shadow-xl space-y-4">
        {/* Encabezado General del Individuo */}
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 border-b border-panel-border/40 pb-4">
          <div className="flex items-start gap-3.5">
            <div
              className="p-2.5 rounded-xl border flex-shrink-0 mt-0.5"
              style={{
                backgroundColor: `${state_assessment.color}20`,
                borderColor: `${state_assessment.color}40`,
                color: state_assessment.color
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono uppercase tracking-wider text-foreground/50">Diagnóstico Bioeléctrico Inteligente</span>
                <span
                  className="px-2 py-0.5 text-[10px] font-mono font-bold rounded uppercase"
                  style={{
                    backgroundColor: `${state_assessment.color}20`,
                    color: state_assessment.color,
                    border: `1px solid ${state_assessment.color}40`
                  }}
                >
                  {state_assessment.title}
                </span>
              </div>
              <p className="text-sm text-foreground/90 font-sans leading-relaxed">
                {state_assessment.description}
              </p>
            </div>
          </div>

          {/* Protocolos Recomendados */}
          {recommended_protocols.length > 0 && (
            <div className="lg:w-80 flex-shrink-0 flex flex-col gap-2 p-3 bg-black/40 border border-panel-border rounded-xl">
              <span className="text-[11px] font-mono text-foreground/60 uppercase flex items-center gap-1.5">
                <BookOpen size={13} className="text-emerald-400" /> Protocolo Recomendado
              </span>
              {recommended_protocols.map(p => (
                <div key={p.id} className="p-2 bg-emerald-950/20 border border-emerald-500/30 rounded-lg text-xs">
                  <span className="font-bold text-emerald-300 block">{p.title}</span>
                  <span className="text-[11px] text-foreground/70 leading-tight block mt-0.5">{p.relevance_reason}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Diagnóstico Diferencial Inter-Canal (Gradiente y Translocación) */}
        {differential_assessment && (
          <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/30 font-mono text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2">
                <Activity size={15} className="text-cyan-400" />
                <span className="font-bold text-cyan-300">Gradiente Inter-Canal & Translocación:</span>
                <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold">
                  {differential_assessment.direction_label}
                </span>
              </div>
              <span className="text-cyan-400 font-bold">
                ΔV = {differential_assessment.gradient_mv > 0 ? `+${differential_assessment.gradient_mv}` : differential_assessment.gradient_mv} mV
              </span>
            </div>
            <p className="text-foreground/80 font-sans text-xs leading-relaxed">
              {differential_assessment.systemic_description}
            </p>
          </div>
        )}

        {/* Diagnósticos Específicos por Canal (2 Columnas) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Diagnóstico Canal 1 */}
          <div className="p-3.5 rounded-xl bg-emerald-950/15 border border-emerald-500/30">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                <Zap size={13} /> {ch1_assessment?.channel_name || 'Canal 1 (A0)'}
              </span>
              <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {ch1_assessment?.title || 'Metabolismo Activo'}
              </span>
            </div>
            <p className="text-xs text-foreground/80 font-sans leading-relaxed">
              {ch1_assessment?.description || 'Monitoreo bioeléctrico activo.'}
            </p>
          </div>

          {/* Diagnóstico Canal 2 */}
          <div className="p-3.5 rounded-xl bg-amber-950/15 border border-amber-500/30">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-mono font-bold text-amber-400 flex items-center gap-1.5">
                <Activity size={13} /> {ch2_assessment?.channel_name || 'Canal 2 (A1)'}
              </span>
              <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {ch2_assessment?.title || (ch2_assessment ? 'En Monitoreo' : 'Sin Señal')}
              </span>
            </div>
            <p className="text-xs text-foreground/80 font-sans leading-relaxed">
              {ch2_assessment?.description || 'Canal secundario no configurado o esperando datos.'}
            </p>
          </div>
        </div>

        {/* Detalle Nutricional de Bodega */}
        {correlations.nutrition.recent_product && (
          <div className="p-2.5 bg-purple-950/20 border border-purple-500/30 rounded-lg flex items-center gap-2 text-xs font-mono text-purple-300">
            <FlaskConical size={16} className="text-purple-400 flex-shrink-0" />
            <span>
              <strong>Insumo Bodega:</strong> {correlations.nutrition.recent_product} • Activos: {correlations.nutrition.active_ingredients.join(', ')} • <em>{correlations.nutrition.response_evaluation}</em>
            </span>
          </div>
        )}

        {/* Cross-Check con Análisis de Imágenes */}
        {correlations.visual_ai_crosscheck.visual_issue && (
          <div className="p-2 bg-blue-950/20 border border-blue-500/30 rounded-lg flex items-center gap-2 text-xs font-mono text-blue-300">
            <Camera size={14} className="text-blue-400 flex-shrink-0" />
            <span><strong>IA Visual:</strong> {correlations.visual_ai_crosscheck.corroboration}</span>
          </div>
        )}
      </GlassCard>

      {/* 5. DOS GRÁFICOS DEDICADOS E INDEPENDIENTES (CANAL 1 Y CANAL 2) */}
      <div className="space-y-6">
        {/* GRÁFICO DEDICADO CANAL 1 */}
        <GlassCard className="p-6 border border-emerald-500/40 bg-black/30 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-emerald-400 flex items-center gap-2">
                <Zap size={18} className="text-emerald-400" />
                Gráfico Canal 1 — AD8232 #1 (Pin A0): Biopotencial vs Humedad vs VPD
              </h3>
              <p className="text-xs text-foreground/50 font-mono">
                Señal Primaria • Escala Dinámica en mV • Correlación con Humedad de Maceta
              </p>
            </div>

            <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-lg border border-panel-border text-xs font-mono">
              <button
                onClick={() => setTimeRange(40)}
                className={`px-2.5 py-1 rounded transition-colors ${timeRange === 40 ? 'bg-emerald-600 text-white font-bold' : 'text-foreground/60 hover:text-foreground'}`}
              >
                1h
              </button>
              <button
                onClick={() => setTimeRange(120)}
                className={`px-2.5 py-1 rounded transition-colors ${timeRange === 120 ? 'bg-emerald-600 text-white font-bold' : 'text-foreground/60 hover:text-foreground'}`}
              >
                6h
              </button>
              <button
                onClick={() => setTimeRange(300)}
                className={`px-2.5 py-1 rounded transition-colors ${timeRange === 300 ? 'bg-emerald-600 text-white font-bold' : 'text-foreground/60 hover:text-foreground'}`}
              >
                24h
              </button>
            </div>
          </div>

          {chart_timeline.length === 0 ? (
            <div className="h-[280px] flex items-center justify-center border border-dashed border-panel-border/40 rounded-xl text-xs font-mono text-foreground/40">
              Esperando paquetes de telemetría bioeléctrica...
            </div>
          ) : (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chart_timeline} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis
                    dataKey="timeLabel"
                    tick={{ fontSize: 10, fill: '#888' }}
                    interval="preserveStartEnd"
                    minTickGap={30}
                  />
                  <YAxis
                    yAxisId="yBio"
                    orientation="left"
                    tick={{ fontSize: 10, fill: '#10b981' }}
                    domain={['auto', 'auto']}
                    tickFormatter={val => `${Number(val).toFixed(0)} mV`}
                  />
                  <YAxis
                    yAxisId="ySoil"
                    orientation="right"
                    tick={{ fontSize: 10, fill: '#3b82f6' }}
                    domain={[0, 100]}
                    tickFormatter={val => `${val}%`}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null;
                      const dataPoint = payload[0].payload;
                      return (
                        <div className="bg-panel-base/95 backdrop-blur-xl border border-panel-border p-3 rounded-xl shadow-2xl font-mono text-xs z-50 min-w-[200px]">
                          <p className="font-bold text-foreground mb-1.5 border-b border-panel-border/50 pb-1 flex items-center justify-between">
                            <span>{label}</span>
                            <span className="text-[10px] text-emerald-400 font-normal">{dataPoint.time?.split('T')[1]?.slice(0, 8)}</span>
                          </p>
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-emerald-400">
                              <span>CH1 Biopotencial:</span>
                              <span className="font-bold">{(dataPoint.ch1_voltage_mv ?? dataPoint.voltage_mv)?.toFixed(1)} mV</span>
                            </div>
                            <div className="flex justify-between items-center text-purple-400">
                              <span>CH1 Línea Base:</span>
                              <span className="font-bold">{(dataPoint.ch1_baseline_mv ?? dataPoint.baseline_mv)?.toFixed(1)} mV</span>
                            </div>
                            {(dataPoint.ch1_soil_moisture_pct !== undefined || dataPoint.soil_moisture_pct !== undefined) && (
                              <div className="flex justify-between items-center text-blue-400">
                                <span>Humedad Maceta 1:</span>
                                <span className="font-bold">{dataPoint.ch1_soil_moisture_pct ?? dataPoint.soil_moisture_pct}%</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Line
                    yAxisId="yBio"
                    type="monotone"
                    dataKey="ch1_voltage_mv"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={false}
                    name="Canal 1 (A0) Biopotencial mV"
                    activeDot={{ r: 5, fill: '#10b981' }}
                  />
                  <Line
                    yAxisId="yBio"
                    type="monotone"
                    dataKey="ch1_baseline_mv"
                    stroke="#a855f7"
                    strokeWidth={1.8}
                    strokeDasharray="4 4"
                    dot={false}
                    name="Línea Base CH1 (mV)"
                  />
                  <Line
                    yAxisId="ySoil"
                    type="monotone"
                    dataKey="ch1_soil_moisture_pct"
                    stroke="#3b82f6"
                    strokeWidth={1.8}
                    dot={false}
                    name="Humedad Maceta 1 (%)"
                    connectNulls
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </GlassCard>

        {/* GRÁFICO DEDICADO CANAL 2 */}
        <GlassCard className="p-6 border border-amber-500/40 bg-black/30 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-amber-400 flex items-center gap-2">
                <Activity size={18} className="text-amber-400" />
                Gráfico Canal 2 — AD8232 #2 (Pin A1): Biopotencial Secundario
              </h3>
              <p className="text-xs text-foreground/50 font-mono">
                Señal Secundaria / Segunda Zona • Escala Dinámica en mV • Correlación con Humedad Maceta 2
              </p>
            </div>
          </div>

          {chart_timeline.length === 0 ? (
            <div className="h-[280px] flex items-center justify-center border border-dashed border-panel-border/40 rounded-xl text-xs font-mono text-foreground/40">
              Esperando paquetes de telemetría bioeléctrica...
            </div>
          ) : (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chart_timeline} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis
                    dataKey="timeLabel"
                    tick={{ fontSize: 10, fill: '#888' }}
                    interval="preserveStartEnd"
                    minTickGap={30}
                  />
                  <YAxis
                    yAxisId="yBio2"
                    orientation="left"
                    tick={{ fontSize: 10, fill: '#f59e0b' }}
                    domain={['auto', 'auto']}
                    tickFormatter={val => `${Number(val).toFixed(0)} mV`}
                  />
                  <YAxis
                    yAxisId="ySoil2"
                    orientation="right"
                    tick={{ fontSize: 10, fill: '#06b6d4' }}
                    domain={[0, 100]}
                    tickFormatter={val => `${val}%`}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null;
                      const dataPoint = payload[0].payload;
                      return (
                        <div className="bg-panel-base/95 backdrop-blur-xl border border-panel-border p-3 rounded-xl shadow-2xl font-mono text-xs z-50 min-w-[200px]">
                          <p className="font-bold text-foreground mb-1.5 border-b border-panel-border/50 pb-1 flex items-center justify-between">
                            <span>{label}</span>
                            <span className="text-[10px] text-amber-400 font-normal">{dataPoint.time?.split('T')[1]?.slice(0, 8)}</span>
                          </p>
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-amber-400">
                              <span>CH2 Biopotencial:</span>
                              <span className="font-bold">{dataPoint.ch2_voltage_mv ? `${dataPoint.ch2_voltage_mv.toFixed(1)} mV` : '---'}</span>
                            </div>
                            <div className="flex justify-between items-center text-purple-400">
                              <span>CH2 Línea Base:</span>
                              <span className="font-bold">{dataPoint.ch2_baseline_mv ? `${dataPoint.ch2_baseline_mv.toFixed(1)} mV` : '---'}</span>
                            </div>
                            {(dataPoint.ch2_soil_moisture_pct !== undefined || dataPoint.soil_moisture_pct !== undefined) && (
                              <div className="flex justify-between items-center text-cyan-400">
                                <span>Humedad Maceta 2:</span>
                                <span className="font-bold">{dataPoint.ch2_soil_moisture_pct ?? dataPoint.soil_moisture_pct}%</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Line
                    yAxisId="yBio2"
                    type="monotone"
                    dataKey="ch2_voltage_mv"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    dot={false}
                    name="Canal 2 (A1) Biopotencial mV"
                    connectNulls
                    activeDot={{ r: 5, fill: '#f59e0b' }}
                  />
                  <Line
                    yAxisId="yBio2"
                    type="monotone"
                    dataKey="ch2_baseline_mv"
                    stroke="#a855f7"
                    strokeWidth={1.8}
                    strokeDasharray="4 4"
                    dot={false}
                    name="Línea Base CH2 (mV)"
                    connectNulls
                  />
                  <Line
                    yAxisId="ySoil2"
                    type="monotone"
                    dataKey="ch2_soil_moisture_pct"
                    stroke="#06b6d4"
                    strokeWidth={1.8}
                    dot={false}
                    name="Humedad Maceta 2 (%)"
                    connectNulls
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
