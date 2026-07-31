"use client";

import React, { useEffect, useState } from "react";
import { TelemetryRadiant } from "./TelemetryRadiant";
import { TelemetryChart } from "./TelemetryChart";
import { useRoom } from "../../context/RoomContext";
import { supabase } from "../../lib/supabase";
import { BookOpen } from "@phosphor-icons/react/dist/ssr";

function SensorDashboard({ sensor, roomPhase, vpdMode }: { sensor: any, roomPhase: string, vpdMode: "leaf" | "ambient" }) {
  const [latestMetric, setLatestMetric] = useState<{temp: number, hum: number, rawVpd: number} | null>(null);

  const calcLeafVpd = (tempC: number, humPct: number) => {
    // Usamos offset de -1.5 para luces LED
    const leafTemp = tempC - 1.5;
    const svpLeafPa = 610.78 * Math.exp((17.27 * leafTemp) / (leafTemp + 237.3));
    const svpLeafKpa = svpLeafPa / 1000;
    
    const svpAirPa = 610.78 * Math.exp((17.27 * tempC) / (tempC + 237.3));
    const svpAirKpa = svpAirPa / 1000;
    
    const avpKpa = svpAirKpa * (humPct / 100);
    return Number((svpLeafKpa - avpKpa).toFixed(2));
  };

  const calcAmbientVpd = (tempC: number, humPct: number) => {
    const svpAirPa = 610.78 * Math.exp((17.27 * tempC) / (tempC + 237.3));
    const svpAirKpa = svpAirPa / 1000;
    const avpKpa = svpAirKpa * (humPct / 100);
    return Number((svpAirKpa - avpKpa).toFixed(2));
  };

  const getVpdTargets = () => {
    const p = (roomPhase || '').toLowerCase();
    if (p.includes('clone') || p.includes('esqueje')) {
        return vpdMode === 'ambient' ? { min: 0.6, max: 1.0, target: 0.8 } : { min: 0.4, max: 0.8, target: 0.6 };
    } else if (p.includes('flora')) {
        return vpdMode === 'ambient' ? { min: 1.4, max: 1.8, target: 1.6 } : { min: 1.2, max: 1.6, target: 1.4 };
    } else if (p.includes('secado')) {
        return vpdMode === 'ambient' ? { min: 1.0, max: 1.4, target: 1.2 } : { min: 0.8, max: 1.2, target: 1.0 };
    }
    // Vegetativo (default)
    return vpdMode === 'ambient' ? { min: 1.0, max: 1.4, target: 1.2 } : { min: 0.8, max: 1.2, target: 1.0 };
  };

  const getSuggestions = (temp: number, hum: number, currentVpd: number) => {
     const { min: minVpd, max: maxVpd, target: targetVpd } = getVpdTargets();
     
     if (currentVpd >= minVpd && currentVpd <= maxVpd) {
        return { temp: "Óptimo", hum: "Óptimo", tempStatus: "optimal" as const, humStatus: "optimal" as const };
     }
     
     const calcFn = vpdMode === 'ambient' ? calcAmbientVpd : calcLeafVpd;

     // Buscar humedad ideal
     let targetHum = hum;
     let bestHumDiff = 999;
     for (let h = 10; h <= 95; h++) {
        let v = calcFn(temp, h);
        let diff = Math.abs(v - targetVpd);
        if (diff < bestHumDiff) {
            bestHumDiff = diff;
            targetHum = h;
        }
     }
     
     // Buscar temperatura ideal
     let targetTemp = temp;
     let bestTempDiff = 999;
     for (let t = 15; t <= 35; t += 0.5) {
        let v = calcFn(t, hum);
        let diff = Math.abs(v - targetVpd);
        if (diff < bestTempDiff) {
            bestTempDiff = diff;
            targetTemp = t;
        }
     }
     
     const humDiff = targetHum - hum;
     const tempDiff = targetTemp - temp;
     
     let humText = humDiff > 0 ? `Subir ${humDiff}%` : humDiff < 0 ? `Bajar ${Math.abs(humDiff)}%` : "Óptimo";
     let tempText = tempDiff > 0 ? `Subir ${tempDiff.toFixed(1)}°C` : tempDiff < 0 ? `Bajar ${Math.abs(tempDiff).toFixed(1)}°C` : "Óptimo";
     
     let humStatus: "optimal" | "warning" | "danger" = "optimal";
     if (Math.abs(humDiff) > 5) humStatus = "danger";
     else if (Math.abs(humDiff) > 1) humStatus = "warning";
     
     let tempStatus: "optimal" | "warning" | "danger" = "optimal";
     if (Math.abs(tempDiff) > 2.0) tempStatus = "danger";
     else if (Math.abs(tempDiff) > 0.5) tempStatus = "warning";

     if (Math.abs(humDiff) <= 1) humText = "Óptimo";
     if (Math.abs(tempDiff) <= 0.5) tempText = "Óptimo";
     
     return { temp: tempText, hum: humText, tempStatus, humStatus };
  }

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
        const rawVpd = parseFloat(data[0].vpd_kpa) || 0;
        setLatestMetric({
          temp: t,
          hum: h,
          rawVpd: rawVpd
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
        (payload: any) => {
          if (payload.new) {
             const t = parseFloat(payload.new.temperature_c) || 0;
             const h = parseFloat(payload.new.humidity_percent) || 0;
             const rawVpd = parseFloat(payload.new.vpd_kpa) || 0;
             
             setLatestMetric({
                temp: t,
                hum: h,
                rawVpd: rawVpd
             });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sensor.id]);

  const currentVpd = latestMetric ? 
     (vpdMode === 'ambient' ? calcAmbientVpd(latestMetric.temp, latestMetric.hum) : calcLeafVpd(latestMetric.temp, latestMetric.hum))
     : 0;

  const suggestions = latestMetric ? getSuggestions(latestMetric.temp, latestMetric.hum, currentVpd) : null;

  return (
    <div className="flex flex-col gap-4 border border-panel-border/30 bg-black/5 dark:bg-white/5 rounded-2xl p-4 shadow-xl">
      <h2 className="text-xl font-bold text-emerald-500 font-sans border-b border-panel-border/50 pb-2 mb-2 flex items-center gap-2">
         <span className="w-2 h-2 rounded-full bg-status-green flex animate-pulse shadow-[0_0_8px_#10B981]"></span>
         Métricas Terminal: {sensor.name} 
      </h2>
      
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TelemetryRadiant 
          type="temperature" 
          value={latestMetric?.temp || 0} 
          status={suggestions?.tempStatus || "danger"} 
          suggestionText={suggestions?.temp}
        />
        <TelemetryRadiant 
          type="humidity" 
          value={latestMetric?.hum || 0} 
          status={suggestions?.humStatus || "danger"} 
          suggestionText={suggestions?.hum}
        />
        <TelemetryRadiant 
          type="vpd" 
          value={currentVpd} 
          customLabel={vpdMode === 'ambient' ? "VPD Ambiental" : "VPD Hoja"}
          status={
            (() => {
                if(!latestMetric) return "danger";
                const v = currentVpd;
                const { min, max } = getVpdTargets();
                
                if (v >= min && v <= max) return "optimal";
                if (v >= min - 0.2 && v <= max + 0.2) return "warning";
                return "danger";
            })()
        } />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4 w-full">
        {/* Temp/Hum Chart */}
        <TelemetryChart sensorId={sensor.id} type="th" />
        {/* VPD Chart */}
        <TelemetryChart sensorId={sensor.id} type="vpd" vpdMode={vpdMode} />
      </section>
    </div>
  );
}

export function DashboardOverview() {
  const { selectedRoom, sensors } = useRoom();
  const [vpdMode, setVpdMode] = useState<"leaf" | "ambient">("leaf");

  if (!selectedRoom) return (
     <div className="w-full flex items-center justify-center p-12 text-brand-slate-600 font-mono text-sm border-2 border-dashed border-panel-border/30 rounded-xl">
        [ SELECT A ROOM FROM UPPER COMMANDER ]
     </div>
  );

  const ambientSensors = sensors.filter(s => s.type !== 'soil');

  if (ambientSensors.length === 0) return (
     <div className="w-full flex items-center justify-center p-12 text-status-yellow font-mono text-sm border-2 border-dashed border-status-yellow/30 rounded-xl bg-status-yellow/5">
        &gt; OFFLINE: ESTA SALA NO POSEE SENSORES AMBIENTALES ACTIVOS.
     </div>
  );

  return (
    <div className="flex flex-col gap-8 w-full">
      <div className="flex justify-end mb-[-1rem] relative z-20 pr-4">
         <div className="flex items-center gap-1 bg-black/10 dark:bg-white/5 border border-panel-border/30 rounded-lg p-1">
            <button 
               onClick={() => setVpdMode("leaf")}
               className={`px-3 py-1.5 text-xs font-mono font-bold tracking-wider rounded-md transition-all ${vpdMode === 'leaf' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-lg shadow-blue-500/10' : 'text-slate-500 hover:text-slate-300 border border-transparent'}`}
            >
               VPD HOJA
            </button>
            <button 
               onClick={() => setVpdMode("ambient")}
               className={`px-3 py-1.5 text-xs font-mono font-bold tracking-wider rounded-md transition-all ${vpdMode === 'ambient' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-lg shadow-blue-500/10' : 'text-slate-500 hover:text-slate-300 border border-transparent'}`}
            >
               VPD AMBIENTAL
            </button>
         </div>
      </div>
      {ambientSensors.map(s => <SensorDashboard key={s.id} sensor={s} roomPhase={selectedRoom.phase} vpdMode={vpdMode} />)}
      <VpdLegend vpdMode={vpdMode} />
    </div>
  );
}

function VpdLegend({ vpdMode }: { vpdMode: "leaf" | "ambient" }) {
  const isAmbient = vpdMode === 'ambient';
  
  const ranges = {
     clones: isAmbient ? "0.6 - 1.0 kPa" : "0.4 - 0.8 kPa",
     veg: isAmbient ? "1.0 - 1.4 kPa" : "0.8 - 1.2 kPa",
     flora: isAmbient ? "1.4 - 1.8 kPa" : "1.2 - 1.6 kPa",
     danger: isAmbient ? "< 0.6 o > 1.8 kPa" : "< 0.4 o > 1.6 kPa"
  };

  return (
    <section className="mt-2">
      <div className="w-full bg-panel-base/80 border border-panel-border/30 rounded-xl p-4 shadow-xl backdrop-blur-md">
        <div className="mb-4 text-brand-slate-600 dark:text-slate-300 font-bold flex items-center gap-2 border-b border-panel-border/50 pb-3">
           <BookOpen weight="bold" size={20} /> Rangos Óptimos ({vpdMode === 'ambient' ? 'VPD Ambiental' : 'VPD Hoja'})
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2">
          <div className="flex-1 min-w-[150px] p-3 rounded-lg bg-blue-500/10 border-l-4 border-blue-500">
             <span className="block text-sm font-bold">Propagación</span>
             <span className="text-xs text-brand-slate-600 dark:text-slate-400">{ranges.clones}</span>
          </div>
          <div className="flex-1 min-w-[150px] p-3 rounded-lg bg-status-green/10 border-l-4 border-status-green">
             <span className="block text-sm font-bold">Vegetativo</span>
             <span className="text-xs text-brand-slate-600 dark:text-slate-400">{ranges.veg}</span>
          </div>
          <div className="flex-1 min-w-[150px] p-3 rounded-lg bg-status-yellow/10 border-l-4 border-status-yellow">
             <span className="block text-sm font-bold">Floración</span>
             <span className="text-xs text-brand-slate-600 dark:text-slate-400">{ranges.flora}</span>
          </div>
          <div className="flex-1 min-w-[150px] p-3 rounded-lg bg-status-red/10 border-l-4 border-status-red">
             <span className="block text-sm font-bold">⚠️ Peligro</span>
             <span className="text-xs text-brand-slate-600 dark:text-slate-400">{ranges.danger}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
