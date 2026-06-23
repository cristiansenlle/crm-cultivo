"use client";

import React, { useEffect, useState } from "react";
import { useRoom } from "../../../context/RoomContext";
import { supabase } from "../../../lib/supabase";
import { TelemetryChart } from "../../../components/dashboard/TelemetryChart";
import Link from 'next/link';

function SoilSensorDashboard({ sensor }: { sensor: any }) {
  const [latestMoisture, setLatestMoisture] = useState<number | null>(null);

  useEffect(() => {
    const fetchLatest = async () => {
      const { data, error } = await supabase
        .from('soil_telemetry')
        .select('moisture_pct')
        .eq('sensor_id', sensor.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        setLatestMoisture(data[0].moisture_pct);
      }
    };
    
    fetchLatest();

    const channel = supabase
      .channel(`soil-telemetry-${sensor.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'soil_telemetry',
          filter: `sensor_id=eq.${sensor.id}`
        },
        (payload: any) => {
          if (payload.new) {
             setLatestMoisture(payload.new.moisture_pct);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sensor.id]);

  return (
    <div className="flex flex-col gap-4 border border-blue-500/30 bg-black/5 dark:bg-white/5 rounded-2xl p-4 shadow-xl">
      <h2 className="text-xl font-bold text-blue-400 font-sans border-b border-panel-border/50 pb-2 mb-2 flex items-center gap-2">
         <span className="w-2 h-2 rounded-full bg-blue-500 flex animate-pulse shadow-[0_0_8px_#3B82F6]"></span>
         Humedad de Suelo: {sensor.name} 
      </h2>
      
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Simple Card for Moisture */}
        <div className="flex flex-col items-center justify-center p-6 bg-black/10 dark:bg-black/20 rounded-xl border border-blue-500/20 shadow-inner h-full min-h-[260px]">
            <span className="text-sm text-brand-slate-400 mb-2 font-mono uppercase tracking-widest">Humedad Actual</span>
            <div className="flex items-end gap-2">
                <span className={`text-6xl font-black font-sans tracking-tighter ${latestMoisture !== null && latestMoisture < 40 ? 'text-red-500' : 'text-blue-400'}`}>
                    {latestMoisture !== null ? latestMoisture : '--'}
                </span>
                <span className="text-3xl text-brand-slate-500 font-medium mb-1">%</span>
            </div>
            {latestMoisture !== null && latestMoisture < 40 && (
                <div className="mt-4 px-3 py-1 bg-red-500/20 border border-red-500/50 text-red-400 text-xs rounded-full uppercase tracking-wider animate-pulse">
                    Riego Recomendado
                </div>
            )}
        </div>
        
        {/* Chart */}
        <div className="w-full h-full min-h-[260px]">
           <TelemetryChart sensorId={sensor.id} type="soil" />
        </div>
      </section>
    </div>
  );
}

export default function SoilDashboardPage() {
  const { selectedRoom, sensors } = useRoom();

  if (!selectedRoom) return (
     <div className="w-full h-screen flex flex-col items-center justify-center p-12 text-brand-slate-600 font-mono text-sm">
        <div className="border-2 border-dashed border-panel-border/30 rounded-xl p-12">
            [ SELECT A ROOM FROM UPPER COMMANDER ]
        </div>
     </div>
  );

  const soilSensors = sensors.filter(s => s.type === 'soil');

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-6 w-full pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Humedad de Suelo - {selectedRoom.name}</h1>
          <p className="text-gray-400">Visualización de telemetría en tiempo real de los sensores asignados a esta sala.</p>
        </div>
        <Link href="/iot/devices" className="bg-neutral-800 hover:bg-neutral-700 text-white font-medium py-2 px-4 rounded-lg transition-colors border border-neutral-700">
          Configurar Sensores
        </Link>
      </div>

      {soilSensors.length === 0 ? (
         <div className="w-full flex flex-col gap-4 items-center justify-center p-12 text-status-yellow font-mono text-sm border-2 border-dashed border-status-yellow/30 rounded-xl bg-status-yellow/5">
            <p>&gt; OFFLINE: ESTA SALA NO POSEE SENSORES DE SUELO ASIGNADOS.</p>
            <Link href="/iot/devices" className="text-blue-400 hover:underline">
               Asignar un sensor de suelo en Configuración IoT
            </Link>
         </div>
      ) : (
         <div className="flex flex-col gap-8 w-full">
            {soilSensors.map(s => <SoilSensorDashboard key={s.id} sensor={s} />)}
         </div>
      )}
    </div>
  );
}
