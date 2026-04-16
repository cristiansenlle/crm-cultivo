"use client";

import React, { useState } from "react";
import { GlassCard } from "../ui/GlassCard";
import { Thermometer, NavigationArrow, ThermometerSimple, Drop, FloppyDisk, Cpu, Plus, Trash } from "@phosphor-icons/react";
import { useRoom } from "../../context/RoomContext";
import { supabase } from "../../lib/supabase";

export function DashboardControls() {
  const { selectedRoom, sensors, activeSensor, setActiveSensor, refreshSensors } = useRoom();
  const [temperature, setTemperature] = useState("");
  const [humidity, setHumidity] = useState("");
  const [newSensorName, setNewSensorName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const calcVpd = (tempC: number, humPct: number) => {
    const svpPa = 610.78 * Math.exp((17.27 * tempC) / (tempC + 237.3));
    const svpKpa = svpPa / 1000;
    const avpKpa = svpKpa * (humPct / 100);
    return svpKpa - avpKpa;
  };

  const handlePostTelemetry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) return alert("Debe seleccionar una Sala de cultivo.");
    if (!activeSensor) return alert("Seleccione o cree un sensor para enviar los datos.");

    const t = parseFloat(temperature);
    const h = parseFloat(humidity);
    if (isNaN(t) || isNaN(h)) return alert("Datos inválidos");

    const vpd = calcVpd(t, h);
    setIsSubmitting(true);

    const payload = {
        batch_id: selectedRoom.id,
        sensor_id: activeSensor.id,
        phase: selectedRoom.phase,
        temp: t,
        humidity: h,
        vpd: vpd,
        status: t > 30 ? 'critical' : 'optimal',
        timestamp: new Date().toISOString()
    };

    try {
        const webhookUrl = "http://109.199.99.126.sslip.io:5678/webhook/telemetry";
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        setTemperature("");
        setHumidity("");
        alert(`Calibración inyectada a la red vía Sensor ${activeSensor.name}`);
    } catch (error) {
        console.error("Error n8n:", error);
    }
    setIsSubmitting(false);
  };

  const handleAddSensor = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!selectedRoom || !newSensorName) return;
     const { error } = await supabase.from('core_sensors').insert([{ room_id: selectedRoom.id, name: newSensorName }]);
     if (!error) {
         setNewSensorName("");
         await refreshSensors();
     } else {
         alert("Error insertando Sensor en BD");
     }
  };

  const handleDeleteSensor = async (id: string) => {
     if (!confirm("Ojo: Si el sensor tiene telemetría historiada, la base de datos rebotará la purga. ¿Borrar de todos modos?")) return;
     const { error } = await supabase.from('core_sensors').delete().eq('id', id);
     if (error) alert("Referencia bloqueada. El sensor posee registros diarios imposibles de borrar por integridad relacional.");
     await refreshSensors();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 w-full">
      <GlassCard className="p-4 flex flex-col justify-between" id="calibracion-panel">
         <h3 className="text-lg font-bold flex items-center gap-2 mb-4 text-emerald-500">
           <Thermometer size={24} weight="bold" />
           Entradas Manuales / Calibración
         </h3>
         
         {!selectedRoom ? (
             <div className="font-mono text-brand-slate-600 text-sm">Seleccione una Sala superior</div>
         ) : (
             <form onSubmit={handlePostTelemetry} className="flex flex-col gap-4">
               <div>
                  <label className="text-xs font-mono text-brand-slate-600 mb-1 block uppercase">Sensor Destino</label>
                  <select 
                     className="w-full bg-black/20 border border-panel-border rounded-lg p-2 text-sm text-foreground focus:outline-none focus:border-emerald-500 font-mono"
                     value={activeSensor?.id || ""}
                     onChange={(e) => {
                         const s = sensors.find(sec => sec.id === e.target.value);
                         if(s) setActiveSensor(s);
                     }}
                     required
                  >
                     {sensors.length === 0 && <option value="">Sin Sensores Registrados</option>}
                     {sensors.map(s => <option key={s.id} value={s.id}>{s.name} (Ref: {s.id.substring(0,5)})</option>)}
                  </select>
               </div>

               <div className="grid grid-cols-2 gap-2">
                 <div className="flex bg-black/20 border border-panel-border rounded-lg overflow-hidden focus-within:border-emerald-500 transition-colors">
                   <span className="p-2 bg-black/40 flex items-center justify-center text-status-yellow w-12"><ThermometerSimple size={18} /></span>
                   <input 
                     type="number" step="0.1" 
                     placeholder="24.5 °C" 
                     required
                     className="bg-transparent text-sm w-full p-2 outline-none"
                     value={temperature} onChange={e => setTemperature(e.target.value)}
                   />
                 </div>
                 <div className="flex bg-black/20 border border-panel-border rounded-lg overflow-hidden focus-within:border-emerald-500 transition-colors">
                   <span className="p-2 bg-black/40 flex items-center justify-center text-status-green w-12"><Drop size={18} /></span>
                   <input 
                     type="number" step="0.1" 
                     placeholder="55.0 %" 
                     required
                     className="bg-transparent text-sm w-full p-2 outline-none"
                     value={humidity} onChange={e => setHumidity(e.target.value)}
                   />
                 </div>
               </div>
               
               <button 
                 type="submit" 
                 disabled={isSubmitting || sensors.length === 0}
                 className="flex items-center justify-center gap-2 mt-2 bg-panel-base hover:bg-emerald-600/20 text-emerald-500 border border-panel-border hover:border-emerald-500/50 p-2 rounded-lg transition-colors font-bold text-sm tracking-wide disabled:opacity-50"
               >
                 {isSubmitting ? 'Inyectando...' : <><FloppyDisk size={18} /> INYECTAR TELEMETRÍA</>}
               </button>
             </form>
         )}
      </GlassCard>

      <GlassCard className="p-4 flex flex-col justify-between border-l-4 border-blue-500/30" id="iot-nodos-panel">
         <h3 className="text-lg font-bold flex items-center gap-2 mb-4 text-brand-slate-600">
           <NavigationArrow size={24} weight="bold" className="text-blue-500" />
           Administración de Nodos IoT
         </h3>
         {!selectedRoom ? (
             <div className="font-mono text-brand-slate-600 text-sm">Seleccione una Sala superior</div>
         ) : (
            <div className="flex flex-col gap-3 h-[200px] overflow-y-auto pr-1">
                <form onSubmit={handleAddSensor} className="flex gap-2">
                    <input type="text" value={newSensorName} onChange={e=>setNewSensorName(e.target.value)} placeholder="Añadir Terminal ESP32..." required className="bg-black/20 border border-panel-border rounded-lg p-2 flex-1 text-sm text-foreground focus:outline-none focus:border-blue-500 font-mono" />
                    <button type="submit" className="bg-blue-600 hover:bg-blue-500 p-2 rounded-lg text-white"><Plus size={16} /></button>
                </form>
                <div className="flex flex-col gap-2 mt-2">
                    {sensors.length === 0 ? <p className="text-sm font-mono text-brand-slate-600">No hay hardware mapeado a esta sala.</p> : null}
                    {sensors.map(s => (
                        <div key={s.id} className="flex justify-between items-center bg-black/10 border border-panel-border p-2 rounded-lg hover:border-blue-500/30 transition-colors">
                            <div className="flex items-center gap-2 font-mono text-sm"><Cpu size={16} className="text-blue-400"/> {s.name}</div>
                            <button onClick={()=>handleDeleteSensor(s.id)} className="text-status-red/70 hover:text-status-red p-1"><Trash size={16} /></button>
                        </div>
                    ))}
                </div>
            </div>
         )}
      </GlassCard>
    </div>
  );
}
