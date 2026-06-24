"use client";

import React, { useEffect, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { GlassCard } from "../ui/GlassCard";
import { supabase } from "../../lib/supabase";

export function TelemetryChart({ sensorId, type = "th", vpdMode = "leaf" }: { sensorId: string, type?: "th" | "vpd" | "soil", vpdMode?: "leaf" | "ambient" }) {
  const [data, setData] = useState<{ time: string, temp?: number, hum?: number, vpd?: number, soil?: number }[]>([]);
  const [status, setStatus] = useState("Cargando...");

  useEffect(() => {
    const loadTelemetry = async () => {
      const isSoil = type === 'soil';
      const tableName = isSoil ? 'soil_telemetry' : 'daily_telemetry';
      const selectCols = isSoil ? 'moisture_pct, created_at' : 'temperature_c, humidity_percent, vpd_kpa, created_at';

      const { data: tbData, error } = await supabase.from(tableName)
                    .select(selectCols)
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
        if (isSoil) {
            return {
              time: d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
              soil: parseFloat(row.moisture_pct) || 0
            };
        }

        const temp = parseFloat(row.temperature_c) || 0;
        const hum = parseFloat(row.humidity_percent) || 0;
        let vpd = parseFloat(row.vpd_kpa) || 0;

        if (vpdMode === 'ambient') {
            const svpAirPa = 610.78 * Math.exp((17.27 * temp) / (temp + 237.3));
            const svpAirKpa = svpAirPa / 1000;
            const avpKpa = svpAirKpa * (hum / 100);
            vpd = Number((svpAirKpa - avpKpa).toFixed(2));
        } else {
            const leafTemp = temp - 1.5;
            const svpLeafPa = 610.78 * Math.exp((17.27 * leafTemp) / (leafTemp + 237.3));
            const svpLeafKpa = svpLeafPa / 1000;
            const svpAirPa = 610.78 * Math.exp((17.27 * temp) / (temp + 237.3));
            const svpAirKpa = svpAirPa / 1000;
            const avpKpa = svpAirKpa * (hum / 100);
            vpd = Number((svpLeafKpa - avpKpa).toFixed(2));
        }

        return {
          time: d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
          temp: temp,
          hum: hum,
          vpd: vpd
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
             {type === 'th' ? "Curva Térmica & Humedad" : type === 'soil' ? "Humedad de Suelo Histórica" : "Presión Transpiratoria (VPD)"}
          </h3>
          <p className="text-xs font-mono text-brand-slate-600/50 dark:text-slate-500">Última lectura: {status}</p>
        </div>
        <div className="flex gap-3 font-mono text-[10px] md:text-xs uppercase">
          {type === 'th' ? (
              <>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-status-yellow"></span> Temp</div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Hum</div>
              </>
          ) : type === 'soil' ? (
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Humedad (%)</div>
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
                  <YAxis yAxisId="right" orientation="right" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} fontFamily="monospace" domain={[0, 100]} tickFormatter={(val) => `${val}%`}/>
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(16px)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', fontSize: '12px', fontFamily: 'monospace' }} cursor={{ stroke: 'rgba(255,255,255,0.1)' }} />
                  <Area yAxisId="right" type="monotone" dataKey="hum" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill={`url(#colorHum_${sensorId})`} activeDot={{ r: 4 }}/>
                  <Area yAxisId="left" type="monotone" dataKey="temp" stroke="#F59E0B" strokeWidth={2} fillOpacity={1} fill={`url(#colorTemp_${sensorId})`} activeDot={{ r: 4 }}/>
                </AreaChart>
             ) : type === 'soil' ? (
                <AreaChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id={`colorSoil_${sensorId}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/></linearGradient>
                  </defs>
                  <XAxis dataKey="time" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} fontFamily="monospace" tickMargin={8}/>
                  <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} fontFamily="monospace" domain={[0, 100]} tickFormatter={(val) => `${val}%`}/>
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(16px)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', fontSize: '12px', fontFamily: 'monospace' }} cursor={{ stroke: 'rgba(255,255,255,0.1)' }} />
                  <Area type="monotone" dataKey="soil" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill={`url(#colorSoil_${sensorId})`} activeDot={{ r: 4 }}/>
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
