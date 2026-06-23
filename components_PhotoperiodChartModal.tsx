"use client";

import React, { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { AppWindow, PresentationChart, Sun, Moon } from "@phosphor-icons/react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { supabase } from "@/lib/supabase";

export function PhotoperiodChartModal({ batch, onClose }: { batch: any, onClose: () => void }) {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            const { data: logData, error } = await supabase
                .from('core_photoperiod_history')
                .select('*')
                .eq('batch_id', batch.id)
                .order('start_date', { ascending: true });
            
            const startDateStr = batch.start_date || batch.created_at;
            const startDate = startDateStr ? new Date(startDateStr) : new Date();
            const todayDate = new Date();
            
            const diffTime = todayDate.getTime() - startDate.getTime();
            const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
            
            const timeline = [];
            const curDate = new Date(startDate);

            for (let i = 1; i <= diffDays; i++) {
                if (logData && logData.length > 0) {
                    const activeLog = logData.find(log => {
                        const ls = new Date(log.start_date);
                        const le = log.end_date ? new Date(log.end_date) : todayDate;
                        // Normalize times to end of day/start of day if needed, but standard compare works if within the span
                        return curDate >= ls && curDate <= le;
                    });
                    
                    if (activeLog) {
                        timeline.push({ name: `Día ${i}`, light: Number(activeLog.light_hours), dark: Number(activeLog.dark_hours) });
                    } else {
                        // El log no cubría esta fecha, usar estado actual del lote como default
                        timeline.push({ name: `Día ${i}`, light: Number(batch.light_hours), dark: Number(batch.dark_hours) });
                    }
                } else if (batch.light_hours) {
                    // Retrocompatibilidad sin logs insertados aun
                    timeline.push({ name: `Día ${i}`, light: Number(batch.light_hours), dark: Number(batch.dark_hours) });
                }
                
                curDate.setDate(curDate.getDate() + 1);
            }
            
            setData(timeline);
            setLoading(false);
        };
        
        fetchData();
    }, [batch]);

    const CustomTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
        return (
          <div className="bg-panel-base border border-panel-border p-3 rounded-lg shadow-2xl">
            <p className="font-bold text-sm mb-2 text-foreground">{label}</p>
            {payload.map((entry: any, index: number) => (
              <p key={`item-${index}`} className="flex items-center gap-2 text-xs font-mono font-bold" style={{ color: entry.color }}>
                {entry.name === 'light' ? <Sun size={14}/> : <Moon size={14}/>}
                {entry.name.toUpperCase()}: {entry.value}h
              </p>
            ))}
          </div>
        );
      }
      return null;
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <GlassCard className="max-w-4xl w-full h-[500px] p-6 shadow-2xl relative flex flex-col">
                <button onClick={onClose} className="absolute top-4 right-4 text-brand-slate-600 hover:text-foreground transition-colors"><AppWindow size={24}/></button>
                <div className="mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-purple-400">
                        <PresentationChart /> Línea de Tiempo Lumínica
                    </h2>
                    <p className="text-brand-slate-600 dark:text-slate-400 text-sm font-mono mt-1">Lote ID: {batch.id}</p>
                </div>

                <div className="flex-1 w-full relative">
                    {loading ? (
                        <div className="absolute inset-0 flex items-center justify-center font-mono text-brand-slate-600">Procesando Trazabilidad...</div>
                    ) : data.length === 0 ? (
                        <div className="absolute inset-0 flex items-center justify-center font-mono text-brand-slate-600 border-2 border-dashed border-panel-border/30 rounded-xl">NO HAY DATA LUMINICA</div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.3} />
                                <XAxis dataKey="name" stroke="#64748b" fontSize={11} minTickGap={20} />
                                <YAxis type="number" domain={[0, 24]} stroke="#64748b" fontSize={12} tickFormatter={val => `${val}h`} />
                                <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                                <Legend wrapperStyle={{fontSize: '12px'}} />
                                <Bar dataKey="light" name="Horas Luz" stackId="a" fill="#EAB308" radius={[0,0,0,0]} />
                                <Bar dataKey="dark" name="Horas Oscuridad" stackId="a" fill="#4F46E5" radius={[4,4,0,0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </GlassCard>
        </div>
    );
}
