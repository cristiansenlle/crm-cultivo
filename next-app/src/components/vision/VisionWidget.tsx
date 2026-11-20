'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
    Layers,
    Wind,
    Play,
    Pause,
    ChevronLeft,
    ChevronRight,
    X,
    Maximize2
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
    shelly_link?: {
        linked_shelly_device_id: string;
        linked_shelly_name: string;
        is_on: boolean;
        online: boolean;
        temperature_c: number | null;
        last_event_at: string | null;
        only_capture_when_shelly_on: boolean;
        auto_capture_on_shelly_on: boolean;
        capture_enabled: boolean;
        captured_during_dark_cycle: boolean;
        available_shellys: {
            device_id: string;
            name: string;
            room: string;
            is_on: boolean;
            online: boolean;
            temperature_c: number | null;
            last_event_at: string | null;
        }[];
    };
    latest_image_url?: string | null;
    latest_disk_capture?: {
        url: string;
        name: string;
        captured_at: string;
    } | null;
    analysis_in_progress?: boolean;
    latest_analysis: any;
    spatial_microclimate?: {
        wind_exposure_zones: string[];
        optimal_light_zones: string[];
        peripheral_lagging_zones: string[];
        occupied_left_pct: number;
        occupied_right_pct: number;
        rotation_recommendation: string;
        tray_balance_advice: string;
        summary_badges: string[];
    } | null;
    fertilization_plan_live?: any;
    timeline: any[];
}

function getPlantCropMetrics(pl: any, padX = 1.6, padY = 2.0) {
    const x = Math.max(0, Math.min(90, Number(pl?.x_pct ?? 0)));
    const y = Math.max(0, Math.min(90, Number(pl?.y_pct ?? 0)));
    const w = Math.max(5, Math.min(90, Number(pl?.w_pct ?? 10)));
    const h = Math.max(5, Math.min(90, Number(pl?.h_pct ?? 14)));
    const vx = Math.max(0, x - padX);
    const vy = Math.max(0, y - padY);
    const vw = Math.min(100 - vx, w + padX * 2);
    const vh = Math.min(100 - vy, h + padY * 2);
    return { vx, vy, vw, vh, aspect: (16 * vw) / (9 * vh) };
}

function PlantCropImage({
    imgUrl,
    plant,
    alt,
    className = '',
    padX = 1.6,
    padY = 2.0
}: {
    imgUrl: string;
    plant: any;
    alt: string;
    className?: string;
    padX?: number;
    padY?: number;
}) {
    const { vx, vy, vw, vh, aspect } = getPlantCropMetrics(plant, padX, padY);
    return (
        <div
            className={`relative w-full overflow-hidden bg-black ${className}`}
            style={{ aspectRatio: String(aspect) }}
        >
            <img
                src={imgUrl}
                alt={alt}
                style={{
                    position: 'absolute',
                    width: `${(100 / vw) * 100}%`,
                    height: `${(100 / vh) * 100}%`,
                    left: `${-(vx / vw) * 100}%`,
                    top: `${-(vy / vh) * 100}%`,
                    maxWidth: 'none',
                    maxHeight: 'none',
                    objectFit: 'fill'
                }}
            />
        </div>
    );
}

