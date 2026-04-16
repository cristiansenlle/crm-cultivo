"use client";

import React, { useEffect, useState } from "react";
import { GlassCard } from "../../components/ui/GlassCard";
import { CalendarCheck, ListChecks, CalendarPlus, ClockCounterClockwise } from "@phosphor-icons/react";
import { supabase } from "../../lib/supabase";

export default function TareasPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  useEffect(() => {
    const loadTasks = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('core_agronomic_events').select('*').limit(20).order('created_at', { ascending: false });
      if (data && !error) {
        setTasks(data);
      }
      setLoading(false);
    };
    loadTasks();
  }, []);

  const handlePostTask = async (e: React.FormEvent) => {
      e.preventDefault();
      
      const payload = {
        action: 'CREATE_CALENDAR_EVENT',
        title: title,
        datetime: `${date}T${time}:00`,
        timestamp: new Date().toISOString()
      };

      try {
        const webhookUrl = "http://109.199.99.126.sslip.io:5678/webhook/tareas-calendar";
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        alert('Evento despachado a la Agenda vía N8N');
        setTitle('');
        setDate('');
        setTime('');
      } catch (e) {
        alert('Error en conexión al webhook de Tareas');
      }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-10">
      
      {/* Top Banner Agrupador */}
      <GlassCard className="w-full relative overflow-hidden p-8 flex flex-col md:flex-row justify-between md:items-center gap-6 border-l-4 border-blue-500">
        <div className="z-10">
           <h1 className="text-3xl font-extrabold flex items-center gap-3">
             <CalendarCheck size={32} className="text-blue-500" />
             Bitácora y Eventos Agronómicos
           </h1>
           <p className="text-brand-slate-600 dark:text-slate-400 font-mono mt-2">
             Operaciones y Líneas Temporales unificadas en Supabase (core_agronomic_events) y Google Calendar.
           </p>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 flex flex-col gap-6">
              <GlassCard className="p-6">
                  <h3 className="text-lg font-bold flex items-center gap-2 mb-4"><CalendarPlus size={20} className="text-emerald-500" /> Agendar Nueva Tarea</h3>
                  <form onSubmit={handlePostTask} className="flex flex-col gap-4">
                     <div>
                         <label className="text-xs font-mono text-brand-slate-600 mb-1 block uppercase">Descripción</label>
                         <input type="text" value={title} onChange={e=>setTitle(e.target.value)} required placeholder="Ej: Poda Apical..." className="w-full bg-black/[0.03] dark:bg-black/20 border border-panel-border rounded-lg p-2 text-sm text-foreground focus:outline-none focus:border-emerald-500" />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                         <div>
                             <label className="text-xs font-mono text-brand-slate-600 mb-1 block uppercase">Fecha</label>
                             <input type="date" value={date} onChange={e=>setDate(e.target.value)} required className="w-full bg-black/[0.03] dark:bg-black/20 border border-panel-border rounded-lg p-2 text-sm text-foreground focus:outline-none focus:border-emerald-500" />
                         </div>
                         <div>
                             <label className="text-xs font-mono text-brand-slate-600 mb-1 block uppercase">Hora</label>
                             <input type="time" value={time} onChange={e=>setTime(e.target.value)} required className="w-full bg-black/[0.03] dark:bg-black/20 border border-panel-border rounded-lg p-2 text-sm text-foreground focus:outline-none focus:border-emerald-500" />
                         </div>
                     </div>
                     <button type="submit" className="mt-2 w-full bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded-lg font-bold text-sm transition">
                         Programar y Enviar a N8N
                     </button>
                  </form>
              </GlassCard>
              
              <GlassCard className="p-6">
                  <h3 className="text-lg font-bold flex items-center gap-2 mb-4"><ListChecks size={20} className="text-blue-500" /> Últimos Registros</h3>
                  <div className="flex flex-col gap-3">
                     {loading ? (
                         <div className="text-sm font-mono text-brand-slate-600">Sincronizando tareas desde Supabase...</div>
                     ) : tasks.length === 0 ? (
                         <div className="text-sm font-mono text-brand-slate-600">No hay tareas pendientes en la cola.</div>
                     ) : tasks.map((task, i) => (
                         <div key={i} className="flex flex-col bg-black/[0.03] dark:bg-black/20 dark:bg-white/5 p-3 rounded-lg border border-panel-border/30">
                             <span className="font-bold text-sm text-foreground">{task.title || task.description || `Evento ${task.id?.substring(0,5)}`}</span>
                             <div className="flex justify-between items-end mt-2">
                                <span className="text-xs font-mono text-brand-slate-600 flex items-center gap-1"><ClockCounterClockwise size={12} /> {new Date(task.created_at).toLocaleDateString()}</span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-status-yellow/10 text-status-yellow">Completada</span>
                             </div>
                         </div>
                     ))}
                  </div>
              </GlassCard>
          </div>
          
          <div className="lg:col-span-2">
              <GlassCard className="p-0 overflow-hidden border-panel-border" style={{height: '750px'}}>
                  <iframe
                    src="https://calendar.google.com/calendar/embed?height=750&wkst=1&bgcolor=%231e1e24&ctz=America%2FArgentina%2FBuenos_Aires&showTitle=0&showPrint=1&showTabs=1&showCalendars=0&showTz=1&mode=WEEK&color=%2300E676&src=cristiansenlle%40gmail.com&color=%2333B679"
                    style={{ borderWidth: 0, width: '100%', height: '100%' }}
                    frameBorder="0" scrolling="yes">
                 </iframe>
              </GlassCard>
          </div>
      </div>
      
    </div>
  );
}
