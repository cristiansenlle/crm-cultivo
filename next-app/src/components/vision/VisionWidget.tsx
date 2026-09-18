'use client';
import React, { useState, useEffect } from 'react';
import { Camera, Video, Activity, Sparkles, RefreshCw, ZoomIn, AlertTriangle, CheckCircle2, ChevronRight, Clock, Leaf } from 'lucide-react';
import LiveStreamModal from './LiveStreamModal';

interface VisionStatusData {
    camera: {
        model: string;
        orientation: string;
        resolution: string;
        interval: string;
    };
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
        const interval = setInterval(fetchData, 30000); // Actualizar cada 30s
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
                setCaptureFeedback('📸 Foto capturada. Procesando con IA...');
                setTimeout(() => {
                    fetchData();
                    setCaptureFeedback('');
                    setIsTriggeringCapture(false);
                }, 5000);
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

    // Comprobar si se detectó cultivo real o si la cámara está fuera de la sala
    const isCrop = latest?.crop_detected ?? snapshot?.crop_detected ?? (
        (latest?.health_score ?? 0) > 0 &&
        (snapshot?.canopy_coverage_pct ?? 0) > 0
    );

    const healthScore = isCrop ? (latest?.health_score ?? 0) : 0;
    const canopyCover = isCrop ? (snapshot?.canopy_coverage_pct ?? 0) : 0;
    const leafPosture = isCrop ? (snapshot?.leaf_posture ?? 'TURGID') : 'NONE';
    const lightStress = isCrop ? (snapshot?.light_stress ?? 'OPTIMAL') : 'NONE';

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

    const postureInfo = getPostureBadge(leafPosture);

    return (
        <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-sm flex flex-col gap-5">
            {/* Header del Widget */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                        <Camera className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                            Agente de Visión IA — Dosel Cenital
                            <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                                120° Wide • RPi 4
                            </span>
                        </h3>
                        <p className="text-xs text-zinc-400">
                            Sensor Sony IMX708 • Autofoco Dinámico • HDR
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
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 text-xs font-medium rounded-xl border border-zinc-700 transition-colors"
                        title="Capturar foto ahora"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isTriggeringCapture ? 'animate-spin' : ''}`} />
                        <span>{isTriggeringCapture ? 'Capturando...' : 'Capturar'}</span>
                    </button>
                </div>
            </div>

            {captureFeedback && (
                <div className="px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-600/40 text-emerald-300 text-xs text-center font-medium animate-pulse">
                    {captureFeedback}
                </div>
            )}

            {/* Layout Principal: Foto Cenital + Métricas de Visión */}
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

                        {/* Overlay info */}
                        <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded bg-black/60 backdrop-blur-md text-[10px] text-zinc-300 font-mono">
                            <Clock className="w-3 h-3 text-emerald-400" />
                            <span>{latest?.created_at ? new Date(latest.created_at).toLocaleTimeString() : 'En línea'}</span>
                        </div>

                        <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 rounded bg-black/60 backdrop-blur-md text-[10px] text-zinc-300">
                            <ZoomIn className="w-3 h-3 text-zinc-400" />
                            <span>{isZoomed ? 'Click para alejar' : 'Click para zoom'}</span>
                        </div>
                    </div>
                </div>

                {/* Columna Derecha: Métricas Fenotípicas IA */}
                <div className="md:col-span-6 flex flex-col justify-between gap-3">
                    {/* Score y Cobertura */}
                    <div className="grid grid-cols-2 gap-3">
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

                        <div className="p-3 bg-zinc-950/60 border border-zinc-800/80 rounded-xl flex flex-col justify-between">
                            <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                                <Leaf className="w-3.5 h-3.5 text-teal-400" />
                                Cobertura Dosel
                            </span>
                            <div className="flex items-baseline gap-1 mt-1">
                                <span className={`text-2xl font-black ${isCrop ? 'text-teal-300' : 'text-zinc-500'}`}>{canopyCover}%</span>
                                <span className="text-xs text-zinc-500">{isCrop ? 'malla' : 'dosel'}</span>
                            </div>
                            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-2">
                                <div
                                    className="h-full bg-gradient-to-r from-teal-500 to-emerald-400"
                                    style={{ width: `${canopyCover}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Insignias de Postura y Estrés */}
                    <div className="flex flex-wrap items-center gap-2">
                        {isCrop ? (
                            <>
                                <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg border ${postureInfo.color}`}>
                                    {postureInfo.label}
                                </span>
                                <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-zinc-800/80 text-zinc-300 border border-zinc-700">
                                    LED: {lightStress === 'OPTIMAL' ? 'PPFD Óptimo' : lightStress}
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

            {/* Modal de Transmisión en Vivo WebRTC */}
            <LiveStreamModal
                isOpen={isLiveStreamOpen}
                onClose={() => setIsLiveStreamOpen(false)}
                onSnapshotTaken={fetchData}
            />
        </div>
    );
}