export default function VisionWidget() {
    const [data, setData] = useState<VisionStatusData | null>(null);
    const [loading, setLoading] = useState(true);
    const [isLiveStreamOpen, setIsLiveStreamOpen] = useState(false);
    const [isTriggeringCapture, setIsTriggeringCapture] = useState(false);
    const [captureFeedback, setCaptureFeedback] = useState('');
    const [isZoomed, setIsZoomed] = useState(false);
    const [savingShellyLink, setSavingShellyLink] = useState(false);
    const [selectedPlantForModal, setSelectedPlantForModal] = useState<any | null>(null);
    const [modalViewMode, setModalViewMode] = useState<'zoom' | 'tent'>('zoom');
    const [timelapsePlaying, setTimelapsePlaying] = useState(false);
    const [timelapseIdx, setTimelapseIdx] = useState(0);

    const handleUpdateShellyLink = async (updates: {
        linked_shelly_device_id?: string;
        only_capture_when_shelly_on?: boolean;
        auto_capture_on_shelly_on?: boolean;
    }) => {
        setSavingShellyLink(true);
        try {
            const res = await fetch('/api/vision/grid', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'update_shelly_link',
                    ...updates
                })
            });
            if (res.ok) {
                await fetchData();
                setCaptureFeedback('✅ Vinculación de cámara con Shelly actualizada.');
                setTimeout(() => setCaptureFeedback(''), 3500);
            }
        } catch (e) {
            console.error('Error actualizando vinculación Shelly:', e);
        } finally {
            setSavingShellyLink(false);
        }
    };

    const pollCancelledRef = useRef(false);

    const fetchData = useCallback(async () => {
        try {
            const res = await fetch('/api/vision/status', { cache: 'no-store' });
            if (res.ok) {
                const json = await res.json();
                setData(json);
                return json as VisionStatusData;
            }
        } catch (e) {
            console.error('Error al cargar estado de visión:', e);
        } finally {
            setLoading(false);
        }
        return null;
    }, []);

    const pollUntilNewCaptureAndAnalysis = useCallback(async (
        prevDiskUrl: string | null,
        prevAnalysisId: string | null
    ) => {
        pollCancelledRef.current = false;
        let notifiedNewPhoto = false;
        setIsTriggeringCapture(true);

        for (let attempt = 0; attempt < 14; attempt++) {
            await new Promise(resolve => setTimeout(resolve, 2500));
            if (pollCancelledRef.current) return;

            const json = await fetchData();
            if (pollCancelledRef.current || !json) continue;

            const newDiskUrl = json.latest_disk_capture?.url || null;
            const newAnalysisId = json.latest_analysis?.id || null;

            if (!notifiedNewPhoto && newDiskUrl && newDiskUrl !== prevDiskUrl) {
                notifiedNewPhoto = true;
                setCaptureFeedback('📸 Nueva foto recibida en servidor. Analizando plantas con IA...');
                window.dispatchEvent(new CustomEvent('vision-capture-updated'));
            }

            if (newAnalysisId && newAnalysisId !== prevAnalysisId && !json.analysis_in_progress) {
                window.dispatchEvent(new CustomEvent('vision-capture-updated'));
                setCaptureFeedback('✅ Captura y diagnóstico actualizados');
                setIsTriggeringCapture(false);
                setTimeout(() => {
                    if (!pollCancelledRef.current) setCaptureFeedback('');
                }, 4000);
                return;
            }
        }

        if (!pollCancelledRef.current) {
            setIsTriggeringCapture(false);
            setCaptureFeedback(notifiedNewPhoto
                ? '📸 Foto actualizada. El análisis IA continúa procesándose en segundo plano.'
                : ''
            );
            if (notifiedNewPhoto) {
                setTimeout(() => {
                    if (!pollCancelledRef.current) setCaptureFeedback('');
                }, 4000);
            }
        }
    }, [fetchData]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000);
        const onGridUpdated = () => {
            fetchData();
        };
        window.addEventListener('vision-grid-updated', onGridUpdated);
        return () => {
            pollCancelledRef.current = true;
            clearInterval(interval);
            window.removeEventListener('vision-grid-updated', onGridUpdated);
        };
    }, [fetchData]);

    const latest = data?.latest_analysis;
    const snapshot = latest?.context_snapshot;
    const latestImg: string | null =
        data?.latest_image_url ||
        data?.latest_disk_capture?.url ||
        latest?.image_urls?.[0] ||
        latest?.image_url ||
        null;

    const handleManualCapture = async () => {
        pollCancelledRef.current = true;
        setIsTriggeringCapture(true);
        setCaptureFeedback('Enviando comando a la Raspberry Pi...');
        const prevDiskUrl = data?.latest_disk_capture?.url || latestImg;
        const prevAnalysisId = latest?.id || null;

        try {
            const res = await fetch('/api/vision/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'snapshot' })
            });
            if (res.ok) {
                setCaptureFeedback('📸 Comando enviado a la cámara. Esperando imagen desde la Carpa...');
                await pollUntilNewCaptureAndAnalysis(prevDiskUrl, prevAnalysisId);
            } else {
                const errJson = await res.json().catch(() => ({}));
                setCaptureFeedback(errJson.error || 'Error al solicitar captura.');
                setTimeout(() => setCaptureFeedback(''), 6000);
                setIsTriggeringCapture(false);
            }
        } catch (e) {
            setCaptureFeedback('Error de comunicación.');
            setIsTriggeringCapture(false);
        }
    };

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
    const isSeedlingOrVeg = ['SEEDLING', 'VEGETATIVE_EARLY', 'VEGETATIVE_SCROG'].includes(stageDetected);
    const advisors = latest?.lifecycle_advisors || snapshot?.lifecycle_advisors || null;
    const rawPerPlant: any[] = isCrop ? (latest?.per_plant_analysis || snapshot?.per_plant_analysis || []) : [];
    const activeZones: any[] = Array.isArray(data?.plant_grid?.zones)
        ? data.plant_grid.zones.filter((z: any) => z.active)
        : [];
    const targetFlipPct = data?.plant_grid?.target_flip_coverage_pct || 72;

    const perPlantList: any[] = isCrop
        ? (activeZones.length > 0
              ? activeZones.map((z: any) => {
                    const match = rawPerPlant.find(
                        (p: any) => p && String(p.zone_id).toUpperCase() === String(z.zone_id).toUpperCase()
                    );
                    const pinMatch = typeof z.soil_sensor_pin === 'string' ? z.soil_sensor_pin.match(/Pin\s*(\d+)/i) : null;
                    const sensorShort = pinMatch ? `💧 Pin ${pinMatch[1]}` : '👁️ Visual IA';
                    return {
                        zone_id: z.zone_id,
                        plant_name: z.plant_name || match?.plant_name || `Planta ${z.zone_id}`,
                        strain: z.strain || match?.strain || 'Sin especificar',
                        health_score: match?.health_score ?? healthScore ?? 78,
                        canopy_share_pct: match?.canopy_share_pct ?? 8,
                        bud_count: isSeedlingOrVeg ? 0 : (match?.bud_count ?? 0),
                        maturity_pct: isSeedlingOrVeg ? 0 : (match?.maturity_pct ?? 0),
                        specific_diagnosis: match?.specific_diagnosis || `En seguimiento activo (${z.strain})`,
                        sensor_short: sensorShort,
                        presence_status: z.presence_status || match?.presence_status || 'PRESENT',
                        dome_detected: match?.dome_detected ?? false,
                        dome_status: match?.dome_status || 'NONE',
                        visual_substrate_moisture: match?.visual_substrate_moisture || 'UNKNOWN',
                        relative_growth_vs_batch: match?.relative_growth_vs_batch || 'AVERAGE',
                        lagging_alert: match?.lagging_alert || null,
                        x_pct: z.x_pct ?? match?.x_pct ?? 0,
                        y_pct: z.y_pct ?? match?.y_pct ?? 0,
                        w_pct: z.w_pct ?? match?.w_pct ?? 10,
                        h_pct: z.h_pct ?? match?.h_pct ?? 14,
                        soil_moisture_pct: match?.soil_moisture_pct ?? null,
                        soil_sensor_audit: match?.soil_sensor_audit || 'VISUAL_ONLY',
                        soil_audit_message: match?.soil_audit_message || null,
                        growth_delta_24h_pct: match?.growth_delta_24h_pct ?? null,
                        growth_delta_72h_pct: match?.growth_delta_72h_pct ?? null,
                        health_delta_24h: match?.health_delta_24h ?? null,
                        growth_velocity_status: match?.growth_velocity_status || 'STEADY_GROWTH',
                        stalled_alert: match?.stalled_alert || null,
                        next_milestone: match?.next_milestone,
                        milestone_badge: match?.milestone_badge,
                        milestone_detail: match?.milestone_detail,
                        lst_vector_direction: match?.lst_vector_direction || null
                    };
                })
              : rawPerPlant)
        : [];
    const fertLive = data?.fertilization_plan_live || null;
    const fertCorrelation = fertLive?.correlation || latest?.fertilization_plan_correlation || snapshot?.fertilization_plan_correlation || null;
    const shellyLink = data?.shelly_link || null;
    const wasCapturedInDark = Boolean(data && (shellyLink?.captured_during_dark_cycle || photoperiodAudit === 'DARK_CYCLE_OK'));
    const spatialMicroclimate = data?.spatial_microclimate || snapshot?.spatial_microclimate || null;

    const timelineFrames = React.useMemo(() => {
        const base = (data?.timeline || [])
            .filter((t: any) => typeof t?.image_url === 'string' && t.image_url.length > 0)
            .map((t: any) => ({
                timestamp: t.timestamp,
                image_url: t.image_url,
                per_plant_analysis: Array.isArray(t.per_plant_analysis) ? t.per_plant_analysis : []
            }));
        if (latestImg && (base.length === 0 || base[base.length - 1].image_url !== latestImg)) {
            base.push({
                timestamp: data?.latest_disk_capture?.captured_at || latest?.created_at || new Date().toISOString(),
                image_url: latestImg,
                per_plant_analysis: perPlantList
            });
        }
        return base;
    }, [data?.timeline, latestImg, data?.latest_disk_capture?.captured_at, latest?.created_at, perPlantList]);

    useEffect(() => {
        if (!timelapsePlaying || !selectedPlantForModal || timelineFrames.length <= 1) return;
        const timer = setInterval(() => {
            setTimelapseIdx(prev => (prev + 1) % timelineFrames.length);
        }, 750);
        return () => clearInterval(timer);
    }, [timelapsePlaying, selectedPlantForModal, timelineFrames.length]);

    const openPlantZoomModal = (pl: any) => {
        setSelectedPlantForModal(pl);
        setModalViewMode('zoom');
        setTimelapsePlaying(false);
        setTimelapseIdx(Math.max(0, timelineFrames.length - 1));
    };

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
    const activeGridZonesCount = data?.plant_grid?.zones?.filter((z: any) => z.active)?.length ?? null;

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
                                {activeGridZonesCount !== null ? `${activeGridZonesCount} Plantas Mapeadas • 120° Wide` : 'Sincronizando Mapa • 120° Wide'}
                            </span>
                        </h3>
                        <p className="text-xs text-zinc-400">
                            Etapa detectada:{' '}
                            <strong className="text-emerald-400">
                                {loading && !data ? 'Sincronizando telemetría...' : getStageLabel(stageDetected)}
                            </strong>{' '}
                            • Sony IMX708 HDR
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

            {/* Barra de Vinculación Fotoperíodo Shelly <-> Cámara */}
            {shellyLink && (
                <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/90 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-200">
                            <Sun className={`w-4 h-4 ${shellyLink.is_on ? 'text-amber-400 animate-pulse' : 'text-zinc-500'}`} />
                            <span>Shelly Vinculado a Cámara:</span>
                        </div>

                        <select
                            value={shellyLink.linked_shelly_device_id}
                            disabled={savingShellyLink}
                            onChange={(e) => handleUpdateShellyLink({ linked_shelly_device_id: e.target.value })}
                            className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs font-mono text-zinc-100 focus:outline-none focus:border-emerald-500 cursor-pointer"
                        >
                            {(shellyLink.available_shellys || []).map((sh) => (
                                <option key={sh.device_id} value={sh.device_id}>
                                    {sh.name} — {sh.is_on ? '🟢 ENCENDIDO' : '🔴 APAGADO'}{sh.online ? ' (Online)' : ''}
                                </option>
                            ))}
                        </select>

                        <span
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border ${
                                shellyLink.is_on
                                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                                    : 'bg-rose-500/15 text-rose-300 border-rose-500/40'
                            }`}
                        >
                            {shellyLink.is_on
                                ? `💡 LUZ ENCENDIDA${shellyLink.temperature_c ? ` • ${shellyLink.temperature_c}°C` : ''} • Captura Habilitada`
                                : '🌙 LUZ APAGADA • Cámara en Pausa Nocturna'}
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-300">
                        <label className="flex items-center gap-1.5 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={shellyLink.only_capture_when_shelly_on}
                                disabled={savingShellyLink}
                                onChange={(e) => handleUpdateShellyLink({ only_capture_when_shelly_on: e.target.checked })}
                                className="accent-emerald-500 rounded cursor-pointer"
                            />
                            <span>Solo capturar con Shelly ON</span>
                        </label>

                        <label className="flex items-center gap-1.5 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={shellyLink.auto_capture_on_shelly_on}
                                disabled={savingShellyLink}
                                onChange={(e) => handleUpdateShellyLink({ auto_capture_on_shelly_on: e.target.checked })}
                                className="accent-emerald-500 rounded cursor-pointer"
                            />
                            <span>Auto-capturar al encender Shelly</span>
                        </label>
                    </div>
                </div>
            )}

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
                        className="relative w-full aspect-video rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800 group cursor-pointer flex items-center justify-center"
                        onClick={() => latestImg && setIsZoomed(!isZoomed)}
                    >
                        {latestImg ? (
                            <>
                                <img
                                    src={latestImg}
                                    alt="Dosel Cenital Cultivo"
                                    className={`w-full h-full object-cover transition-transform duration-300 ${isZoomed ? 'scale-150' : 'group-hover:scale-105'}`}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 pointer-events-none" />

                                <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md text-[10px] text-zinc-200 font-mono border border-white/10">
                                    <Clock className="w-3 h-3 text-emerald-400" />
                                    <span>{data?.analysis_in_progress && data?.latest_disk_capture?.captured_at ? new Date(data.latest_disk_capture.captured_at).toLocaleTimeString() : (latest?.created_at ? new Date(latest.created_at).toLocaleTimeString() : 'En línea')}</span>
                                    {data?.analysis_in_progress && (
                                        <span className="text-cyan-300 font-semibold animate-pulse">• 🤖 Analizando IA...</span>
                                    )}
                                    <span className="text-zinc-500">|</span>
                                    {wasCapturedInDark ? (
                                        <span className="text-amber-400 font-semibold">
                                            🌙 Capturada con Shelly APAGADO{shellyLink?.is_on ? ' (Shelly actual: ON)' : ''}
                                        </span>
                                    ) : (
                                        <span className="text-emerald-400">
                                            {photoperiodAudit === 'LIGHT_LEAK_ALERT' ? '⚠️ Fuga Lumínica' : '☀️ Shelly ON • Fotoperíodo OK'}
                                        </span>
                                    )}
                                </div>

                                <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 rounded bg-black/60 backdrop-blur-md text-[10px] text-zinc-300">
                                    <ZoomIn className="w-3 h-3 text-zinc-400" />
                                    <span>{isZoomed ? 'Click para alejar' : 'Click para zoom 12MP'}</span>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-2 text-zinc-400 p-6 text-center">
                                <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin" />
                                <span className="text-xs font-mono text-zinc-300">
                                    {loading ? 'Cargando última captura cenital 12MP...' : 'Aguardando primera captura cenital...'}
                                </span>
                            </div>
                        )}
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

                        {/* 3. Conteo de Plantas Mapeadas (Veg/Plántula) o Colas & Proyección (Flora) */}
                        <div className="p-3 bg-zinc-950/60 border border-zinc-800/80 rounded-xl flex flex-col justify-between">
                            {isCrop && isSeedlingOrVeg ? (
                                <>
                                    <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                                        <Layers className="w-3.5 h-3.5 text-emerald-400" />
                                        Plantas Mapeadas
                                    </span>
                                    <div className="flex items-baseline justify-between gap-1 mt-1">
                                        <div>
                                            <span className="text-xl font-black text-emerald-300">
                                                {activeZones.length || perPlantList.length}
                                            </span>
                                            <span className="text-[11px] text-zinc-500 ml-1">ejemplares</span>
                                        </div>
                                        <span className="text-[10px] font-mono text-cyan-300">
                                            100% activas
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-zinc-500 mt-1">
                                        Seguimiento fenológico individual
                                    </span>
                                </>
                            ) : (
                                <>
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
                                </>
                            )}
                        </div>

                        {/* 4. Progreso hacia Meta SCROG 12/12 (Veg/Plántula) o Madurez Floral (Flora) */}
                        <div className="p-3 bg-zinc-950/60 border border-zinc-800/80 rounded-xl flex flex-col justify-between">
                            {isCrop && isSeedlingOrVeg ? (
                                <>
                                    <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                                        <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                                        Progreso hacia 12/12
                                    </span>
                                    <div className="flex items-baseline justify-between gap-1 mt-1">
                                        <div>
                                            <span className="text-xl font-black text-cyan-300">
                                                {canopyCover}%
                                            </span>
                                            <span className="text-[11px] text-zinc-500 ml-1">/ {targetFlipPct}%</span>
                                        </div>
                                        <span className="text-[10px] font-mono text-zinc-400">
                                            Meta SCROG
                                        </span>
                                    </div>
                                    <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-2">
                                        <div
                                            className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400"
                                            style={{ width: `${Math.min(100, Math.round((canopyCover / Math.max(1, targetFlipPct)) * 100))}%` }}
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
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
                                </>
                            )}
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

            {/* Panel de Correlación Visión IA × Plan de Fertilización Semanal & Fotoperíodo (>24h) */}
            {fertLive && fertLive.active_week && (
                <div className={`p-3.5 rounded-xl border flex flex-col gap-2.5 ${
                    fertCorrelation?.status === 'OVERFEEDING_ALERT' || fertCorrelation?.status === 'PH_LOCKOUT_WARNING'
                        ? 'bg-red-950/20 border-red-500/35'
                        : fertCorrelation?.status === 'UNDERFEEDING_DEFICIENCY' || fertCorrelation?.status === 'PHOTOPERIOD_STRETCH_HOLD'
                        ? 'bg-amber-950/20 border-amber-500/35'
                        : 'bg-emerald-950/20 border-emerald-500/30'
                }`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold uppercase">
                                🧪 Plan Semanal × Visión IA
                            </span>
                            <span className="text-xs font-bold text-zinc-100">
                                Lote {fertLive.batch_id}: {fertLive.active_week.label} ({fertLive.active_week.phenology})
                            </span>
                            {fertLive.is_extended_photoperiod && (
                                <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/35 text-[10px] font-mono font-bold">
                                    ☀️ Fotoperíodo Extendido {fertLive.light_hours}L/{fertLive.dark_hours}O ({fertLive.cycle_total_hours}h) • {fertLive.biological_cycles_completed} ciclos bio vs {fertLive.calendar_days_in_stage}d cal
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-mono">
                            <span className="px-2 py-0.5 rounded bg-black/40 border border-zinc-700 text-cyan-300">
                                pH Obj: {fertLive.active_week.target_ph_min}-{fertLive.active_week.target_ph_max}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-black/40 border border-zinc-700 text-amber-300">
                                EC Obj: {fertLive.active_week.target_ec_min}-{fertLive.active_week.target_ec_max} mS/cm
                            </span>
                            <span className="px-2 py-0.5 rounded bg-black/40 border border-zinc-700 text-purple-300">
                                PPM 500: {fertLive.active_week.target_ppm_min}-{fertLive.active_week.target_ppm_max}
                            </span>
                        </div>
                    </div>

                    {fertCorrelation && (
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center text-[11px]">
                            <div className="md:col-span-8 text-zinc-200 leading-relaxed">
                                <strong className={
                                    fertCorrelation.status === 'OVERFEEDING_ALERT' || fertCorrelation.status === 'PH_LOCKOUT_WARNING'
                                        ? 'text-red-400'
                                        : fertCorrelation.status === 'UNDERFEEDING_DEFICIENCY' || fertCorrelation.status === 'PHOTOPERIOD_STRETCH_HOLD'
                                        ? 'text-amber-400'
                                        : 'text-emerald-400'
                                }>
                                    {fertCorrelation.headline || fertCorrelation.badgeLabel}:
                                </strong>{' '}
                                {fertCorrelation.explanation}
                            </div>
                            <div className="md:col-span-4 p-2 rounded-lg bg-black/40 border border-zinc-800 flex flex-col gap-1 font-mono text-[10px]">
                                <div className="flex justify-between">
                                    <span className="text-zinc-400">Dosis recomendada IA:</span>
                                    <strong className="text-emerald-400">{Math.round((fertCorrelation.doseMultiplier || 1) * 100)}% del plan</strong>
                                </div>
                                <div className="text-zinc-300 truncate" title={fertCorrelation.recommendedActionLabel}>
                                    👉 {fertCorrelation.recommendedActionLabel}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

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

            {/* Mapa de Microclima Espacial y Recomendación de Rotación de Macetas */}
            {isCrop && spatialMicroclimate && (
                <div className="p-3.5 rounded-xl bg-sky-950/20 border border-sky-500/30 flex flex-col gap-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                            <Wind className="w-4 h-4 text-sky-400" />
                            <span>Microclima Espacial & Rotación de Macetas</span>
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                            {(spatialMicroclimate.summary_badges || []).map((b: string, i: number) => (
                                <span
                                    key={i}
                                    className="px-2 py-0.5 rounded bg-black/40 border border-sky-500/25 text-sky-200"
                                >
                                    {b}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-zinc-200">
                        <div className="p-2 rounded-lg bg-black/30 border border-zinc-800/80">
                            {spatialMicroclimate.rotation_recommendation}
                        </div>
                        <div className="p-2 rounded-lg bg-black/30 border border-zinc-800/80">
                            {spatialMicroclimate.tray_balance_advice}
                        </div>
                    </div>
                </div>
            )}

            {/* Si hay resultados por planta individual, mostrarlos resumidos y sincronizados con el mapa */}
            {isCrop && perPlantList.length > 0 && (
                <div className="pt-2 border-t border-zinc-800/80 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center flex-wrap gap-2">
                            <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                                <Leaf className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Estado en Vivo por Planta Individual Mapeada ({perPlantList.length} activas)</span>
                            </span>
                            {(() => {
                                const ahead = perPlantList.filter(p => p.relative_growth_vs_batch === 'AHEAD').length;
                                const lagging = perPlantList.filter(p => p.relative_growth_vs_batch === 'LAGGING').length;
                                const domed = perPlantList.filter(p => p.dome_detected).length;
                                return (
                                    <div className="flex items-center gap-1.5 text-[10px] font-mono">
                                        {ahead > 0 && (
                                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                                🚀 {ahead} +vigor
                                            </span>
                                        )}
                                        {lagging > 0 && (
                                            <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30">
                                                ⚠️ {lagging} rezagada(s)
                                            </span>
                                        )}
                                        {domed > 0 && (
                                            <span className="px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
                                                🫧 {domed} con domo
                                            </span>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                        <span className="text-[11px] font-mono text-zinc-400">
                            Etapa actual: <strong className="text-emerald-400">{getStageLabel(stageDetected)}</strong>
                        </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2.5">
                        {perPlantList.map((pl: any) => (
                            <div
                                key={pl.zone_id}
                                className="p-2.5 rounded-xl bg-zinc-950/85 border border-zinc-800/90 hover:border-emerald-500/45 transition-colors flex flex-col justify-between gap-1.5 text-[11px]"
                                title={pl.specific_diagnosis || ''}
                            >
                                <div className="flex flex-col gap-1">
                                    {/* Recorte Zoom HD 12MP de esta planta */}
                                    {latestImg && pl.w_pct > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => openPlantZoomModal(pl)}
                                            className="relative group/crop w-full rounded-lg overflow-hidden border border-zinc-800 hover:border-emerald-400/60 transition-all cursor-pointer"
                                            title="Abrir Zoom HD 12MP y Mini Time-Lapse de esta planta"
                                        >
                                            <PlantCropImage
                                                imgUrl={latestImg}
                                                plant={pl}
                                                alt={`Recorte HD ${pl.zone_id}`}
                                                className="group-hover/crop:scale-105 transition-transform duration-300"
                                            />
                                            <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/75 text-[9px] font-mono text-emerald-300 border border-white/10 opacity-90 group-hover/crop:opacity-100">
                                                🔍 Zoom HD
                                            </span>
                                        </button>
                                    )}

                                    <div className="flex items-center justify-between mt-0.5">
                                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold text-[10px]">
                                            {pl.zone_id}
                                        </span>
                                        <span className="font-mono font-bold text-emerald-400">
                                            {pl.health_score}/100
                                        </span>
                                    </div>
                                    <span className="font-bold text-zinc-100 truncate">
                                        {pl.plant_name}
                                    </span>
                                    <span className="text-[10px] text-emerald-300/90 font-medium truncate">
                                        {pl.strain}
                                    </span>

                                    <div className="flex flex-wrap items-center gap-1 mt-0.5">
                                        {pl.milestone_badge && (
                                            <span
                                                className={`px-1.5 py-0.5 rounded text-[9px] font-mono border ${
                                                    pl.next_milestone === 'REMOVE_DOME_SOON'
                                                        ? 'bg-amber-500/20 text-amber-200 border-amber-500/40'
                                                        : 'bg-teal-500/15 text-teal-200 border-teal-500/35'
                                                }`}
                                                title={pl.milestone_detail || ''}
                                            >
                                                {pl.milestone_badge}
                                            </span>
                                        )}
                                        {pl.growth_delta_24h_pct !== null && pl.growth_delta_24h_pct !== undefined && (
                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono border ${
                                                pl.growth_velocity_status === 'STALLED_ALERT'
                                                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/35'
                                                    : pl.growth_velocity_status === 'FAST_EXPANSION'
                                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/35'
                                                    : 'bg-zinc-800/80 text-zinc-300 border-zinc-700'
                                            }`}>
                                                {pl.growth_velocity_status === 'STALLED_ALERT'
                                                    ? '⏸️ Meseta'
                                                    : `📈 ${pl.growth_delta_24h_pct > 0 ? '+' : ''}${pl.growth_delta_24h_pct}%/24h`}
                                            </span>
                                        )}
                                        {pl.relative_growth_vs_batch === 'AHEAD' && (
                                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/35">
                                                🚀 +Vigor
                                            </span>
                                        )}
                                        {pl.relative_growth_vs_batch === 'LAGGING' && (
                                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/35">
                                                ⚠️ Rezagada
                                            </span>
                                        )}
                                        {pl.soil_sensor_audit && pl.soil_sensor_audit !== 'SENSOR_OK' && pl.soil_sensor_audit !== 'VISUAL_ONLY' && (
                                            <span
                                                className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-amber-500/20 text-amber-200 border border-amber-500/40"
                                                title={pl.soil_audit_message || ''}
                                            >
                                                {pl.soil_sensor_audit === 'MISPLACED_OR_AIR_POCKET'
                                                    ? '⚠️ Pin flojo'
                                                    : pl.soil_sensor_audit === 'OVERWATERING_RISK'
                                                    ? '🚨 Sobrerriego'
                                                    : '💧 Sustrato seco'}
                                            </span>
                                        )}
                                        {pl.visual_substrate_moisture && pl.visual_substrate_moisture !== 'UNKNOWN' && (
                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono border ${
                                                pl.visual_substrate_moisture === 'DRY_SURFACE'
                                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/35'
                                                    : pl.visual_substrate_moisture === 'WET'
                                                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/35'
                                                    : 'bg-zinc-800/90 text-emerald-300 border-zinc-700'
                                            }`}>
                                                {pl.visual_substrate_moisture === 'DRY_SURFACE'
                                                    ? '🏜️ Seco'
                                                    : pl.visual_substrate_moisture === 'WET'
                                                    ? '💧 Saturado'
                                                    : '🟫 Sustrato OK'}
                                            </span>
                                        )}
                                        {pl.presence_status === 'MOVED' && (
                                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                                                📍 Ajustada
                                            </span>
                                        )}
                                    </div>

                                    {pl.specific_diagnosis && (
                                        <p className="text-[10px] text-zinc-400 line-clamp-2 leading-tight mt-0.5">
                                            {pl.specific_diagnosis}
                                        </p>
                                    )}
                                    {pl.lst_vector_direction && (
                                        <p className="text-[9px] text-sky-300/90 font-mono truncate" title={pl.lst_vector_direction}>
                                            {pl.lst_vector_direction}
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 pt-1.5 border-t border-zinc-800/80">
                                    {isSeedlingOrVeg || (pl.bud_count ?? 0) === 0 ? (
                                        <>
                                            <span className="text-cyan-300 truncate">
                                                {pl.sensor_short || '👁️ Visual IA'}
                                                {typeof pl.soil_moisture_pct === 'number' ? ` (${pl.soil_moisture_pct}%)` : ''}
                                            </span>
                                            <span className="text-emerald-300">🌿 {pl.canopy_share_pct ?? 4}%</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>🌸 {pl.bud_count ?? 0} colas</span>
                                            <span className="text-amber-300">{pl.maturity_pct ?? 0}%</span>
                                        </>
                                    )}
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
                onSnapshotTaken={() => pollUntilNewCaptureAndAnalysis(data?.latest_disk_capture?.url || latestImg, latest?.id || null)}
            />

            {/* Modal Zoom HD 12MP & Mini Time-Lapse Individual por Planta */}
            {selectedPlantForModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
                    <div className="relative w-full max-w-3xl bg-zinc-950 border border-emerald-500/35 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between px-5 py-3.5 bg-zinc-900/90 border-b border-zinc-800">
                            <div className="flex items-center gap-2.5">
                                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold text-xs">
                                    {selectedPlantForModal.zone_id}
                                </span>
                                <div>
                                    <h4 className="text-sm font-bold text-zinc-100">
                                        {selectedPlantForModal.plant_name} • {selectedPlantForModal.strain}
                                    </h4>
                                    <p className="text-[11px] text-zinc-400">
                                        Zoom HD 12MP y Evolución Individual ({timelineFrames.length} fotogramas)
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setModalViewMode(modalViewMode === 'zoom' ? 'tent' : 'zoom')}
                                    className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center gap-1 cursor-pointer"
                                >
                                    <Maximize2 className="w-3.5 h-3.5" />
                                    <span>{modalViewMode === 'zoom' ? 'Ver Carpa Completa' : 'Zoom HD Maceta'}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setTimelapsePlaying(false);
                                        setSelectedPlantForModal(null);
                                    }}
                                    className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {(() => {
                            const frame = timelineFrames[Math.min(timelapseIdx, Math.max(0, timelineFrames.length - 1))] || {
                                timestamp: new Date().toISOString(),
                                image_url: latestImg,
                                per_plant_analysis: []
                            };
                            const framePlant = (frame.per_plant_analysis || []).find(
                                (p: any) => String(p.zone_id).toUpperCase() === String(selectedPlantForModal.zone_id).toUpperCase()
                            );
                            const frameUrl = frame.image_url || latestImg;
                            return (
                                <>
                                    <div className="relative bg-black flex items-center justify-center max-h-[55vh] overflow-hidden">
                                        {frameUrl && modalViewMode === 'zoom' ? (
                                            <PlantCropImage
                                                imgUrl={frameUrl}
                                                plant={selectedPlantForModal}
                                                alt={`Zoom ${selectedPlantForModal.zone_id}`}
                                                className="max-h-[55vh]"
                                                padX={2.5}
                                                padY={3.0}
                                            />
                                        ) : frameUrl ? (
                                            <div className="relative w-full aspect-video">
                                                <img src={frameUrl} alt="Carpa completa" className="w-full h-full object-contain" />
                                                <div
                                                    style={{
                                                        left: `${selectedPlantForModal.x_pct ?? 0}%`,
                                                        top: `${selectedPlantForModal.y_pct ?? 0}%`,
                                                        width: `${selectedPlantForModal.w_pct ?? 10}%`,
                                                        height: `${selectedPlantForModal.h_pct ?? 14}%`
                                                    }}
                                                    className="absolute border-2 border-emerald-400 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] pointer-events-none"
                                                />
                                            </div>
                                        ) : null}

                                        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/80 border border-white/10 text-[11px] font-mono text-zinc-200 flex items-center gap-2">
                                            <span>{new Date(frame.timestamp).toLocaleString('es-AR')}</span>
                                            {framePlant && (
                                                <span className="text-emerald-300 font-bold">
                                                    • {framePlant.health_score}/100 ({framePlant.canopy_share_pct ?? 3}%)
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Controles Mini Time-Lapse */}
                                    <div className="px-5 py-3 bg-zinc-900/80 border-t border-zinc-800 flex flex-col gap-3">
                                        <div className="flex items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setTimelapseIdx(i => Math.max(0, i - 1))}
                                                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 cursor-pointer"
                                            >
                                                <ChevronLeft className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setTimelapsePlaying(!timelapsePlaying)}
                                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                                            >
                                                {timelapsePlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                                                <span>{timelapsePlaying ? 'Pausar' : 'Reproducir Time-Lapse'}</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setTimelapseIdx(i => Math.min(Math.max(0, timelineFrames.length - 1), i + 1))}
                                                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 cursor-pointer"
                                            >
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                            <input
                                                type="range"
                                                min={0}
                                                max={Math.max(0, timelineFrames.length - 1)}
                                                value={Math.min(timelapseIdx, Math.max(0, timelineFrames.length - 1))}
                                                onChange={e => {
                                                    setTimelapsePlaying(false);
                                                    setTimelapseIdx(Number(e.target.value));
                                                }}
                                                className="flex-1 accent-emerald-500 cursor-pointer"
                                            />
                                            <span className="text-[11px] font-mono text-zinc-400">
                                                {timelineFrames.length > 0 ? `${timelapseIdx + 1}/${timelineFrames.length}` : '1/1'}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-zinc-300">
                                            <div className="p-2 rounded-lg bg-zinc-950/90 border border-zinc-800 flex flex-col gap-1">
                                                <span><strong>Próximo hito:</strong> {selectedPlantForModal.milestone_badge || '-'} — {selectedPlantForModal.milestone_detail || ''}</span>
                                                {selectedPlantForModal.lst_vector_direction && (
                                                    <span className="text-sky-300 font-mono">{selectedPlantForModal.lst_vector_direction}</span>
                                                )}
                                            </div>
                                            <div className="p-2 rounded-lg bg-zinc-950/90 border border-zinc-800 flex flex-col gap-1">
                                                <span><strong>Suelo ESP32 × Visión:</strong> {selectedPlantForModal.soil_audit_message || (typeof selectedPlantForModal.soil_moisture_pct === 'number' ? `Sonda en ${selectedPlantForModal.soil_moisture_pct}% coherente con sustrato visual.` : 'Monitoreo visual por IA.')}</span>
                                                {selectedPlantForModal.stalled_alert && (
                                                    <span className="text-rose-300">{selectedPlantForModal.stalled_alert}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </div>
            )}
        </div>
    );
}
