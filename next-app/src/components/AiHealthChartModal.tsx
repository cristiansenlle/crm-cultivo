'use client';
import React, { useState, useEffect } from 'react';
import { X, Activity, Leaf, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export function AiHealthChartModal({ batch, onClose }: { batch: any; onClose: () => void }) {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('core_image_analyses')
                .select('health_score, created_at, recommendations, issues_detected')
                .eq('batch_id', batch.id)
                .order('created_at', { ascending: true });
                
            if (data) {
                // Format data for chart
                const formatted = data.map(d => ({
                    ...d,
                    dateLabel: new Date(d.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }),
                    fullDate: new Date(d.created_at).toLocaleString('es-AR')
                }));
                setLogs(formatted);
            }
            setLoading(false);
        };
        fetchLogs();
    }, [batch.id]);

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-xl sm:p-4 overflow-hidden">
            <div className="flex-1 w-full max-w-2xl mx-auto bg-panel-base sm:rounded-3xl sm:border border-panel-border overflow-y-auto flex flex-col relative shadow-2xl">
                
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-panel-base/90 backdrop-blur border-b border-panel-border">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-emerald-400">
                        <Activity className="text-emerald-500" /> Historial de Salud (IA)
                    </h2>
                    <button onClick={onClose} className="p-2 bg-white/5 rounded-full hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-6">
                    <div className="text-center">
                        <h3 className="text-lg font-bold text-white">{batch.id}</h3>
                        <p className="text-sm text-gray-400">Evolución del Índice de Salud según Claude</p>
                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center h-48">
                            <Activity className="text-emerald-500 animate-pulse" size={32} />
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-gray-500 gap-2">
                            <Leaf size={32} className="opacity-50" />
                            <p>No hay análisis registrados aún para este lote.</p>
                        </div>
                    ) : (
                        <>
                            <div className="h-64 w-full bg-black/40 p-4 rounded-3xl border border-white/5">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={logs}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                        <XAxis dataKey="dateLabel" stroke="#ffffff50" fontSize={12} tickMargin={10} />
                                        <YAxis stroke="#ffffff50" fontSize={12} domain={[0, 100]} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '12px' }}
                                            labelStyle={{ color: '#888', marginBottom: '4px' }}
                                            formatter={(value) => [`${value}/100`, 'Score']}
                                        />
                                        <Line 
                                            type="monotone" 
                                            dataKey="health_score" 
                                            stroke="#10b981" 
                                            strokeWidth={4}
                                            dot={{ fill: '#10b981', r: 4, strokeWidth: 0 }}
                                            activeDot={{ r: 6, fill: '#34d399', stroke: '#fff', strokeWidth: 2 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wide px-1">Últimos Registros</h4>
                                {logs.slice().reverse().map((log, i) => (
                                    <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-400 font-mono">{log.fullDate}</span>
                                            <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${log.health_score > 80 ? 'bg-emerald-500/20 text-emerald-400' : log.health_score > 50 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                                                Score: {log.health_score}
                                            </span>
                                        </div>
                                        {log.recommendations && (
                                            <p className="text-sm text-gray-200 leading-relaxed border-l-2 border-emerald-500/30 pl-3 whitespace-pre-wrap">
                                                {log.recommendations}
                                            </p>
                                        )}
                                        {log.issues_detected?.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                {log.issues_detected.map((iss: string, idx: number) => (
                                                    <span key={idx} className="bg-red-500/10 text-red-300 px-2 py-1 rounded-md text-xs">
                                                        <AlertTriangle size={10} className="inline mr-1" />{iss}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
