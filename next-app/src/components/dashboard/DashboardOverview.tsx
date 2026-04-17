"use client";

import React, { useEffect, useState } from "react";
import { TelemetryRadiant } from "./TelemetryRadiant";
import { TelemetryChart } from "./TelemetryChart";
import { useRoom } from "../../context/RoomContext";
import { supabase } from "../../lib/supabase";

function SensorDashboard({ sensor, roomPhase }: { sensor: any, roomPhase: string }) {
  const [latestMetric, setLatestMetric] = useState<{temp: number, hum: number, vpd: number} | null>(null);

  const calcVpd = (tempC: number, humPct: number) => {
    const svpPa = 610.78 * Math.exp((17.27 * tempC) / (tempC + 237.3));
    const svpKpa = svpPa / 1000;
    const avpKpa = svpKpa * (humPct / 100);
    return Number((svpKpa - avpKpa).toFixed(2));
  };

  useEffect(() => {
    const fetchLatest = async () => {
      const { data, error } = await supabase
        .from('daily_telemetry')
        .select('temperature_c, humidity_percent, vpd_kpa, created_at')
        .eq('sensor_id', sensor.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const t = parseFloat(data[0].temperature_c) || 0;
        const h = parseFloat(data[0].humidity_percent) || 0;
        const rawVpd = parseFloat(data[0].vpd_kpa);
        setLatestMetric({
          temp: t,
          hum: h,
          vpd: rawVpd > 0 ? rawVpd : calcVpd(t, h)
        });
      }
    };
    
    fetchLatest();

    const channel = supabase
      .channel(`telemetry-${sensor.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'daily_telemetry',
          filter: `sensor_id=eq.${sensor.id}`
        },
        (payload) => {
          if (payload.new) {
             const t = parseFloat(payload.new.temperature_c) || 0;
             const h = parseFloat(payload.new.humidity_percent) || 0;
             const rawVpd = parseFloat(payload.new.vpd_kpa);
             
             setLatestMetric({
                temp: t,
                hum: h,
                vpd: rawVpd > 0 ? rawVpd : calcVpd(t, h)
             });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sensor.id]);

  return (
    <div className="flex flex-col gap-4 border border-panel-border/30 bg-black/5 dark:bg-white/5 rounded-2xl p-4 shadow-xl">
      <h2 className="text-xl font-bold text-emerald-500 font-sans border-b border-panel-border/50 pb-2 mb-2 flex items-center gap-2">
         <span className="w-2 h-2 rounded-full bg-status-green flex animate-pulse shadow-[0_0_8px_#10B981]"></span>
         Métricas Terminal: {sensor.name} 
      </h2>
      
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TelemetryRadiant type="temperature" value={latestMetric?.temp || 0} status={latestMetric ? "optimal" : "danger"} />
        <TelemetryRadiant type="humidity" value={latestMetric?.hum || 0} status={latestMetric ? "optimal" : "danger"} />
        <TelemetryRadiant type="vpd" value={latestMetric?.vpd || 0} status={
            (() => {
                if(!latestMetric) return "danger";
                const isFloro = (roomPhase || '').toLowerCase().includes('flora');
                const v = latestMetric.vpd;
                
                if (isFloro) {
                    if (v >= 1.2 && v <= 1.6) return "optimal";
                    if (v < 1.0 || v > 1.8) return "danger";
                    return "warning";
                } else { // Vegetativo por defecto
                    if (v >= 0.8 && v <= 1.2) return "optimal";
                    if (v < 0.6 || v > 1.4) return "danger";
                    return "warning";
                }
            })()
        } />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4 w-full">
        {/* Temp/Hum Chart */}
        <TelemetryChart sensorId={sensor.id} type="th" />
        {/* VPD Chart */}
        <TelemetryChart sensorId={sensor.id} type="vpd" />
      </section>
    </div>
  );
}

export function DashboardOverview() {
  const { selectedRoom, sensors } = useRoom();

  if (!selectedRoom) return (
     <div className="w-full flex items-center justify-center p-12 text-brand-slate-600 font-mono text-sm border-2 border-dashed border-panel-border/30 rounded-xl">
        [ SELECT A ROOM FROM UPPER COMMANDER ]
     </div>
  );

  if (sensors.length === 0) return (
     <div className="w-full flex items-center justify-center p-12 text-status-yellow font-mono text-sm border-2 border-dashed border-status-yellow/30 rounded-xl bg-status-yellow/5">
        &gt; OFFLINE: ESTA SALA NO POSEE SENSORES ACTIVOS. AÑADA HARDWARE ABAJO.
     </div>
  );

  return (
    <div className="flex flex-col gap-8 w-full">
       {sensors.map(s => <SensorDashboard key={s.id} sensor={s} roomPhase={selectedRoom.phase} />)}
    </div>
  );
}
