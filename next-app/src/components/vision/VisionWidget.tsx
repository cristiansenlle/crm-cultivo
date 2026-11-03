'use client';
import React, { useState, useEffect } from 'react';
import {
    Camera,
    Video,
    Activity,
    Sparkles,
    RefreshCw,
    ZoomIn,
    Clock,
    Leaf,
    TrendingUp,
    Scissors,
    Grid,
    Sun,
    Award,
    Layers
} from 'lucide-react';
import LiveStreamModal from './LiveStreamModal';

interface VisionStatusData {
    camera: {
        model: string;
        orientation: string;
        resolution: string;
        interval: string;
    };
    plant_grid?: any;
    latest_analysis: any;
    timeline: any[];
}

export default function VisionWidget() {
    const [data, setData] = useState<VisionStatusData | null>(null);
    const [loading, setLoading] = useState(true);
    const [isLiveStreamOpen, setIsLiveStreamOpen] = useState(false);
    const [isTriggeringCapture, setIsTriggeringCapture] = useState(false);
    const [captureFeedback, setCaptureFeedback] = useState('');
    const [isZoomed, setIsZoomed] = useState(false);

    const fetchData = async () => {
        try {
            const res = await fetch('/api/vision/status');
            if (res.ok) {
                const json = await res.json();
                setData(json);
            }
        } catch (e) {
            console.error('Error al cargar estado de visión:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleManualCapture = async () => {
        setIsTriggeringCapture(true);
        setCaptureFeedback('Enviando comando a la Raspberry Pi...');
        try {
            const res = await fetch('/api/vision/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'snapshot' })
            });
            if (res.ok) {
                setCaptureFeedback('📸 Foto capturada. Ejecutando análisis fenológico y por cuadrante...');
                setTimeout(() => {
                    fetchData();
                    setCaptureFeedback('');
                    setIsTriggeringCapture(false);
                }, 5500);
            } else {
                setCaptureFeedback('Error al solicitar captura.');
                setIsTriggeringCapture(false);
            }
        } catch (e) {
            setCaptureFeedback('Error de comunicación.');
            setIsTriggeringCapture(false);
        }
    };

    const latest = data?.latest_analysis;
    const snapshot = latest?.context_snapshot;
    const latestImg = latest?.image_urls?.[0] || '/captures/foto_prueba.jpg';

    const isCrop = latest?.crop_detected ?? snapshot?.crop_detected ?? (
        (latest?.health_score ?? 0) > 0 &&
        (snapshot?.canopy_coverage_pct ?? 0) > 0
    );

    const healthScore = isCrop ? (latest?.health_score ?? 0) : 0;
    const canopyCover = isCrop ? (latest?.canopy_coverage_pct ?? snapshot?.canopy_coverage_pct ?? 0) : 0;
    const growthDelta = isCrop ? (latest?.daily_growth_delta_pct ?? snapshot?.daily_growth_delta_pct ?? 0) : 0;
    const budSitesCount = isCrop ? (latest?.bud_sites_count ?? snapshot?.bud_sites_count ?? 0) : 0;
    const estimatedYield = isCrop ? (latest?.estimated_yield_grams ?? snapshot?.estimated_yield_grams ?? 0) : 0;
    const harvestReadiness = isCrop ? (latest?.harvest_readiness_pct ?? snapshot?.harvest_readiness_pct ?? 0) : 0;
    const leafPosture = isCrop ? (snapshot?.leaf_posture ?? 'TURGID') : 'NONE';
    const lightStress = isCrop ? (snapshot?.light_stress ?? 'OPTIMAL') : 'NONE';
    const photoperiodAudit = latest?.photoperiod_audit ?? snapshot?.photoperiod_audit ?? 'LIGHTS_ON_OK';
    const circadianState = isCrop ? (latest?.circadian_turgor_state ?? snapshot?.circadian_turgor_state ?? 'NORMAL_ASSIMILATION') : 'NONE';
    const stageDetected = isCrop ? (latest?.phenological_stage_detected ?? snapshot?.phenological_stage_detected ?? 'FLOWERING_MID') : 'NONE';
    const advisors = latest?.lifecycle_advisors || snapshot?.lifecycle_advisors || null;
    const perPlantList: any[] = isCrop ? (latest?.per_plant_analysis || snapshot?.per_plant_analysis || []) : [];

    const getPostureBadge = (posture: string) => {
        switch (posture) {
            case 'PRAYING':
                return { label: 'Hojas en Rezo (45°)', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
            case 'DROOPING':
                return { label: 'Hojas Decaídas', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
            case 'CLAWING':
                return { label: 'Hojas en Garra', color: 'bg-red-500/20 text-red-400 border-red-500/30' };
            case 'NONE':
                return { label: 'Sin Dosel Detectado', color: 'bg-zinc-800 text-zinc-400 border-zinc-700' };
            default:
                return { label: 'Turgencia Óptima', color: 'bg-teal-500/20 text-teal-400 border-teal-500/30' };
        }
    };

    const getStageLabel = (stage: string) => {
        const map: Record<string, string> = {
            SEEDLING: 'Plántula / Esqueje',
            VEGETATIVE_EARLY: 'Vegetativo Inicial',
            VEGETATIVE_SCROG: 'Vegetativo + Entrenamiento SCROG',
            PRE_FLOWER_STRETCH: 'Pre-Floración / Stretch (Sem 1-3)',
            FLOWERING_MID: 'Floración Plena / Engorde',
            RIPENING_SENESCENCE: 'Maduración & Senescencia',
            HARVEST_READY: 'Ventana Óptima de Corte',
            NONE: 'En espera de dosel'
        };
        return map[stage] || stage;
    };

    const postureInfo = getPostureBadge(leafPosture);
    const activeGridZonesCount = data?.plant_grid?.zones?.filter((z: any) => z.active)?.length || 6;

    return (
        <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-sm flex flex-col gap-5">
            {/* Header del Widget */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                        <Camera className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2 flex-wrap">
                            <span>Agente de Visión IA v2.0 — Dosel & Ciclo Completo</span>
                            <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                                {activeGridZonesCount} Plantas Mapeadas • 120° Wide
                            </span>
                        </h3>
                        <p className="text-xs text-zinc-400">
                            Etapa detectada: <strong className="text-emerald-400">{getStageLabel(stageDetected)}</strong> • Sony IMX708 HDR
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsLiveStreamOpen(true)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600/90 hover:bg-red-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-red-900/30 transition-all cursor-pointer"
                    >
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                        </span>
                        <span>Ver en Vivo</span>
                    </button>

                    <button
                        onClick={handleManualCapture}
                        disabled={isTriggeringCapture}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 text-xs font-medium rounded-xl border border-zinc-700 transition-colors cursor-pointer"
                        title="Capturar foto ahora"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isTriggeringCapture ? 'animate-spin' : ''}`} />
                        <span>{isTriggeringCapture ? 'Analizando...' : 'Capturar Ahora'}</span>
                    </button>
                </div>
            </div>

            {captureFeedback && (
                <div className="px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-600/40 text-emerald-300 text-xs text-center font-medium animate-pulse">
                    {captureFeedback}
                </div>
            )}

            {/* Layout Principal: Foto Cenital + Métricas Fenotípicas IA */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                {/* Columna Izquierda: Foto Cenital */}
                <div className="md:col-span-6 flex flex-col gap-2">
                    <div
                        className="relative w-full aspect-video rounded-xl overflow-hidden bg-black border border-zinc-800 group cursor-pointer"
                        onClick={() => setIsZoomed(!isZoomed)}
                    >
                        <img
                            src={latestImg}
                            alt="Dosel Cenital Cultivo"
                            className={`w-full h-full object-cover transition-transform duration-300 ${isZoomed ? 'scale-150' : 'group-hover:scale-105'}`}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 pointer-events-none" />

                        <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/65 backdrop-blur-md text-[10px] text-zinc-200 font-mono">
                            <Clock className="w-3 h-3 text-emerald-400" />
                            <span>{latest?.created_at ? new Date(latest.created_at).toLocaleTimeString() : 'En línea'}</span>
                            <span className="text-zinc-500">|</span>
                            <span className="text-emerald-400">{photoperiodAudit === 'LIGHT_LEAK_ALERT' ? '⚠️ Fuga Lumínica' : 'Fotoperíodo OK'}</span>
                        </div>

                        <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 rounded bg-black/60 backdrop-blur-md text-[10px] text-zinc-300">
                            <ZoomIn className="w-3 h-3 text-zinc-400" />
                            <span>{isZoomed ? 'Click para alejar' : 'Click para zoom 12MP'}</span>
                        </div>
                    </div>
                </div>

                {/* Columna Derecha: 4 Tarjetas de Métricas de Ciclo Completo + Diagnóstico */}
                <div className="md:col-span-6 flex flex-col justify-between gap-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-2 gap-2.5">
                        {/* 1. Score de Salud */}
                        <div className="p-3 bg-zinc-950/60 border border-zinc-800/80 rounded-xl flex flex-col justify-between">
                            <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                                Score de Salud
                            </span>
                            <div className="flex items-baseline gap-1 mt-1">
                                {isCrop ? (
                                    <>
                                        <span className="text-2xl font-black text-emerald-400">{healthScore}</span>
                                        <span className="text-xs text-zinc-500">/100</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="text-2xl font-black text-zinc-500">N/A</span>
                                        <span className="text-xs text-amber-400/80 font-medium">(Sin cultivo)</span>
                                    </>
                                )}
                            </div>
                            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-2">
                                <div
                                    className={`h-full ${isCrop ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-zinc-700'}`}
                                    style={{ width: `${isCrop ? healthScore : 0}%` }}
                                />
                            </div>
                        </div>

                        {/* 2. Cobertura Dosel & Tasa Diaria */}
                        <div className="p-3 bg-zinc-950/60 border border-zinc-800/80 rounded-xl flex flex-col justify-between">
                            <span className="text-[11px] text-zinc-400 flex items-center justify-between">
                                <span className="flex items-center gap-1">
                                    <Leaf className="w-3.5 h-3.5 text-teal-400" />
                                    Cobertura Dosel
                                </span>
                                {isCrop && (
                                    <span className="text-[10px] font-mono text-emerald-400">
                                        {growthDelta >= 0 ? `+${growthDelta}%` : `${growthDelta}%`}/día
                                    </span>
                                )}
                            </span>
                            <div className="flex items-baseline gap-1 mt-1">
                                <span className={`text-2xl font-black ${isCrop ? 'text-teal-300' : 'text-zinc-500'}`}>{canopyCover}%</span>
                                <span className="text-xs text-zinc-500">{isCrop ? 'malla SCROG' : 'dosel'}</span>
                            </div>
                            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-2">
                                <div
                                    className="h-full bg-gradient-to-r from-teal-500 to-emerald-400"
                                    style={{ width: `${canopyCover}%` }}
                                />
                            </div>
                        </div>

                        {/* 3. Conteo de Colas y Proyección de Cosecha */}
                        <div className="p-3 bg-zinc-950/60 border border-zinc-800/80 rounded-xl flex flex-col justify-between">
                            <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                                <Award className="w-3.5 h-3.5 text-purple-400" />
                                Colas & Proyección
                            </span>
                            <div className="flex items-baseline justify-between gap-1 mt-1">
                                <div>
                                    <span className={`text-xl font-black ${isCrop ? 'text-purple-300' : 'text-zinc-500'}`}>
                                        {isCrop ? budSitesCount : 0}
                                    </span>
                                    <span className="text-[11px] text-zinc-500 ml-1">colas</span>
                                </div>
                                <div className="text-right">
                                    <span className={`text-sm font-bold font-mono ${isCrop ? 'text-amber-300' : 'text-zinc-600'}`}>
                                        ~{isCrop ? estimatedYield : 0}g
                                    </span>
                                </div>
                            </div>
                            <span className="text-[10px] text-zinc-500 mt-1">
                                {isCrop ? 'Ápices expuestos al LED' : 'Pendiente de floración'}
                            </span>
                        </div>

                        {/* 4. Maduración Estigmática / Ventana de Corte */}
                        <div className="p-3 bg-zinc-950/60 border border-zinc-800/80 rounded-xl flex flex-col justify-between">
                            <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                                <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                                Madurez Floral
                            </span>
                            <div className="flex items-baseline gap-1 mt-1">
                                <span className={`text-xl font-black ${isCrop ? 'text-amber-300' : 'text-zinc-500'}`}>
                                    {isCrop ? `${harvestReadiness}%` : '0%'}
                                </span>
                                <span className="text-[11px] text-zinc-500">oxidación</span>
                            </div>
                            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-2">
                                <div
                                    className="h-full bg-gradient-to-r from-amber-500 to-orange-400"
                                    style={{ width: `${isCrop ? harvestReadiness : 0}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Insignias de Postura, Ritmo Circadiano y Estrés */}
                    <div className="flex flex-wrap items-center gap-2">
                        {isCrop ? (
                            <>
                                <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg border ${postureInfo.color}`}>
                                    {postureInfo.label}
                                </span>
                                <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-zinc-800/80 text-zinc-300 border border-zinc-700">
                                    LED: {lightStress === 'OPTIMAL' ? 'PPFD Óptimo' : lightStress}
                                </span>
                                <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                                    Circadiano: {circadianState === 'PEAK_PRAYING' ? 'Pico Asimilación' : circadianState === 'CIRCADIAN_ANTICIPATION_REST' ? 'Descanso Pre-Oscuridad' : 'Turgencia Estable'}
                                </span>
                            </>
                        ) : (
                            <>
                                <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-zinc-800/80 text-zinc-400 border border-zinc-700">
                                    Sin dosel vegetal
                                </span>
                                <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                    Cámara fuera de sala de cultivo
                                </span>
                            </>
                        )}
                    </div>

                    {/* Diagnóstico Breve */}
                    <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-xl text-xs text-zinc-300 leading-relaxed">
                        <div className="flex items-center gap-1.5 text-emerald-400 font-semibold mb-1">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Diagnóstico IA Agronómica</span>
                        </div>
                        <p className="line-clamp-3 text-[11px] text-zinc-300">
                            {latest?.recommendations?.split('\n')[0] ||
                                'El dosel muestra una turgencia óptima y vigor fotosintético saludable. Sin signos de plagas ni blanqueamiento lumínico.'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Asistentes de Ciclo Completo (SCROG, Deshoje, Flip 12/12 y Cosecha Escalonada) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-zinc-800/80">
                <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex flex-col gap-1">
                    <span className="text-[11px] font-bold text-cyan-400 flex items-center gap-1.5">
                        <Grid className="w-3.5 h-3.5" />
                        <span>Asistente SCROG & Paso a 12/12</span>
                    </span>
                    <p className="text-[11px] text-zinc-300 leading-relaxed">
                        {isCrop && advisors?.scrog_tucking_advice
                            ? `${advisors.scrog_tucking_advice} ${advisors.optimal_flip_advice || ''}`
                            : 'Evalúa casilleros libres de la malla SCROG y calcula el día exacto para pasar a 12/12 según biotipo.'}
                    </p>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex flex-col gap-1">
                    <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                        <Scissors className="w-3.5 h-3.5" />
                        <span>Mapa de Deshoje & Poda Apical</span>
                    </span>
                    <p className="text-[11px] text-zinc-300 leading-relaxed">
                        {isCrop && advisors?.defoliation_advice
                            ? `${advisors.defoliation_advice}`
                            : 'Detecta superposición de hojas abanico que bloquean aire o cogollos inferiores para deshoje selectivo.'}
                    </p>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex flex-col gap-1">
                    <span className="text-[11px] font-bold text-purple-400 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5" />
                        <span>Cosecha Escalonada Multigenética</span>
                    </span>
                    <p className="text-[11px] text-zinc-300 leading-relaxed">
                        {isCrop && advisors?.staggered_harvest_advice
                            ? advisors.staggered_harvest_advice
                            : 'Compara oxidación de pistilos y antocianinas entre genéticas para definir qué planta cortar primero.'}
                    </p>
                </div>
            </div>

            {/* Si hay resultados por planta individual, mostrarlos resumidos */}
            {isCrop && perPlantList.length > 0 && (
                <div className="pt-2 border-t border-zinc-800/80 flex flex-col gap-2.5">
                    <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                        <Leaf className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Estado en Vivo por Planta Individual Mapeada</span>
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                        {perPlantList.map((pl: any) => (
                            <div
                                key={pl.zone_id}
                                className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800 flex flex-col gap-1 text-[11px]"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold text-[10px]">
                                        {pl.zone_id}
                                    </span>
                                    <span className="font-mono font-bold text-emerald-400">
                                        {pl.health_score}/100
                                    </span>
                                </div>
                                <span className="font-bold text-zinc-200 truncate">{pl.plant_name}</span>
                                <span className="text-[10px] text-zinc-400 truncate">{pl.strain}</span>
                                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 pt-1 border-t border-zinc-800/80">
                                    <span>🌸 {pl.bud_count ?? 0} colas</span>
                                    <span className="text-amber-300">{pl.maturity_pct ?? 0}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Modal de Transmisión en Vivo WebRTC */}
            <LiveStreamModal
                isOpen={isLiveStreamOpen}
                onClose={() => setIsLiveStreamOpen(false)}
                onSnapshotTaken={fetchData}
            />
        </div>
    );
}
