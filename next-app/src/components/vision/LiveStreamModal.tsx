'use client';
import React, { useState, useEffect } from 'react';
import { X, Play, Square, Camera, Maximize, Clock, ShieldCheck, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LiveStreamModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSnapshotTaken?: () => void;
}

export default function LiveStreamModal({ isOpen, onClose, onSnapshotTaken }: LiveStreamModalProps) {
    const [status, setStatus] = useState<'connecting' | 'streaming' | 'stopped' | 'error'>('connecting');
    const [timeLeft, setTimeLeft] = useState(300); // 5 minutos de streaming bajo demanda
    const [takingSnapshot, setTakingSnapshot] = useState(false);
    const [snapshotMsg, setSnapshotMsg] = useState('');

    const STREAM_WEBRTC_URL = 'http://109.199.99.126:8889/cultivo/';

    useEffect(() => {
        if (!isOpen) return;

        setStatus('connecting');
        setTimeLeft(300);

        // Solicitar a la Raspberry Pi que inicie la transmisión
        fetch('/api/vision/stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'start', duration: 300 })
        })
            .then(res => res.json())
            .then(() => {
                // Dar 2 segundos para que rpicam-vid conecte con MediaMTX
                setTimeout(() => setStatus('streaming'), 2000);
            })
            .catch(err => {
                console.error('Error al iniciar stream:', err);
                setStatus('error');
            });

        // Countdown timer
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    handleStop();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            clearInterval(timer);
        };
    }, [isOpen]);

    const handleStop = () => {
        setStatus('stopped');
        fetch('/api/vision/stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'stop' })
        }).catch(() => {});
        onClose();
    };

    const handleSnapshot = async () => {
        setTakingSnapshot(true);
        setSnapshotMsg('');
        try {
            await fetch('/api/vision/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'snapshot' })
            });
            setSnapshotMsg('📸 Captura solicitada. La IA la analizará en breve.');
            if (onSnapshotTaken) onSnapshotTaken();
            setTimeout(() => setSnapshotMsg(''), 4000);
        } catch (e) {
            setSnapshotMsg('Error al solicitar captura.');
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
                            <div className="flex flex-col items-center gap-3 text-zinc-400">
                                <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-sm font-medium">Iniciando streaming en la Raspberry Pi 4...</p>
                                <p className="text-xs text-zinc-500">Apertura de túnel WebRTC hacia Contabo VPS</p>
                            </div>
                        )}

                        {status === 'streaming' && (
                            <iframe
                                src={STREAM_WEBRTC_URL}
                                className="w-full h-full border-0"
                                allow="autoplay; fullscreen"
                                title="Cultivo Live Stream"
                            />
                        )}

                        {status === 'error' && (
                            <div className="flex flex-col items-center gap-2 text-amber-400">
                                <AlertCircle className="w-8 h-8" />
                                <p className="text-sm font-semibold">No se pudo conectar con el stream</p>
                                <p className="text-xs text-zinc-500">Verifica que la Raspberry Pi esté encendida y conectada a la red.</p>
                            </div>
                        )}

                        {snapshotMsg && (
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 text-xs rounded-lg shadow-lg">
                                {snapshotMsg}
                            </div>
                        )}
                    </div>

                    {/* Controls Footer */}
                    <div className="flex items-center justify-between px-6 py-4 bg-zinc-900/90 border-t border-zinc-800">
                        <div className="flex items-center gap-2 text-xs text-zinc-400">
                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
                            <span>Transmisión encriptada bajo demanda para optimizar ancho de banda</span>
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
