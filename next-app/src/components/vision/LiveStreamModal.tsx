'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Square, Camera, Clock, ShieldCheck, AlertCircle, RefreshCw, Power } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LiveStreamModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSnapshotTaken?: () => void;
}

interface CameraStatusInfo {
    rpi_online?: boolean;
    last_heartbeat_at?: string | null;
    streaming?: boolean;
    cpu_temp?: number | null;
    last_event?: string | null;
}

const DEFAULT_STREAM_DURATION_SEC = 240;
const STREAM_WEBRTC_URL = 'http://109.199.99.126:8889/cultivo/';
const POLL_INTERVAL_MS = 1500;
const MAX_POLL_ATTEMPTS = 8;

export default function LiveStreamModal({ isOpen, onClose, onSnapshotTaken }: LiveStreamModalProps) {
    const [status, setStatus] = useState<'connecting' | 'streaming' | 'capturing' | 'stopped' | 'error'>('connecting');
    const [timeLeft, setTimeLeft] = useState(DEFAULT_STREAM_DURATION_SEC);
    const [takingSnapshot, setTakingSnapshot] = useState(false);
    const [snapshotMsg, setSnapshotMsg] = useState('');
    const [rpiOnline, setRpiOnline] = useState<boolean | null>(null);
    const [cameraStatus, setCameraStatus] = useState<CameraStatusInfo | null>(null);
    const [streamUrl, setStreamUrl] = useState(STREAM_WEBRTC_URL);
    const [restartingCamera, setRestartingCamera] = useState(false);

    const stoppedSentRef = useRef(false);
    const cancelledRef = useRef(false);
    const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;
    const onSnapshotTakenRef = useRef(onSnapshotTaken);
    onSnapshotTakenRef.current = onSnapshotTaken;

    const sendStopSignal = useCallback((reason = 'modal_close') => {
        if (stoppedSentRef.current) return;
        stoppedSentRef.current = true;
        fetch('/api/vision/stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'stop', reason }),
            keepalive: true
        }).catch(() => {});
    }, []);

    const clearPollTimeout = () => {
        if (pollTimeoutRef.current) {
            clearTimeout(pollTimeoutRef.current);
            pollTimeoutRef.current = null;
        }
    };

    const startStreamSession = useCallback(async () => {
        clearPollTimeout();
        cancelledRef.current = false;
        stoppedSentRef.current = false;
        setStatus('connecting');
        setTimeLeft(DEFAULT_STREAM_DURATION_SEC);

        try {
            const startRes = await fetch('/api/vision/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'start', duration: DEFAULT_STREAM_DURATION_SEC })
            });
            if (cancelledRef.current) return;

            const startData = await startRes.json();
            if (startData.webrtc_url) setStreamUrl(startData.webrtc_url);
            if (typeof startData.rpi_online === 'boolean') setRpiOnline(startData.rpi_online);
            if (startData.camera_status) setCameraStatus(startData.camera_status);

            if (startData.ready === true) {
                setRpiOnline(true);
                setStatus('streaming');
                return;
            }

            let attempts = 0;
            const pollReady = async () => {
                if (cancelledRef.current) return;
                attempts++;
                try {
                    const checkRes = await fetch('/api/vision/stream', { cache: 'no-store' });
                    if (cancelledRef.current) return;
                    const checkData = await checkRes.json();

                    if (checkData.webrtc_url) setStreamUrl(checkData.webrtc_url);
                    if (typeof checkData.rpi_online === 'boolean') setRpiOnline(checkData.rpi_online);
                    if (checkData.camera_status) setCameraStatus(checkData.camera_status);

                    if (checkData.ready === true) {
                        setRpiOnline(true);
                        setStatus('streaming');
                        return;
                    }
                } catch {
                    // Continuar reintentos hasta completar ventana de espera
                }

                if (cancelledRef.current) return;
                if (attempts < MAX_POLL_ATTEMPTS) {
                    pollTimeoutRef.current = setTimeout(pollReady, POLL_INTERVAL_MS);
                } else {
                    setStatus('error');
                }
            };

            pollTimeoutRef.current = setTimeout(pollReady, POLL_INTERVAL_MS);
        } catch (err) {
            console.error('Error al iniciar stream:', err);
            if (!cancelledRef.current) {
                setStatus('error');
            }
        }
    }, []);

    const handleStop = useCallback(() => {
        cancelledRef.current = true;
        clearPollTimeout();
        setStatus('stopped');
        sendStopSignal('user_stop');
        onCloseRef.current();
    }, [sendStopSignal]);

    useEffect(() => {
        if (!isOpen) return;

        startStreamSession();

        const handlePageLeave = () => {
            sendStopSignal('page_unload');
        };
        window.addEventListener('beforeunload', handlePageLeave);
        window.addEventListener('pagehide', handlePageLeave);

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleStop();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            cancelledRef.current = true;
            clearPollTimeout();
            clearInterval(timer);
            window.removeEventListener('beforeunload', handlePageLeave);
            window.removeEventListener('pagehide', handlePageLeave);
            sendStopSignal('modal_unmount');
        };
    }, [isOpen, startStreamSession, handleStop, sendStopSignal]);

    const handleRestartCamera = async () => {
        setRestartingCamera(true);
        setSnapshotMsg('🔄 Enviando reinicio remoto a vision-sentinel (RPi)...');
        try {
            const res = await fetch('/api/vision/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'restart_camera' })
            });
            if (res.ok) {
                setSnapshotMsg('✅ Reinicio solicitado por MQTT. Esperando 8s antes de reconectar...');
                await new Promise(resolve => setTimeout(resolve, 8000));
                if (!cancelledRef.current) {
                    setSnapshotMsg('');
                    startStreamSession();
                }
            } else {
                setSnapshotMsg('⚠️ No se pudo enviar el comando de reinicio.');
            }
        } catch {
            setSnapshotMsg('⚠️ Error de red al solicitar reinicio remoto.');
        } finally {
            setRestartingCamera(false);
        }
    };

    const handleSnapshot = async () => {
        setTakingSnapshot(true);
        setStatus('capturing');
        setSnapshotMsg('📸 Pausando stream de forma segura y disparando foto 12MP...');
        clearPollTimeout();

        try {
            const res = await fetch('/api/vision/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'snapshot' })
            });
            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                setSnapshotMsg(data.error || 'No se pudo disparar la captura.');
                setTimeout(() => setSnapshotMsg(''), 5000);
                await startStreamSession();
                return;
            }

            setSnapshotMsg('📸 Captura 12MP solicitada. Reanudando stream en vivo...');
            onSnapshotTakenRef.current?.();
            await new Promise(resolve => setTimeout(resolve, 5000));
            if (!cancelledRef.current) {
                setTimeout(() => setSnapshotMsg(''), 3000);
                await startStreamSession();
            }
        } catch {
            setSnapshotMsg('Error al solicitar captura.');
            if (!cancelledRef.current) {
                await startStreamSession();
            }
        } finally {
            setTakingSnapshot(false);
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative w-full max-w-4xl bg-zinc-950 border border-emerald-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 bg-zinc-900/80 border-b border-zinc-800">
                        <div className="flex items-center gap-3">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </span>
                            <div>
                                <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                                    Cámara Cenital 120° — Transmisión en Vivo
                                </h3>
                                <p className="text-xs text-zinc-400">Sony IMX708 Autofocus • WebRTC Ultra-Baja Latencia</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800/80 border border-zinc-700 text-xs font-mono text-emerald-400">
                                <Clock className="w-3.5 h-3.5" />
                                <span>{formatTime(timeLeft)}</span>
                            </div>
                            <button
                                onClick={handleStop}
                                className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-xl transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Video Player Area */}
                    <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden">
                        {status === 'connecting' && (
                            <div className="flex flex-col items-center gap-3 text-zinc-400 px-6 text-center">
                                <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-sm font-medium">Iniciando streaming en la Raspberry Pi 4...</p>
                                <p className="text-xs text-zinc-500">Verificando señal RTSP/WebRTC activa en MediaMTX (Contabo VPS)</p>
                            </div>
                        )}

                        {status === 'capturing' && (
                            <div className="flex flex-col items-center gap-3 text-emerald-300 px-6 text-center">
                                <div className="w-10 h-10 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-sm font-medium">Pausando stream de forma segura y disparando foto 12MP...</p>
                                <p className="text-xs text-zinc-400">El video en vivo se reanudará automáticamente al completar la captura</p>
                            </div>
                        )}

                        {status === 'streaming' && (
                            <iframe
                                src={streamUrl}
                                className="w-full h-full border-0"
                                allow="autoplay; fullscreen"
                                title="Cultivo Live Stream"
                            />
                        )}

                        {status === 'error' && (
                            <div className="flex flex-col items-center gap-3 text-amber-400 px-6 text-center max-w-lg">
                                <AlertCircle className="w-9 h-9" />
                                <p className="text-sm font-semibold">
                                    {rpiOnline === false
                                        ? 'El servicio de cámara en la Raspberry Pi no responde'
                                        : 'No se pudo recibir señal de video en MediaMTX'}
                                </p>
                                <p className="text-xs text-zinc-400 leading-relaxed">
                                    {rpiOnline === false
                                        ? 'vision-sentinel no está reportando latidos MQTT (posible bloqueo de cámara tras una sesión previa). Probá reiniciar el servicio remotamente o desconectar y reconectar la alimentación de la Raspberry Pi.'
                                        : 'La Raspberry Pi está en línea en MQTT, pero rpicam-vid demoró en abrir el canal RTSP hacia Contabo.'}
                                </p>
                                {cameraStatus?.last_heartbeat_at && (
                                    <p className="text-[11px] text-zinc-500 font-mono">
                                        Último latido RPi: {new Date(cameraStatus.last_heartbeat_at).toLocaleString('es-AR')}
                                    </p>
                                )}
                                <div className="flex flex-wrap items-center justify-center gap-2.5 mt-1">
                                    <button
                                        onClick={startStreamSession}
                                        disabled={restartingCamera}
                                        className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors"
                                    >
                                        <RefreshCw className="w-3.5 h-3.5" />
                                        <span>Reintentar Stream</span>
                                    </button>
                                    {rpiOnline === false && (
                                        <button
                                            onClick={handleRestartCamera}
                                            disabled={restartingCamera}
                                            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600/90 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors"
                                        >
                                            <Power className="w-3.5 h-3.5" />
                                            <span>{restartingCamera ? 'Reiniciando...' : 'Reiniciar Cámara (RPi)'}</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {snapshotMsg && (
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 text-xs rounded-lg shadow-lg text-center">
                                {snapshotMsg}
                            </div>
                        )}
                    </div>

                    {/* Controls Footer */}
                    <div className="flex items-center justify-between px-6 py-4 bg-zinc-900/90 border-t border-zinc-800">
                        <div className="flex items-center gap-2 text-xs text-zinc-400">
                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
                            <span>Transmisión encriptada bajo demanda con protección anti-bloqueo</span>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleSnapshot}
                                disabled={takingSnapshot || status !== 'streaming'}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all shadow-lg shadow-emerald-900/30"
                            >
                                <Camera className="w-4 h-4" />
                                <span>{takingSnapshot ? 'Disparando...' : 'Tomar Foto y Analizar'}</span>
                            </button>

                            <button
                                onClick={handleStop}
                                className="flex items-center gap-1.5 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-xl transition-colors"
                            >
                                <Square className="w-3.5 h-3.5 fill-current" />
                                <span>Finalizar Stream</span>
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
