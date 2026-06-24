"use client";

import React, { useEffect, useState } from "react";
import { GlassCard } from "../../components/ui/GlassCard";
import { ProjectorScreenChart, Calendar, Target, Clock, Funnel, MapPinLine, Thermometer } from "@phosphor-icons/react";
import { supabase } from "../../lib/supabase";
import { ResponsiveContainer, ComposedChart, Line, Scatter, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

const PRODUCT_COLORS = ['#ec4899', '#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#14b8a6', '#6366f1'];

export default function AgronomyTimelinePage() {
    // Master Lists
    const [rooms, setRooms] = useState<any[]>([]);
    const [ambientSensors, setAmbientSensors] = useState<any[]>([]);
    const [soilSensors, setSoilSensors] = useState<any[]>([]);
    
    // UI Filter States
    const [chartType, setChartType] = useState<"ambient" | "soil" | "nutrition">("ambient");
    const [startDate, setStartDate] = useState(() => {
       const d = new Date(); d.setDate(d.getDate() - 15);
       return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [selectedRoom, setSelectedRoom] = useState("all");
    const [selectedSensor, setSelectedSensor] = useState("all");

    // Timeline Specific Filters
    const [selectedBatchTimeline, setSelectedBatchTimeline] = useState("all");
    const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
    
    // Extracted Master Lists from Events
    const [availableBatches, setAvailableBatches] = useState<string[]>([]);
    const [availableProducts, setAvailableProducts] = useState<string[]>([]);

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
            if(sn) setAmbientSensors(sn);
            const { data: soilSn } = await supabase.from('core_soil_sensors').select('id, name, room_id');
            if(soilSn) setSoilSensors(soilSn);
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
            
            if (evs) {
                // Extract Batches and Products from loaded events BEFORE filtering
                const batchSet = new Set<string>();
                const prodSet = new Set<string>();
                
                evs.forEach((e:any) => {
                    if (e.batch_id) batchSet.add(e.batch_id);
                    if (e.description && e.description.includes('--- Bot Auto-Deductions ---')) {
                        const parts = e.description.split('--- Bot Auto-Deductions ---');
                        if (parts.length > 1) {
                            const lines = parts[1].split('\n');
                            for (const line of lines) {
                                if (line.includes(':')) {
                                    prodSet.add(line.split(':')[0].trim());
                                }
                            }
                        }
                    }
                });
                setAvailableBatches(Array.from(batchSet));
                setAvailableProducts(Array.from(prodSet));
                setEvents(evs);
            }

            // Tel Query
            const telTable = chartType === "ambient" ? 'daily_telemetry' : 'soil_telemetry';
            let telQ = supabase.from(telTable).select('*')
                .gte('created_at', startDate + "T00:00:00")
                .lte('created_at', endDate + "T23:59:59")
                .order('created_at', { ascending: true });
            
            if (selectedRoom !== 'all') telQ = telQ.eq('room_id', selectedRoom);
            if (selectedSensor !== 'all') telQ = telQ.eq('sensor_id', selectedSensor);

            const { data: tel } = await telQ;
            
            if (tel) {
                // Agrupar registros por etiqueta de tiempo para promediar lecturas coincidentes
                const groupedMap = new Map();

                tel.forEach((t:any) => {
                    const d = new Date(t.created_at);
                    // Redondear minutos a intervalos de 10 min para mayor suavidad en el promedio si se envían datos asincronizados
                    const min = d.getMinutes();
                    d.setMinutes(Math.floor(min / 10) * 10, 0, 0);
                    
                    const tLabel = d.toLocaleDateString([],{day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'});
                    
                    if(!groupedMap.has(tLabel)) {
                         groupedMap.set(tLabel, {
                             timeLabel: tLabel,
                             timestamp: d.getTime(),
                             tempSum: 0, tempCount: 0,
                             humSum: 0, humCount: 0,
                             vpdSum: 0, vpdCount: 0,
                             soilSum: 0, soilCount: 0,
                             evento: null, eventDesc: '', eventType: ''
                         });
                    }

                    const record = groupedMap.get(tLabel);
                    if (chartType === "ambient") {
                        const temp = parseFloat(t.temperature_c);
                        if(!isNaN(temp)) { record.tempSum += temp; record.tempCount++; }
                        const hum = parseFloat(t.humidity_percent);
                        if(!isNaN(hum)) { record.humSum += hum; record.humCount++; }
                        const vpd = parseFloat(t.vpd_kpa);
                        if(!isNaN(vpd)) { record.vpdSum += vpd; record.vpdCount++; }
                    } else {
                        const soil = parseFloat(t.moisture_pct);
                        if(!isNaN(soil)) { record.soilSum += soil; record.soilCount++; }
                    }
                });

                // Generar consolidado unificado promediado
                const baseNutriObj: any = {};
                selectedProducts.forEach(p => { baseNutriObj[`nutri_${p}`] = null; });

                const consolidated: any[] = Array.from(groupedMap.values()).map(r => ({
                    timeLabel: r.timeLabel,
                    timestamp: r.timestamp,
                    Temp: r.tempCount > 0 ? Number((r.tempSum / r.tempCount).toFixed(2)) : null,
                    Hum: r.humCount > 0 ? Number((r.humSum / r.humCount).toFixed(2)) : null,
                    VPD: r.vpdCount > 0 ? Number((r.vpdSum / r.vpdCount).toFixed(2)) : null,
                    Soil: r.soilCount > 0 ? Number((r.soilSum / r.soilCount).toFixed(2)) : null,
                    evento: null, eventDesc: '', eventType: '',
                    ...baseNutriObj
                }));

                if (evs) {
                    evs.forEach((e:any) => {
                        // Filter by batch (if not all)
                        if (selectedBatchTimeline !== "all" && e.batch_id !== selectedBatchTimeline) return;

                        const ed = new Date(e.date_occurred);
                        const evType = (e.event_type || '').toLowerCase();
                        let evtKey = 'evento_otro';
                        if(evType.includes('riego') || evType.includes('nutri') || evType.includes('agua')) evtKey = 'evento_riego';
                        else if(evType.includes('poda')) evtKey = 'evento_poda';
                        else if(evType.includes('manejo')) evtKey = 'evento_manejo';
                        else if(evType.includes('alerta') || evType.includes('plaga') || evType.includes('ipm')) evtKey = 'evento_alerta';
                        else if(evType.includes('fase') || evType.includes('foto')) evtKey = 'evento_fase';

                        const eventObj: any = {
                            timeLabel: ed.toLocaleDateString([],{day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'}),
                            timestamp: ed.getTime(),
                            Temp: null, Hum: null, VPD: null, Soil: null,
                            [evtKey]: 1, // Se ubicará en la parte inferior gracias a un eje Y independiente
                            eventDesc: e.description,
                            eventType: e.event_type,
                            ...baseNutriObj
                        };

                        // Extract Dose for selected products
                        if (e.description && e.description.includes('--- Bot Auto-Deductions ---')) {
                            const parts = e.description.split('--- Bot Auto-Deductions ---');
                            if (parts.length > 1) {
                                const lines = parts[1].split('\n');
                                for (const line of lines) {
                                    if (line.includes(':')) {
                                        const [namePart, rest] = line.split(':');
                                        const pName = namePart.trim();
                                        if (selectedProducts.includes(pName)) {
                                            const amountMatch = rest.match(/([0-9.]+)\s*(ml|g|L|kg)?/i);
                                            if (amountMatch) {
                                                eventObj[`nutri_${pName}`] = parseFloat(amountMatch[1]);
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        consolidated.push(eventObj);
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
    }, [startDate, endDate, selectedRoom, selectedSensor, chartType, selectedBatchTimeline, selectedProducts]);

    // Realtime subscription for telemetry
    useEffect(() => {
        const channel = supabase
            .channel('telemetry_changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'daily_telemetry'
                },
                (payload: any) => {
                    console.log('Realtime telemetry inserted:', payload);
                    loadData();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
        // eslint-disable-next-line
    }, [startDate, endDate, selectedRoom, selectedSensor, chartType]);

    // UI Helpers
    const filteredEventsTimeline = events.filter(e => {
        const passBatch = selectedBatchTimeline === "all" || e.batch_id === selectedBatchTimeline;
        let passCategory = true;
        if (filterCategory !== "all") {
             const evType = (e.event_type || "").toLowerCase();
             passCategory = evType.includes(filterCategory.toLowerCase());
        }
        return passBatch && passCategory;
    });

    const getAvailableSensors = () => {
        if (selectedRoom === 'all') return [];
        const tSensors = chartType === "ambient" ? ambientSensors : soilSensors;
        return tSensors.filter(s => s.room_id === selectedRoom);
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
        return (
          <div className="bg-panel-base/90 backdrop-blur-md border border-panel-border p-3 rounded-lg shadow-xl font-mono text-xs z-50 relative">
            <p className="font-bold text-foreground mb-2">{label}</p>
            {payload.map((entry: any, index: number) => {
              if(entry.dataKey && entry.dataKey.startsWith('evento_')) {
                  return <div key={index} className="mt-2 font-bold max-w-[200px] whitespace-normal" style={{color: entry.color}}>[{entry.payload.eventType}] {entry.payload.eventDesc}</div>
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
        return { color: "text-brand-slate-600 dark:text-slate-400", bg: "bg-brand-slate-600/10", border: 'border-brand-slate-600/30' };
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
                        <label className="text-[10px] font-mono text-brand-slate-600 dark:text-slate-400 uppercase tracking-widest block mb-1">Fecha Inicio</label>
                        <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className="w-full bg-black/[0.05] dark:bg-black/30 border border-panel-border rounded p-2 text-sm text-foreground focus:border-indigo-500 outline-none" />
                    </div>
                    <div>
                        <label className="text-[10px] font-mono text-brand-slate-600 dark:text-slate-400 uppercase tracking-widest block mb-1">Fecha Fin</label>
                        <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} className="w-full bg-black/[0.05] dark:bg-black/30 border border-panel-border rounded p-2 text-sm text-foreground focus:border-indigo-500 outline-none" />
                    </div>
                    <div>
                        <label className="text-[10px] font-mono text-brand-slate-600 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-1"><MapPinLine/> Sala de Operación</label>
                        <select value={selectedRoom} onChange={e => { setSelectedRoom(e.target.value); setSelectedSensor("all"); }} className="w-full bg-black/[0.05] dark:bg-black/30 border border-panel-border rounded p-2 text-sm text-foreground focus:border-indigo-500 outline-none">
                            <option value="all">TODAS LAS SALAS GLOBALES</option>
                            {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-mono text-brand-slate-600 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-1"><Thermometer/> Aislamiento de Sensor</label>
                        <select value={selectedSensor} onChange={e=>setSelectedSensor(e.target.value)} disabled={selectedRoom === 'all'} className="w-full bg-black/[0.05] dark:bg-black/30 border border-panel-border rounded p-2 text-sm text-foreground focus:border-indigo-500 outline-none disabled:opacity-50">
                            {selectedRoom === 'all' ? (
                                <option value="all">Bloqueado (Varias Salas)</option>
                            ) : (
                                <>
                                  <option value="all">Promedio Real (Todos)</option>
                                  {getAvailableSensors().map(s => <option key={s.id} value={s.id}>Sensor: {s.name}</option>)}
                                </>
                            )}
                        </select>
                    </div>
                </div>

                {/* Second Row Filters (Events & Products) */}
                {chartType === "nutrition" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start border-t border-panel-border/30 pt-4 mt-4">
                    <div>
                        <label className="text-[10px] font-mono text-brand-slate-600 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-1">Aislamiento de Lote (Timeline)</label>
                        <select value={selectedBatchTimeline} onChange={e => setSelectedBatchTimeline(e.target.value)} className="w-full bg-black/[0.05] dark:bg-black/30 border border-panel-border rounded p-2 text-sm text-foreground focus:border-indigo-500 outline-none">
                            <option value="all">TODOS LOS LOTES EN RANGO</option>
                            {availableBatches.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-mono text-brand-slate-600 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-1">Dosis Productos (Nutrición)</label>
                        <div className="flex flex-wrap gap-2 p-2 bg-black/[0.05] dark:bg-black/30 border border-panel-border rounded min-h-[38px] items-center">
                            {availableProducts.length === 0 ? (
                                <span className="text-xs font-mono text-brand-slate-600 dark:text-slate-400 opacity-50">No se detectaron aplicaciones en este rango. Verifique si existen riegos con autodeducciones registradas en la bitácora.</span>
                            ) : (
                                availableProducts.map(prod => {
                                    const isSelected = selectedProducts.includes(prod);
                                    return (
                                        <button 
                                            key={prod}
                                            onClick={() => {
                                                if (isSelected) setSelectedProducts(prev => prev.filter(p => p !== prod));
                                                else setSelectedProducts(prev => [...prev, prod]);
                                            }}
                                            className={`px-2 py-1 text-[11px] font-bold rounded-md transition-colors ${isSelected ? 'bg-purple-600 text-white shadow-md border border-purple-500/50' : 'bg-black/20 text-brand-slate-600 dark:text-slate-400 hover:bg-black/40 border border-panel-border/30'}`}
                                        >
                                            {prod}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
                )}
            </GlassCard>

            {/* Tab Selector for Chart Type */}
            <div className="flex flex-wrap gap-2 p-1 bg-black/20 border border-panel-border rounded-xl w-fit mx-auto relative z-30 justify-center">
                 <button onClick={() => { setChartType("ambient"); setSelectedSensor("all"); }} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${chartType === "ambient" ? "bg-indigo-600 text-white shadow-md" : "text-brand-slate-600 dark:text-slate-400 hover:text-white"}`}>Telemetría Ambiental (Clima)</button>
                 <button onClick={() => { setChartType("soil"); setSelectedSensor("all"); }} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${chartType === "soil" ? "bg-blue-600 text-white shadow-md" : "text-brand-slate-600 dark:text-slate-400 hover:text-white"}`}>Humedad de Suelo</button>
                 <button onClick={() => { setChartType("nutrition"); setSelectedSensor("all"); }} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${chartType === "nutrition" ? "bg-purple-600 text-white shadow-md" : "text-brand-slate-600 dark:text-slate-400 hover:text-white"}`}>Nutrición</button>
            </div>

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
                               
                               <YAxis yAxisId="yClima" orientation="left" tick={{fontSize: 10, fill: '#888'}} domain={chartType === "ambient" ? ['dataMin - 2', 'dataMax + 2'] : [0, 100]} allowDataOverflow hide={chartType === "nutrition"} />
                               <YAxis yAxisId="yHum" orientation="right" tick={{fontSize: 10, fill: '#888'}} domain={[0, 100]} tickFormatter={(val) => `${val}%`} hide={chartType !== "ambient"} />
                               <YAxis yAxisId="yNutri" orientation={chartType === "nutrition" ? "left" : "right"} tick={{fontSize: 10, fill: '#a855f7'}} domain={[0, 'auto']} hide={chartType !== "nutrition" || selectedProducts.length === 0} tickFormatter={(val) => `${val} ml/g`} />
                               <YAxis yAxisId="yEvent" type="number" domain={[0, 15]} hide />
                               
                               <Tooltip content={<CustomTooltip />} />
                               <Legend wrapperStyle={{ fontSize: '12px' }} />
                               
                               {chartType === "ambient" && (
                                 <>
                                   <Line yAxisId="yClima" type="monotone" dataKey="Temp" stroke="#facc15" strokeWidth={2} dot={false} name="Temperatura °C" connectNulls />
                                   <Line yAxisId="yHum" type="monotone" dataKey="Hum" stroke="#38bdf8" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Humedad %" connectNulls />
                                 </>
                               )}

                               {chartType === "soil" && (
                                   <Line yAxisId="yClima" type="monotone" dataKey="Soil" stroke="#3b82f6" strokeWidth={2} dot={false} name="Humedad Suelo %" connectNulls />
                               )}

                               {/* Dynamic Nutrition Doses Lines */}
                               {selectedProducts.map((prod, idx) => (
                                   <Line 
                                       key={prod} 
                                       yAxisId="yNutri" 
                                       type="monotone" 
                                       dataKey={`nutri_${prod}`} 
                                       stroke={PRODUCT_COLORS[idx % PRODUCT_COLORS.length]} 
                                       strokeWidth={3} 
                                       dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} 
                                       activeDot={{ r: 8 }}
                                       name={`Dosis ${prod} (ml/g)`}  
                                       connectNulls 
                                   />
                               ))}
                               
                               <Scatter yAxisId="yEvent" dataKey="evento_riego" fill="#3b82f6" shape="circle" name="💧 Riego / Nutrición" />
                               <Scatter yAxisId="yEvent" dataKey="evento_poda" fill="#22c55e" shape="circle" name="✂️ Poda" />
                               <Scatter yAxisId="yEvent" dataKey="evento_manejo" fill="#a855f7" shape="square" name="🪴 Manejo Estructural" />
                               <Scatter yAxisId="yEvent" dataKey="evento_alerta" fill="#ef4444" shape="triangle" name="⚠️ Alerta / IPM" />
                               <Scatter yAxisId="yEvent" dataKey="evento_fase" fill="#facc15" shape="star" name="⏱️ Cambio de Fase" />
                               <Scatter yAxisId="yEvent" dataKey="evento_otro" fill="#94a3b8" shape="circle" name="📝 Otro Evento" />
                           </ComposedChart>
                       </ResponsiveContainer>
                    )}
                </div>
            </GlassCard>

            {/* Timeline Filter Textual */}
            <div className="flex bg-panel-base border border-panel-border rounded-xl p-2 gap-2 shadow-lg backdrop-blur-md sticky top-4 z-40 overflow-x-auto mt-4">
                <button onClick={() => setFilterCategory("all")} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-colors whitespace-nowrap \${filterCategory === 'all' ? 'bg-indigo-600 text-white' : 'hover:bg-black/[0.03] dark:bg-black/20 text-brand-slate-600 dark:text-slate-400'}`}>
                    <Funnel size={16} /> Ver Todos
                </button>
                <button onClick={() => setFilterCategory("Fase")} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-colors whitespace-nowrap \${filterCategory === 'Fase' ? 'bg-yellow-600 text-foreground' : 'hover:bg-black/[0.03] dark:bg-black/20 text-brand-slate-600 dark:text-slate-400'}`}>
                    Fotoperiodos & Fases
                </button>
                <button onClick={() => setFilterCategory("riego")} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-colors whitespace-nowrap \${filterCategory === 'riego' ? 'bg-blue-600 text-white' : 'hover:bg-black/[0.03] dark:bg-black/20 text-brand-slate-600 dark:text-slate-400'}`}>
                    Riegos
                </button>
                <button onClick={() => setFilterCategory("nutrici")} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-colors whitespace-nowrap \${filterCategory === 'nutrici' ? 'bg-purple-600 text-white' : 'hover:bg-black/[0.03] dark:bg-black/20 text-brand-slate-600 dark:text-slate-400'}`}>
                    Nutrición
                </button>
                <button onClick={() => setFilterCategory("poda")} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-colors whitespace-nowrap \${filterCategory === 'poda' ? 'bg-emerald-600 text-foreground' : 'hover:bg-black/[0.03] dark:bg-black/20 text-brand-slate-600 dark:text-slate-400'}`}>
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
                                    
                                    <div className={`p-4 md:p-5 rounded-xl border border-panel-border bg-black/10 hover:bg-black/[0.05] dark:bg-black/30 transition-colors`}>
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider \${style.bg} \${style.color} border \${style.border}`}>
                                                    {evt.event_type}
                                                </span>
                                                <span className="text-[11px] font-mono text-brand-slate-600 dark:text-slate-400 flex items-center gap-1 bg-black/[0.03] dark:bg-black/20 px-2 py-1 rounded border border-panel-border/30">
                                                    <Target size={12} /> LOTE: {evt.batch_id || '-'}
                                                </span>
                                            </div>
                                            <div className="text-[11px] font-mono opacity-60 flex items-center gap-1 bg-white/5 px-2 py-1 rounded w-max">
                                                <Calendar size={12}/> 
                                                <span>{dateObj.toLocaleDateString()}</span> • <span>{dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                            </div>
                                        </div>
                                        
                                        <p className="text-foreground leading-relaxed text-sm opacity-90 p-3 bg-black/[0.03] dark:bg-black/20 border border-panel-border/50 rounded-lg">
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
