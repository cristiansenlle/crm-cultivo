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
            
            const ganttData = [];

            if (logData && logData.length > 0) {
                 logData.forEach((log) => {
                     const ls = new Date(log.start_date);
                     const le = log.end_date ? new Date(log.end_date) : todayDate;
                     
                     // Dia de inicio respecto a startDate del lote
                     const startDay = Math.max(1, Math.floor((ls.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
                     const endDay = Math.max(startDay + 1, Math.ceil((le.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
                     
                     ganttData.push({
                         name: `${log.light_hours}L / ${log.dark_hours}O`,
                         range: [startDay, endDay],
                         realL: log.light_hours,
                         realD: log.dark_hours
                     });
                 });
            } else if (batch.light_hours) {
                 ganttData.push({
                     name: `${batch.light_hours}L / ${batch.dark_hours}O`,
                     range: [1, Math.max(2, diffDays)],
                     realL: batch.light_hours,
                     realD: batch.dark_hours
                 });
            }
            
            setData(ganttData);
            setLoading(false);
        };
        
        fetchData();
    }, [batch]);

    const CustomTooltip = ({ active, payload }: any) => {
      if (active && payload && payload.length) {
        const d = payload[0].payload;
        return (
          <div className="bg-panel-base border border-panel-border p-3 rounded-lg shadow-2xl">
            <p className="font-bold text-sm mb-2 text-purple-400">Ciclo Activo: {d.name}</p>
            <p className="text-xs font-mono mb-2 text-foreground">Franja: Día {d.range[0]} hasta Día {d.range[1]}</p>
            <p className="flex items-center gap-2 text-xs font-mono font-bold text-yellow-500"><Sun size={14}/> LUZ: {d.realL}h</p>
            <p className="flex items-center gap-2 text-xs font-mono font-bold text-indigo-400"><Moon size={14}/> OSCURIDAD: {d.realD}h</p>
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
                        <PresentationChart /> Gráfico Gantt Lumínico
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
                            <BarChart layout="vertical" data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" opacity={0.3} />
                                <XAxis type="number" stroke="#64748b" fontSize={11} tickFormatter={val => `Día ${val}`} />
                                <YAxis dataKey="name" type="category" stroke="#f8fafc" fontSize={12} width={100} fontWeight="bold" />
                                <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                                <Bar dataKey="range" name="Periodo (Días Transcurridos)" fill="#a855f7" radius={[4,4,4,4]} barSize={24} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </GlassCard>
        </div>
    );
}
