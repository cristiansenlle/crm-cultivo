'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import VisionWidget from '@/components/vision/VisionWidget';
import { 
    Video, 
    History, 
    Sparkles, 
    Sliders, 
    Camera, 
    CheckCircle2, 
    Download, 
    RefreshCw, 
    Cpu, 
    Server, 
    X,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';

function VisionCenterContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const currentTab = searchParams.get('tab') || 'live';
    const [activeTab, setActiveTab] = useState<'live' | 'timelapse' | 'diagnostics' | 'settings'>(
        (currentTab as any) || 'live'
    );

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab && ['live', 'timelapse', 'diagnostics', 'settings'].includes(tab)) {
            setActiveTab(tab as any);
        }
    }, [searchParams]);

    const handleTabChange = (tab: 'live' | 'timelapse' | 'diagnostics' | 'settings') => {
        setActiveTab(tab);
        router.push(`/vision?tab=${tab}`, { scroll: false });
    };

    const [captures, setCaptures] = useState<any[]>([]);
    const [loadingCaptures, setLoadingCaptures] = useState(true);
    const [modalImageIndex, setModalImageIndex] = useState<number | null>(null);

    const [diagnostics, setDiagnostics] = useState<any[]>([]);
    const [loadingDiag, setLoadingDiag] = useState(true);

    const loadCaptures = () => {
        setLoadingCaptures(true);
        fetch('/api/vision/capture')
            .then(res => res.json())
            .then(data => {
                if (data.captures) {
                    setCaptures(data.captures);
                }
            })
            .catch(err => console.error('Error fetching captures:', err))
            .finally(() => setLoadingCaptures(false));
    };

    const loadDiagnostics = () => {
        setLoadingDiag(true);
        fetch('/api/vision/status')
            .then(res => res.json())
            .then(data => {
                if (data.timeline) {
                    setDiagnostics(data.timeline);
                }
            })
            .catch(err => console.error('Error fetching diagnostics:', err))
            .finally(() => setLoadingDiag(false));
    };

    useEffect(() => {
        loadCaptures();
        loadDiagnostics();
    }, []);

    const nextImage = () => {
        if (modalImageIndex !== null && modalImageIndex < captures.length - 1) {
            setModalImageIndex(modalImageIndex + 1);
        }
    };

    const prevImage = () => {
        if (modalImageIndex !== null && modalImageIndex > 0) {
            setModalImageIndex(modalImageIndex - 1);
        }
    };

    return (
        <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
            {/* Header del Centro de Visión */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-panel-border pb-5">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-foreground flex items-center gap-3">
                        <span>Centro de Visión IA & Streaming</span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono font-medium">
                            Sony IMX708 • 120° Cenital
                        </span>
                    </h1>
                    <p className="text-xs text-brand-slate-600 dark:text-slate-400 mt-1">
                        Monitoreo continuo de dosel vegetal, detección fenotípica automatizada y transmisión WebRTC en ultra-baja latencia.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-panel-base border border-panel-border text-xs font-mono text-emerald-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        RPi 4 ONLINE
                    </span>
                </div>
            </div>

            {/* Submenú de Navegación del Centro de Visión */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-panel-border">
                <button
                    onClick={() => handleTabChange('live')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all whitespace-nowrap ${
                        activeTab === 'live'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                            : 'text-brand-slate-600 dark:text-slate-400 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 border border-transparent'
                    }`}
                >
                    <Video className="w-4 h-4 text-red-400" />
                    <span>Cámara en Vivo & Dosel</span>
                </button>

                <button
                    onClick={() => handleTabChange('timelapse')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all whitespace-nowrap ${
                        activeTab === 'timelapse'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                            : 'text-brand-slate-600 dark:text-slate-400 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 border border-transparent'
                    }`}
                >
                    <History className="w-4 h-4 text-cyan-400" />
                    <span>Timelapse & Galería ({captures.length})</span>
                </button>

                <button
                    onClick={() => handleTabChange('diagnostics')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all whitespace-nowrap ${
                        activeTab === 'diagnostics'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                            : 'text-brand-slate-600 dark:text-slate-400 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 border border-transparent'
                    }`}
                >
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Diagnósticos Fitosanitarios IA</span>
                </button>

                <button
                    onClick={() => handleTabChange('settings')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all whitespace-nowrap ${
                        activeTab === 'settings'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                            : 'text-brand-slate-600 dark:text-slate-400 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 border border-transparent'
                    }`}
                >
                    <Sliders className="w-4 h-4 text-purple-400" />
                    <span>Configuración Centinela</span>
                </button>
            </div>

            {/* 1. Pestaña: En Vivo & Dosel */}
            {activeTab === 'live' && (
                <div className="flex flex-col gap-6">
                    <VisionWidget />

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="p-4 rounded-xl bg-panel-base border border-panel-border flex flex-col gap-1">
                            <span className="text-[11px] font-mono text-brand-slate-600 dark:text-slate-400 uppercase">Óptica y Sensor</span>
                            <span className="text-sm font-bold text-foreground">Sony IMX708 120° Wide</span>
                            <span className="text-xs text-emerald-400">Autofoco Continuo Activo</span>
                        </div>
                        <div className="p-4 rounded-xl bg-panel-base border border-panel-border flex flex-col gap-1">
                            <span className="text-[11px] font-mono text-brand-slate-600 dark:text-slate-400 uppercase">Streaming Engine</span>
                            <span className="text-sm font-bold text-foreground">WebRTC / WHEP MediaMTX</span>
                            <span className="text-xs text-emerald-400">Ultra-Baja Latencia (&lt;500ms)</span>
                        </div>
                        <div className="p-4 rounded-xl bg-panel-base border border-panel-border flex flex-col gap-1">
                            <span className="text-[11px] font-mono text-brand-slate-600 dark:text-slate-400 uppercase">Frecuencia de Captura</span>
                            <span className="text-sm font-bold text-foreground">1 Foto cada 1 Hora</span>
                            <span className="text-xs text-cyan-400">Durante fotoperíodo activo</span>
                        </div>
                        <div className="p-4 rounded-xl bg-panel-base border border-panel-border flex flex-col gap-1">
                            <span className="text-[11px] font-mono text-brand-slate-600 dark:text-slate-400 uppercase">Costo de Almacenamiento</span>
                            <span className="text-sm font-bold text-foreground">$0 USD (SSD VPS Contabo)</span>
                            <span className="text-xs text-purple-400">/var/www/captures/crop_vision/</span>
                        </div>
                    </div>
                </div>
            )}

            {/* 2. Pestaña: Timelapse & Galería */}
            {activeTab === 'timelapse' && (
                <div className="bg-panel-base border border-panel-border rounded-2xl p-6 flex flex-col gap-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-panel-border">
                        <div>
                            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                                <History className="w-5 h-5 text-cyan-400" />
                                <span>Galería Histórica de Capturas Cenitales</span>
                            </h2>
                            <p className="text-xs text-brand-slate-600 dark:text-slate-400">
                                Capturas horarias de alta resolución tomadas por el sensor Sony IMX708 en la Raspberry Pi 4.
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-mono text-brand-slate-600 dark:text-slate-400">
                                Total: {captures.length} capturas
                            </span>
                            <button
                                onClick={loadCaptures}
                                className="p-2 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-foreground transition-colors"
                                title="Recargar capturas"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {loadingCaptures ? (
                        <div className="py-16 text-center text-brand-slate-600 dark:text-slate-400 text-sm">
                            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-400" />
                            Cargando galería de capturas...
                        </div>
                    ) : captures.length === 0 ? (
                        <div className="py-16 text-center text-brand-slate-600 dark:text-slate-400 text-sm">
                            No hay fotos capturadas aún. El sensor toma 1 foto cada hora automáticamente o puedes disparar una en la pestaña "En Vivo".
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {captures.map((cap, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => setModalImageIndex(idx)}
                                    className="relative aspect-video rounded-xl overflow-hidden bg-black border border-panel-border cursor-pointer group hover:border-emerald-500/50 hover:ring-2 hover:ring-emerald-500/20 transition-all shadow-md"
                                >
                                    <img
                                        src={cap.url}
                                        alt={cap.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                        loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2.5">
                                        <span className="text-[11px] font-mono text-zinc-200 truncate">
                                            {new Date(cap.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                        </span>
                                        <span className="text-[10px] text-emerald-400 font-mono">
                                            12MP • HDR
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* 3. Pestaña: Diagnósticos IA */}
            {activeTab === 'diagnostics' && (
                <div className="bg-panel-base border border-panel-border rounded-2xl p-6 flex flex-col gap-6">
                    <div className="flex items-center justify-between pb-4 border-b border-panel-border">
                        <div>
                            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-amber-400" />
                                <span>Historial de Evaluaciones de Visión Multimodal</span>
                            </h2>
                            <p className="text-xs text-brand-slate-600 dark:text-slate-400">
                                Diagnósticos agronómicos generados por el modelo de visión al analizar el dosel vegetal.
                            </p>
                        </div>
                        <button
                            onClick={loadDiagnostics}
                            className="p-2 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-foreground transition-colors"
                            title="Recargar diagnósticos"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>

                    {loadingDiag ? (
                        <div className="py-16 text-center text-brand-slate-600 dark:text-slate-400 text-sm">
                            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-400" />
                            Cargando diagnósticos agronómicos...
                        </div>
                    ) : diagnostics.length === 0 ? (
                        <div className="py-16 text-center text-brand-slate-600 dark:text-slate-400 text-sm">
                            No hay diagnósticos guardados aún.
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {diagnostics.map((diag) => (
                                <div
                                    key={diag.id}
                                    className="p-4 rounded-xl bg-black/5 dark:bg-white/5 border border-panel-border flex flex-col md:flex-row gap-4 justify-between items-start md:items-center"
                                >
                                    <div className="flex items-center gap-4">
                                        {diag.image_url ? (
                                            <img
                                                src={diag.image_url}
                                                alt="Captura"
                                                className="w-20 h-14 rounded-lg object-cover bg-black border border-panel-border"
                                            />
                                        ) : (
                                            <div className="w-20 h-14 rounded-lg bg-black/20 flex items-center justify-center border border-panel-border">
                                                <Camera className="w-5 h-5 text-zinc-500" />
                                            </div>
                                        )}
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {diag.crop_detected !== false && (diag.health_score ?? 0) > 0 ? (
                                                    <>
                                                        <span className="font-bold text-sm text-foreground">
                                                            Salud: {diag.health_score}/100
                                                        </span>
                                                        <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                                                            Dosel: {diag.canopy_coverage}%
                                                        </span>
                                                        <span className="text-xs px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono">
                                                            Postura: {diag.leaf_posture}
                                                        </span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="font-bold text-sm text-zinc-500">
                                                            Salud: N/A
                                                        </span>
                                                        <span className="text-xs px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 border border-zinc-700 font-mono">
                                                            Dosel: 0%
                                                        </span>
                                                        <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/30 font-mono">
                                                            Sin cultivo en escena
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                            <p className="text-xs font-mono text-brand-slate-600 dark:text-slate-400 mt-1">
                                                {new Date(diag.timestamp).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-emerald-400 flex items-center gap-1 font-mono">
                                            <CheckCircle2 className="w-3.5 h-3.5" /> Persistido en Supabase
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* 4. Pestaña: Configuración Centinela */}
            {activeTab === 'settings' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 rounded-2xl bg-panel-base border border-panel-border flex flex-col gap-4">
                        <div className="flex items-center gap-3 pb-3 border-b border-panel-border">
                            <Cpu className="w-6 h-6 text-emerald-400" />
                            <div>
                                <h3 className="text-base font-bold text-foreground">Dispositivo Centinela Edge</h3>
                                <p className="text-xs text-brand-slate-600 dark:text-slate-400">Raspberry Pi 4 Model B (4GB)</p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2.5 text-xs">
                            <div className="flex justify-between py-1.5 border-b border-panel-border/50">
                                <span className="text-brand-slate-600 dark:text-slate-400">Dirección IP LAN</span>
                                <span className="font-mono text-foreground">192.168.0.133</span>
                            </div>
                            <div className="flex justify-between py-1.5 border-b border-panel-border/50">
                                <span className="text-brand-slate-600 dark:text-slate-400">Servicio de Monitoreo</span>
                                <span className="font-mono text-emerald-400">vision-sentinel.service (ACTIVE)</span>
                            </div>
                            <div className="flex justify-between py-1.5 border-b border-panel-border/50">
                                <span className="text-brand-slate-600 dark:text-slate-400">Sensor de Cámara</span>
                                <span className="font-mono text-foreground">Sony IMX708 (Camera Module 3 Wide)</span>
                            </div>
                            <div className="flex justify-between py-1.5 border-b border-panel-border/50">
                                <span className="text-brand-slate-600 dark:text-slate-400">Campo Visual (FOV)</span>
                                <span className="font-mono text-foreground">120° Gran Angular Cenital</span>
                            </div>
                            <div className="flex justify-between py-1.5">
                                <span className="text-brand-slate-600 dark:text-slate-400">Resolución de Captura</span>
                                <span className="font-mono text-foreground">2304x1296 (12MP) Autofoco HDR</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 rounded-2xl bg-panel-base border border-panel-border flex flex-col gap-4">
                        <div className="flex items-center gap-3 pb-3 border-b border-panel-border">
                            <Server className="w-6 h-6 text-cyan-400" />
                            <div>
                                <h3 className="text-base font-bold text-foreground">Infraestructura Cloud & Streaming</h3>
                                <p className="text-xs text-brand-slate-600 dark:text-slate-400">Contabo VPS (Alemania)</p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2.5 text-xs">
                            <div className="flex justify-between py-1.5 border-b border-panel-border/50">
                                <span className="text-brand-slate-600 dark:text-slate-400">MediaMTX (RTSP Gateway)</span>
                                <span className="font-mono text-foreground">Puerto 8554 (TCP)</span>
                            </div>
                            <div className="flex justify-between py-1.5 border-b border-panel-border/50">
                                <span className="text-brand-slate-600 dark:text-slate-400">WebRTC / WHEP Server</span>
                                <span className="font-mono text-foreground">Puerto 8889 (HTTP / ICE UDP)</span>
                            </div>
                            <div className="flex justify-between py-1.5 border-b border-panel-border/50">
                                <span className="text-brand-slate-600 dark:text-slate-400">Broker MQTT (Comandos)</span>
                                <span className="font-mono text-foreground">Puerto 1883 (cultivo/camera/...)</span>
                            </div>
                            <div className="flex justify-between py-1.5 border-b border-panel-border/50">
                                <span className="text-brand-slate-600 dark:text-slate-400">Ruta SSD de Capturas</span>
                                <span className="font-mono text-foreground">/var/www/captures/crop_vision/</span>
                            </div>
                            <div className="flex justify-between py-1.5">
                                <span className="text-brand-slate-600 dark:text-slate-400">Costo Adicional</span>
                                <span className="font-mono text-emerald-400 font-bold">$0.00 USD</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Imagen Pantalla Completa */}
            {modalImageIndex !== null && captures[modalImageIndex] && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                    <div className="relative max-w-5xl w-full flex flex-col gap-3">
                        <div className="flex items-center justify-between text-zinc-300 px-2">
                            <span className="text-xs font-mono">
                                {new Date(captures[modalImageIndex].created_at).toLocaleString()} • ({modalImageIndex + 1}/{captures.length})
                            </span>
                            <div className="flex items-center gap-2">
                                <a
                                    href={captures[modalImageIndex].url}
                                    download={captures[modalImageIndex].name}
                                    className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
                                    title="Descargar captura"
                                >
                                    <Download className="w-4 h-4" />
                                </a>
                                <button
                                    onClick={() => setModalImageIndex(null)}
                                    className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="relative aspect-video w-full bg-black rounded-2xl overflow-hidden border border-zinc-800 flex items-center justify-center shadow-2xl">
                            <img
                                src={captures[modalImageIndex].url}
                                alt="Captura ampliada"
                                className="w-full h-full object-contain"
                            />

                            {modalImageIndex > 0 && (
                                <button
                                    onClick={prevImage}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/10 transition-colors"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                            )}
                            {modalImageIndex < captures.length - 1 && (
                                <button
                                    onClick={nextImage}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/10 transition-colors"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function VisionPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-brand-slate-600 dark:text-slate-400">Cargando Centro de Visión...</div>}>
            <VisionCenterContent />
        </Suspense>
    );
}

