'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, Upload, Activity, Leaf, CheckCircle2, AlertTriangle, CloudRain, Wind, Thermometer, MapPin, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

export default function AiAnalyzerModal({ onClose }: { onClose: () => void }) {
    const [step, setStep] = useState(1);
    const [rooms, setRooms] = useState<any[]>([]);
    const [batches, setBatches] = useState<any[]>([]);
    
    const [selectedRoomId, setSelectedRoomId] = useState('');
    const [selectedBatchId, setSelectedBatchId] = useState('');
    const [images, setImages] = useState<string[]>([]);
    
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [errorMsg, setErrorMsg] = useState('');
    
    // Geolocalización
    const [location, setLocation] = useState<{lat: number, lon: number} | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Cargar salas al iniciar
        supabase.from('core_rooms').select('id, name').then(({data}: {data: any}) => {
            if (data) setRooms(data);
        });

        // Intentar obtener geolocalización
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition((pos) => {
                setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
            }, () => {
                console.log("Geolocalización no permitida o no disponible");
            });
        }
    }, []);

    useEffect(() => {
        if (selectedRoomId) {
            supabase.from('core_batches').select('id, strain').eq('location', selectedRoomId).then(({data}) => {
                if (data) setBatches(data);
            });
        }
    }, [selectedRoomId]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const filesArray = Array.from(e.target.files);
            
            filesArray.forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setImages(prev => [...prev, reader.result as string]);
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const removeImage = (index: number) => {
        setImages(images.filter((_, i) => i !== index));
    };

    const handleAnalyze = async () => {
        if (!selectedBatchId) {
            setErrorMsg("Debes seleccionar un lote.");
            return;
        }
        if (images.length === 0) {
            setErrorMsg("Debes subir al menos una imagen.");
            return;
        }
        
        setErrorMsg('');
        setIsAnalyzing(true);
        setStep(3); // Pantalla de carga
        
        try {
            const res = await fetch('/api/analyze-crop', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    images: images,
                    batchId: selectedBatchId,
                    lat: location?.lat,
                    lon: location?.lon
                })
            });
            
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al analizar');
            
            setResult(data);
            setStep(4); // Resultados
        } catch (e: any) {
            setErrorMsg(e.message);
            setStep(2);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleCreateAction = async (action: any, status: 'completed' | 'pending') => {
        try {
            if (action.type === 'agronomic_event') {
                const payload = {
                    batch_id: selectedBatchId,
                    date_occurred: new Date().toISOString(),
                    event_type: action.event_type || 'Observation',
                    description: action.description || 'Sugerencia de IA aplicada',
                    water_liters: action.water_liters || 0,
                    ph_water: action.ph_water || null,
                    total_cost: 0,
                    status: status
                };
                
                const { error } = await supabase.from('core_agronomic_events').insert([payload]);
                if (error) throw error;
                alert(status === 'completed' ? "✅ Evento registrado en la bitácora!" : "📅 Tarea agendada para el futuro!");
            }
        } catch(e: any) {
            alert("Error al guardar acción: " + e.message);
        }
    };

    const currentRoom = rooms.find(r => r.id === selectedRoomId);
    const currentBatch = batches.find(b => b.id === selectedBatchId);

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-xl sm:p-4 overflow-hidden">
            {/* Contenedor móvil optimizado para iPhone 17 Pro Max */}
            <div className="flex-1 w-full max-w-md mx-auto bg-panel-base sm:rounded-3xl sm:border border-panel-border overflow-y-auto flex flex-col relative shadow-2xl">
                
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-panel-base/90 backdrop-blur border-b border-panel-border">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-emerald-400">
                        <Leaf className="text-emerald-500" /> Analizador IA
                    </h2>
                    <button onClick={onClose} className="p-2 bg-white/5 rounded-full hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-6">
                    
                    {errorMsg && (
                        <div className="p-3 bg-red-900/40 border border-red-500/50 rounded-xl text-red-200 text-sm flex items-start gap-2">
                            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                            <p>{errorMsg}</p>
                        </div>
                    )}

                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="flex flex-col gap-5 h-full">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-100 mb-1">Selecciona el Cultivo</h3>
                                    <p className="text-sm text-gray-400">¿Qué planta vamos a analizar hoy?</p>
                                </div>
                                
                                <div className="space-y-4 flex-1">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Sala / Carpa</label>
                                        <select 
                                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none"
                                            value={selectedRoomId}
                                            onChange={(e) => { setSelectedRoomId(e.target.value); setSelectedBatchId(''); }}
                                        >
                                            <option value="">-- Seleccionar --</option>
                                            {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                        </select>
                                    </div>
                                    
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Lote / Genética</label>
                                        <select 
                                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none disabled:opacity-50"
                                            value={selectedBatchId}
                                            onChange={(e) => setSelectedBatchId(e.target.value)}
                                            disabled={!selectedRoomId}
                                        >
                                            <option value="">-- Seleccionar --</option>
                                            {batches.map(b => <option key={b.id} value={b.id}>{b.id} ({b.strain || 'Genética Desconocida'})</option>)}
                                        </select>
                                    </div>
                                </div>
                                
                                <button 
                                    disabled={!selectedBatchId}
                                    onClick={() => setStep(2)}
                                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-emerald-900/50 mt-auto"
                                >
                                    Siguiente Paso
                                </button>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div key="step2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="flex flex-col gap-5 h-full">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-100 mb-1">Captura de Imágenes</h3>
                                    <p className="text-sm text-gray-400 mb-3">La IA necesita ver bien a tus niñas. 📸 Sugerimos:</p>
                                    <ul className="text-sm text-emerald-300 space-y-1.5 bg-emerald-950/30 p-3 rounded-xl border border-emerald-900/50">
                                        <li>• 1 foto general de la estructura.</li>
                                        <li>• 1 foto de cerca de hojas sospechosas o ápices.</li>
                                        <li>• Evita luces HPS muy amarillas si es posible.</li>
                                    </ul>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mt-2">
                                    {images.map((img, i) => (
                                        <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border border-white/10 group">
                                            <img src={img} alt="Preview" className="w-full h-full object-cover" />
                                            <button onClick={() => removeImage(i)} className="absolute top-2 right-2 bg-red-500/80 p-1.5 rounded-full text-white backdrop-blur shadow-lg">
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    
                                    {images.length < 4 && (
                                        <button onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-2xl border-2 border-dashed border-white/20 bg-white/5 hover:bg-white/10 hover:border-emerald-500/50 flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-emerald-400 transition-colors">
                                            <Camera size={32} strokeWidth={1.5} />
                                            <span className="text-sm font-medium">Añadir Foto</span>
                                        </button>
                                    )}
                                </div>
                                <input type="file" accept="image/*" multiple className="hidden" ref={fileInputRef} onChange={handleFileChange} />

                                {location ? (
                                    <p className="text-xs text-blue-400 flex items-center gap-1 justify-center mt-2">
                                        <MapPin size={12}/> Clima exterior será analizado
                                    </p>
                                ) : (
                                    <p className="text-xs text-yellow-500/70 text-center mt-2">Geolocalización inactiva. No se analizará el clima exterior.</p>
                                )}

                                <div className="flex gap-3 mt-auto pt-4">
                                    <button onClick={() => setStep(1)} className="px-6 py-4 bg-white/5 text-gray-300 font-bold rounded-2xl border border-white/10">
                                        Atrás
                                    </button>
                                    <button 
                                        onClick={handleAnalyze} 
                                        disabled={images.length === 0}
                                        className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white font-bold rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2"
                                    >
                                        <Activity size={20}/> ¡Analizar Ahora!
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div key="step3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-full gap-6">
                                <div className="relative">
                                    <div className="absolute inset-0 blur-xl bg-emerald-500/30 rounded-full animate-pulse"></div>
                                    <div className="bg-panel-base border-2 border-emerald-500/50 p-6 rounded-full relative z-10 animate-spin-slow">
                                        <Loader2 size={48} className="text-emerald-400 animate-spin" />
                                    </div>
                                </div>
                                <div className="text-center space-y-2">
                                    <h3 className="text-xl font-bold text-white">Gemini está analizando...</h3>
                                    <p className="text-gray-400 text-sm max-w-[250px]">Cruzando telemetría de sensores, bitácora reciente e imágenes.</p>
                                </div>
                            </motion.div>
                        )}

                        {step === 4 && result && (
                            <motion.div key="step4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-5">
                                
                                {/* Location Header */}
                                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center justify-between shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-brand-slate-800 p-2 rounded-xl">
                                            <MapPin size={20} className="text-brand-primary" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400 uppercase tracking-widest">{currentRoom?.name || 'Sala'}</p>
                                            <p className="text-sm font-bold text-white">{currentBatch?.id || 'Lote'}</p>
                                        </div>
                                    </div>
                                    <Leaf size={24} className="text-emerald-500/50" />
                                </div>

                                {/* Score */}
                                <div className="bg-gradient-to-br from-gray-900 to-black border border-white/10 p-5 rounded-3xl flex items-center justify-between shadow-xl">
                                    <div>
                                        <p className="text-sm text-gray-400 font-medium mb-1">Índice de Salud</p>
                                        <div className="flex items-end gap-1">
                                            <span className={`text-4xl font-black ${result.health_score > 80 ? 'text-emerald-400' : result.health_score > 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                                                {result.health_score}
                                            </span>
                                            <span className="text-gray-500 font-medium pb-1">/100</span>
                                        </div>
                                    </div>
                                    <div className={`p-4 rounded-full ${result.health_score > 80 ? 'bg-emerald-500/20 text-emerald-400' : result.health_score > 50 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                                        {result.health_score > 80 ? <CheckCircle2 size={32} /> : <AlertTriangle size={32} />}
                                    </div>
                                </div>

                                {/* Diagnóstico */}
                                <div className="bg-white/5 border border-white/10 p-5 rounded-3xl">
                                    <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wide mb-3 flex items-center gap-2">
                                        <Activity size={16} className="text-blue-400" /> Diagnóstico Integral
                                    </h4>
                                    <p className="text-gray-200 text-[15px] leading-relaxed">{result.diagnosis}</p>
                                </div>

                                {/* Problemas Detectados */}
                                {result.issues_detected?.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-bold text-red-300 uppercase tracking-wide mb-3 pl-1">Problemas Detectados</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {result.issues_detected.map((iss: string, idx: number) => (
                                                <span key={idx} className="bg-red-500/10 border border-red-500/30 text-red-300 px-3 py-1.5 rounded-xl text-sm font-medium">
                                                    {iss}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Recomendaciones */}
                                <div className="bg-emerald-900/10 border border-emerald-500/20 p-5 rounded-3xl">
                                    <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-wide mb-2">Recomendaciones</h4>
                                    <p className="text-emerald-100 text-sm leading-relaxed">{result.recommendations}</p>
                                </div>

                                {/* Acciones Automáticas */}
                                {result.suggested_actions?.length > 0 && (
                                    <div className="mt-2">
                                        <h4 className="text-sm font-bold text-yellow-400 uppercase tracking-wide mb-3 pl-1 flex items-center gap-2">
                                            ⚡ Acciones Sugeridas
                                        </h4>
                                        <div className="space-y-3">
                                            {result.suggested_actions.map((act: any, idx: number) => (
                                                <div key={idx} className="bg-black/50 border border-yellow-500/30 p-4 rounded-2xl flex flex-col gap-3">
                                                    <div className="flex-1">
                                                        <p className="text-gray-200 font-medium text-sm">{act.description}</p>
                                                        <p className="text-gray-500 text-xs mt-1 font-mono">{act.event_type}</p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => handleCreateAction(act, 'completed')} className="flex-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-bold px-3 py-2.5 rounded-xl transition-colors">
                                                            ✓ Ya lo hice
                                                        </button>
                                                        <button onClick={() => handleCreateAction(act, 'pending')} className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white text-xs font-bold px-3 py-2.5 rounded-xl transition-colors">
                                                            📅 Agendar Tarea
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <button onClick={() => setStep(1)} className="w-full py-4 mt-4 bg-white/5 text-gray-300 font-bold rounded-2xl border border-white/10">
                                    Nuevo Análisis
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                </div>
            </div>
        </div>
    );
}
