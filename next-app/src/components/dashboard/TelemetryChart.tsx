"use client";

import React, { useEffect, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { GlassCard } from "../ui/GlassCard";
import { supabase } from "../../lib/supabase";

export function TelemetryChart({ sensorId, type = "th" }: { sensorId: string, type?: "th" | "vpd" }) {
  const [data, setData] = useState<{ time: string, temp?: number, hum?: number, vpd?: number }[]>([]);
  const [status, setStatus] = useState("Cargando...");

  useEffect(() => {
    const loadTelemetry = async () => {
      const { data: tbData, error } = await supabase.from('daily_telemetry')
                    .select('temperature_c, humidity_percent, vpd_kpa, created_at')
                    .eq('sensor_id', sensorId)
                    .order('created_at', { ascending: false })
                    .limit(20);
      
      if (error) return setStatus("Error de conexión");
      if (!tbData || tbData.length === 0) {
        setStatus("Sin telemetría histórica");
        setData([]);
        return;
      }

      const reversed = [...tbData].reverse();
      const chartArr = reversed.map((row) => {
        const d = new Date(row.created_at);
        return {
          time: d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
          temp: parseFloat(row.temperature_c) || 0,
          hum: parseFloat(row.humidity_percent) || 0,
          vpd: parseFloat(row.vpd_kpa) || 0
        };
      });

      setData(chartArr);
      setStatus("Sync OK");
    };

    loadTelemetry();
    const interval = setInterval(loadTelemetry, 5000);
    return () => clearInterval(interval);
  }, [sensorId]);

  return (
    <GlassCard className="w-full h-[260px] p-4 flex flex-col relative z-10 border-0 shadow-none bg-black/10">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-md font-bold text-brand-slate-600 dark:text-slate-300">
             {type === 'th' ? "Curva Térmica & Humedad" : "Presión Transpiratoria (VPD)"}
          </h3>
          <p className="text-xs font-mono text-brand-slate-600/50 dark:text-slate-500">Última lectura: {status}</p>
        </div>
        <div className="flex gap-3 font-mono text-[10px] md:text-xs uppercase">
          {type === 'th' ? (
              <>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-status-yellow"></span> Temp</div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Hum</div>
              </>
          ) : (
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> VPD (kPa)</div>
          )}
        </div>
      </div>

      <div className="flex-1 w-full h-full min-h-[160px]">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
             {type === 'th' ? (
                <AreaChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id={`colorTemp_${sensorId}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/><stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/></linearGradient>
                    <linearGradient id={`colorHum_${sensorId}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10B981" stopOpacity={0}/></linearGradient>
                  </defs>
                  <XAxis dataKey="time" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} fontFamily="monospace" tickMargin={8}/>
                  <YAxis yAxisId="left" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} fontFamily="monospace"/>
                  <YAxis yAxisId="right" orientation="right" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} fontFamily="monospace"/>
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(16px)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', fontSize: '12px', fontFamily: 'monospace' }} cursor={{ stroke: 'rgba(255,255,255,0.1)' }} />
                  <Area yAxisId="right" type="monotone" dataKey="hum" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill={`url(#colorHum_${sensorId})`} activeDot={{ r: 4 }}/>
                  <Area yAxisId="left" type="monotone" dataKey="temp" stroke="#F59E0B" strokeWidth={2} fillOpacity={1} fill={`url(#colorTemp_${sensorId})`} activeDot={{ r: 4 }}/>
                </AreaChart>
             ) : (
                <AreaChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id={`colorVpd_${sensorId}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/></linearGradient>
                  </defs>
                  <XAxis dataKey="time" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} fontFamily="monospace" tickMargin={8}/>
                  <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} fontFamily="monospace" domain={['auto', 'auto']}/>
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(16px)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', fontSize: '12px', fontFamily: 'monospace' }} cursor={{ stroke: 'rgba(255,255,255,0.1)' }} />
                  <Area type="monotone" dataKey="vpd" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill={`url(#colorVpd_${sensorId})`} activeDot={{ r: 4 }}/>
                </AreaChart>
             )}
          </ResponsiveContainer>
        ) : (
           <div className="h-full flex items-center justify-center font-mono text-brand-slate-600/50 text-sm">
              [ NO DATA FEED ]
           </div>
        )}
      </div>
    </GlassCard>
  );
}
