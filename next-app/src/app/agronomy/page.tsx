"use client";

import React, { useEffect, useState } from "react";
import { GlassCard } from "../../components/ui/GlassCard";
import { ProjectorScreenChart, Calendar, Target, Clock, Funnel, MapPinLine, Thermometer } from "@phosphor-icons/react";
import { supabase } from "../../lib/supabase";
import { ResponsiveContainer, ComposedChart, Line, Scatter, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

export default function AgronomyTimelinePage() {
    // Master Lists
    const [rooms, setRooms] = useState<any[]>([]);
    const [sensors, setSensors] = useState<any[]>([]);
    
    // UI Filter States
    const [startDate, setStartDate] = useState(() => {
       const d = new Date(); d.setDate(d.getDate() - 15);
       return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [selectedRoom, setSelectedRoom] = useState("all");
    const [selectedSensor, setSelectedSensor] = useState("all");

    // Data States
    const [events, setEvents] = useState<any[]>([]);
    const [chartData, setChartData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterCategory, setFilterCategory] = useState("all");

    // 1. Initial Metadata Load
    useEffect(() => {
        const loadMetadata = async () => {
            const { data: rm } = await supabase.from('core_rooms').select('id, name');
            if(rm) setRooms(rm);
            const { data: sn } = await supabase.from('core_sensors').select('id, name, room_id');
            if(sn) setSensors(sn);
        };
        loadMetadata();
    }, []);

    // 2. Fetch Data Engine
    const loadData = async () => {
        setLoading(true);
        try {
            // Evts Query
            let evtQ = supabase.from('core_agronomic_events').select('*')
                .gte('date_occurred', startDate + "T00:00:00")
                .lte('date_occurred', endDate + "T23:59:59")
                .order('date_occurred', { ascending: false });
            
            // if (selectedRoom !== 'all') evtQ = evtQ.eq('room_id', selectedRoom); // Asume room_id, podria no estar en eventos viejos
            const { data: evs } = await evtQ;
            if (evs) setEvents(evs);

            // Tel Query
            let telQ = supabase.from('daily_telemetry').select('*')
                .gte('created_at', startDate + "T00:00:00")
                .lte('created_at', endDate + "T23:59:59")
                .order('created_at', { ascending: true });
            
            if (selectedRoom !== 'all') telQ = telQ.eq('room_id', selectedRoom);
            if (selectedSensor !== 'all') telQ = telQ.eq('sensor_id', selectedSensor);

            const { data: tel } = await telQ;
            
            if (tel) {
                // Generar consolidado unificado para gráficas
                const consolidated: any[] = tel.map((t:any) => {
                    const d = new Date(t.created_at);
                    return {
                        timeLabel: d.toLocaleDateString([],{day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'}),
                        timestamp: d.getTime(),
                        Temp: parseFloat(t.temperature_c) || null,
                        Hum: parseFloat(t.humidity_percent) || null,
                        VPD: parseFloat(t.vpd_kpa) || null,
                        evento: null, eventDesc: '', eventType: ''
                    }
                });

                if (evs) {
                    evs.forEach((e:any) => {
                        const ed = new Date(e.date_occurred);
                        // Filtro visual basico si el evento corresponde a la sala elegida
                        // (Fallback logico si la db cruda via bot no indexó la sala perfect, pero si es 'all' va de cajon)
                        consolidated.push({
                            timeLabel: ed.toLocaleDateString([],{day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'}),
                            timestamp: ed.getTime(),
                            Temp: null, Hum: null, VPD: null,
                            evento: e.event_type === 'Plaga' ? 10 : (e.event_type === 'Fase' ? 12 : 8),
                            eventDesc: e.description,
                            eventType: e.event_type
                        });
                    });
                }
                
                consolidated.sort((a,b) => a.timestamp - b.timestamp);
                setChartData(consolidated);
            }
        } catch(e) {}
        setLoading(false);
    };

    // Auto-load on filter change
    useEffect(() => {
        loadData();
        // eslint-disable-next-line
    }, [startDate, endDate, selectedRoom, selectedSensor]);

    // UI Helpers
    const filteredEventsTimeline = events.filter(e => {
        if (filterCategory === "all") return true;
        return e.event_type === filterCategory;
    });

    const getAvailableSensors = () => {
        if (selectedRoom === 'all') return [];
        return sensors.filter(s => s.room_id === selectedRoom);
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
        return (
          <div className="bg-panel-base/90 backdrop-blur-md border border-panel-border p-3 rounded-lg shadow-xl font-mono text-xs z-50 relative">
            <p className="font-bold text-foreground mb-2">{label}</p>
            {payload.map((entry: any, index: number) => {
              if(entry.dataKey === 'evento') {
                  return <div key={index} className="text-yellow-400 mt-2 font-bold max-w-[200px] whitespace-normal">[{entry.payload.eventType}] {entry.payload.eventDesc}</div>
              }
              if(entry.value !== null) {
                return (
                  <div key={index} className="flex gap-2" style={{ color: entry.color }}>
                    <span>{entry.name}:</span><span className="font-bold">{entry.value}</span>
                  </div>
                );
              }
            })}
          </div>
        );
      }
      return null;
    };

    const getEventIconAndColor = (type: string) => {
        const t = (type || "").toLowerCase();
        if (t.includes('riego') || t.includes('water')) return { color: "text-blue-500", bg: "bg-blue-500/10", border: 'border-blue-500/30' };
        if (t.includes('nutri') || t.includes('fert')) return { color: "text-purple-500", bg: "bg-purple-500/10", border: 'border-purple-500/30' };
        if (t.includes('pod') || t.includes('pruning')) return { color: "text-emerald-500", bg: "bg-emerald-500/10", border: 'border-emerald-500/30' };
        if (t.includes('cosecha') || t.includes('harvest')) return { color: "text-orange-500", bg: "bg-orange-500/10", border: 'border-orange-500/30' };
        if (t.includes('luz') || t.includes('light')) return { color: "text-status-yellow", bg: "bg-status-yellow/10", border: 'border-status-yellow/30' };
        return { color: "text-brand-slate-400", bg: "bg-brand-slate-600/10", border: 'border-brand-slate-600/30' };
    };

    return (
        <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto pb-10">
            {/* Header */}
            <GlassCard className="w-full relative overflow-hidden p-8 flex flex-col justify-between gap-6 border-l-4 border-indigo-500">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                <div className="z-10">
                    <h1 className="text-3xl font-extrabold flex items-center gap-3">
                        <ProjectorScreenChart size={32} className="text-indigo-500" />
                        Timeline & Análisis Climático
                    </h1>
                    <p className="text-brand-slate-600 dark:text-slate-400 font-mono mt-2">
                        Auditoría Híbrida: Sensores de Clima + Bitácora Agronómica
                    </p>
                </div>
            </GlassCard>

            {/* Matrix Filters */}
            <GlassCard className="p-4 w-full relative z-30">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="text-[10px] font-mono text-brand-slate-400 uppercase tracking-widest block mb-1">Fecha Inicio</label>
                        <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className="w-full bg-black/30 border border-panel-border rounded p-2 text-sm text-foreground focus:border-indigo-500 outline-none" />
                    </div>
                    <div>
                        <label className="text-[10px] font-mono text-brand-slate-400 uppercase tracking-widest block mb-1">Fecha Fin</label>
                        <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} className="w-full bg-black/30 border border-panel-border rounded p-2 text-sm text-foreground focus:border-indigo-500 outline-none" />
                    </div>
                    <div>
                        <label className="text-[10px] font-mono text-brand-slate-400 uppercase tracking-widest flex items-center gap-1 mb-1"><MapPinLine/> Sala de Operación</label>
                        <select value={selectedRoom} onChange={e => { setSelectedRoom(e.target.value); setSelectedSensor("all"); }} className="w-full bg-black/30 border border-panel-border rounded p-2 text-sm text-foreground focus:border-indigo-500 outline-none">
                            <option value="all">TODAS LAS SALAS GLOBALES</option>
                            {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-mono text-brand-slate-400 uppercase tracking-widest flex items-center gap-1 mb-1"><Thermometer/> Aislamiento de Sensor</label>
                        <select value={selectedSensor} onChange={e=>setSelectedSensor(e.target.value)} disabled={selectedRoom === 'all'} className="w-full bg-black/30 border border-panel-border rounded p-2 text-sm text-foreground focus:border-indigo-500 outline-none disabled:opacity-50">
                            {selectedRoom === 'all' ? (
                                <option value="all">Bloqueado (Varias Salas)</option>
                            ) : (
                                <>
                                  <option value="all">Promedio Ficticio (Todos)</option>
                                  {getAvailableSensors().map(s => <option key={s.id} value={s.id}>Sensor: {s.name}</option>)}
                                </>
                            )}
                        </select>
                    </div>
                </div>
            </GlassCard>

            {/* Grafico Multi-Eje */}
            <GlassCard className="p-4 md:p-6 w-full overflow-hidden relative z-20">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">Monitor Dinámico</h3>
                <div className="h-[350px] w-full">
                    {loading ? (
                       <div className="w-full h-full flex flex-col gap-2 items-center justify-center font-mono opacity-50"><Clock className="animate-spin" size={24}/> Calculando Curva Dimensional...</div>
                    ) : chartData.length === 0 ? (
                       <div className="w-full h-full flex items-center justify-center font-mono opacity-50 border border-dashed border-panel-border/50 rounded">Sin Telemetría en este marco de tiempo</div>
                    ) : (
                       <ResponsiveContainer width="100%" height="100%">
                           <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                               <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                               <XAxis dataKey="timeLabel" tick={{fontSize: 10, fill: '#888'}} interval="preserveStartEnd" minTickGap={30} />
                               
                               <YAxis yAxisId="yClima" orientation="left" tick={{fontSize: 10, fill: '#888'}} domain={['dataMin - 2', 'dataMax + 2']} allowDataOverflow />
                               <YAxis yAxisId="yHum" orientation="right" tick={{fontSize: 10, fill: '#888'}} hide />
                               
                               <Tooltip content={<CustomTooltip />} />
                               <Legend wrapperStyle={{ fontSize: '12px' }} />
                               
                               <Line yAxisId="yClima" type="monotone" dataKey="Temp" stroke="#facc15" strokeWidth={2} dot={false} name="Temperatura °C" connectNulls />
                               <Line yAxisId="yHum" type="monotone" dataKey="Hum" stroke="#38bdf8" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Humedad %" connectNulls />
                               
                               <Scatter yAxisId="yClima" dataKey="evento" fill="#22c55e" shape="circle" name="Marcador Evento (Riego, Plaga, etc)" />
                           </ComposedChart>
                       </ResponsiveContainer>
                    )}
                </div>
            </GlassCard>

            {/* Timeline Filter Textual */}
            <div className="flex bg-panel-base border border-panel-border rounded-xl p-2 gap-2 shadow-lg backdrop-blur-md sticky top-4 z-40 overflow-x-auto mt-4">
                <button onClick={() => setFilterCategory("all")} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-colors whitespace-nowrap \${filterCategory === 'all' ? 'bg-indigo-600 text-white' : 'hover:bg-black/20 text-brand-slate-400'}`}>
                    <Funnel size={16} /> Ver Todos
                </button>
                <button onClick={() => setFilterCategory("Fase")} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-colors whitespace-nowrap \${filterCategory === 'Fase' ? 'bg-yellow-600 text-white' : 'hover:bg-black/20 text-brand-slate-400'}`}>
                    Fotoperiodos & Fases
                </button>
                <button onClick={() => setFilterCategory("riego")} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-colors whitespace-nowrap \${filterCategory === 'riego' ? 'bg-blue-600 text-white' : 'hover:bg-black/20 text-brand-slate-400'}`}>
                    Riegos
                </button>
                <button onClick={() => setFilterCategory("nutricion")} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-colors whitespace-nowrap \${filterCategory === 'nutricion' ? 'bg-purple-600 text-white' : 'hover:bg-black/20 text-brand-slate-400'}`}>
                    Nutrición
                </button>
                <button onClick={() => setFilterCategory("poda")} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-colors whitespace-nowrap \${filterCategory === 'poda' ? 'bg-emerald-600 text-white' : 'hover:bg-black/20 text-brand-slate-400'}`}>
                    Poda
                </button>
            </div>

            {/* Timeline Textual UI */}
            <GlassCard className="p-6 relative z-10">
                {loading ? (
                    <div className="py-20 text-center font-mono opacity-50 flex flex-col items-center gap-3">
                        <Clock size={32} className="animate-spin" />
                        <span>Levantando Archivos Sensoriales...</span>
                    </div>
                ) : filteredEventsTimeline.length === 0 ? (
                    <div className="py-20 text-center font-mono opacity-50 border border-dashed border-panel-border rounded-xl">
                        No hay eventos biológicos registrados en las fechas seleccionadas.
                    </div>
                ) : (
                    <div className="relative border-l-2 border-panel-border/50 ml-4 py-4 flex flex-col gap-8">
                        {filteredEventsTimeline.map((evt, idx) => {
                            const dateObj = new Date(evt.date_occurred);
                            const style = getEventIconAndColor(evt.event_type);
                            return (
                                <div key={idx} className="relative pl-6 sm:pl-8 group hover:-translate-y-1 transition-transform">
                                    <div className={`absolute -left-[5px] top-1.5 w-[10px] h-[10px] rounded-full scale-100 group-hover:scale-150 transition-transform \${style.bg} border border-\${style.border} shadow-[0_0_10px_rgba(255,255,255,0.1)]`} 
                                         style={{ backgroundColor: 'var(--bg-dark)' }}
                                    ></div>
                                    
                                    <div className={`p-4 md:p-5 rounded-xl border border-panel-border bg-black/10 hover:bg-black/30 transition-colors`}>
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider \${style.bg} \${style.color} border \${style.border}`}>
                                                    {evt.event_type}
                                                </span>
                                                <span className="text-[11px] font-mono text-brand-slate-400 flex items-center gap-1 bg-black/20 px-2 py-1 rounded border border-panel-border/30">
                                                    <Target size={12} /> LOTE: {evt.batch_id || '-'}
                                                </span>
                                            </div>
                                            <div className="text-[11px] font-mono opacity-60 flex items-center gap-1 bg-white/5 px-2 py-1 rounded w-max">
                                                <Calendar size={12}/> 
                                                <span>{dateObj.toLocaleDateString()}</span> • <span>{dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                            </div>
                                        </div>
                                        
                                        <p className="text-foreground leading-relaxed text-sm opacity-90 p-3 bg-black/20 border border-panel-border/50 rounded-lg">
                                            {evt.description}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </GlassCard>
        </div>
    );
}
