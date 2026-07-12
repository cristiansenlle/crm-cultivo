"use client";

import React, { useEffect, useState, useMemo } from "react";
import { GlassCard } from "../../components/ui/GlassCard";
import { 
  Info, Plant, Calendar, Thermometer, Drop, 
  ChartLineUp, Coins, CalendarCheck, FileText, 
  Printer, X, Tree, Gauge, ShieldCheck, ShoppingBag,
  Camera
} from "@phosphor-icons/react";
import { supabase } from "../../lib/supabase";
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend 
} from "recharts";

interface BatchReportModalProps {
  batch: any;
  onClose: () => void;
  onEditReport?: (batch: any) => void;
}

export function BatchReportModal({ batch, onClose, onEditReport }: BatchReportModalProps) {
  const [loading, setLoading] = useState(true);
  const [climateData, setClimateData] = useState<any[]>([]);
  const [soilData, setSoilData] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [partials, setPartials] = useState<any[]>([]);
  const [photoperiod, setPhotoperiod] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"clima" | "vpd" | "suelo" | "insumos">("clima");

  // Fechas del Ciclo
  const startDate = batch.start_date || batch.created_at;
  const endDate = batch.last_stage_date || new Date().toISOString();
  
  const totalDays = Math.max(1, Math.floor((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)));
  
  // Calcular días por etapa del historial
  const stageStats = useMemo(() => {
    const stats: Record<string, number> = { vegetativo: 0, floración: 0, cosecha: 0 };
    if (batch.stage_history && Array.isArray(batch.stage_history)) {
        batch.stage_history.forEach((sh: any) => {
            const stageName = (sh.stage || '').toLowerCase();
            if (stageName.includes('veg')) stats.vegetativo += sh.days || 0;
            else if (stageName.includes('flor') || stageName.includes('flow')) stats.floración += sh.days || 0;
            else if (stageName.includes('cos') || stageName.includes('harv')) stats.cosecha += sh.days || 0;
        });
    }
    // Si falta etapa actual en el historial
    const currentStage = (batch.stage || '').toLowerCase();
    const lastDate = batch.last_stage_date ? new Date(batch.last_stage_date) : new Date(startDate);
    const activeDays = Math.max(0, Math.floor((new Date().getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)));
    if (currentStage.includes('veg')) stats.vegetativo += activeDays;
    else if (currentStage.includes('flor')) stats.floración += activeDays;
    else if (currentStage.includes('cos')) stats.cosecha += activeDays;

    return stats;
  }, [batch, startDate]);

  const loadReportData = async () => {
      setLoading(true);
      try {
          const startIso = new Date(startDate).toISOString();
          const endIso = new Date(endDate).toISOString();

          // 1. Fetch Daily Telemetry (Clima de la Sala)
          const { data: rawClimate } = await supabase
              .from('daily_telemetry')
              .select('created_at, temperature_c, humidity_percent, vpd_ambient_kpa, vpd_leaf_kpa')
              .eq('room_id', batch.location)
              .gte('created_at', startIso)
              .lte('created_at', endIso)
              .order('created_at', { ascending: true });

          // Agrupar y promediar telemetría por día
          if (rawClimate) {
              const grouped: Record<string, { tempSum: number, humSum: number, vpdASum: number, vpdLSum: number, count: number }> = {};
              rawClimate.forEach((item: any) => {
                  const day = new Date(item.created_at).toISOString().split('T')[0];
                  if (!grouped[day]) {
                      grouped[day] = { tempSum: 0, humSum: 0, vpdASum: 0, vpdLSum: 0, count: 0 };
                  }
                  grouped[day].tempSum += Number(item.temperature_c || 0);
                  grouped[day].humSum += Number(item.humidity_percent || 0);
                  grouped[day].vpdASum += Number(item.vpd_ambient_kpa || item.vpd_kpa || 0);
                  grouped[day].vpdLSum += Number(item.vpd_leaf_kpa || item.vpd_kpa || 0);
                  grouped[day].count += 1;
              });

              const processedClimate = Object.entries(grouped).map(([date, data]) => ({
                  date: new Date(date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }),
                  temp: Number((data.tempSum / data.count).toFixed(1)),
                  humidity: Number((data.humSum / data.count).toFixed(1)),
                  vpdAmbient: Number((data.vpdASum / data.count).toFixed(2)),
                  vpdLeaf: Number((data.vpdLSum / data.count).toFixed(2))
              }));
              setClimateData(processedClimate);
          }

          // 2. Fetch Soil Telemetry
          const { data: soilSensors } = await supabase
              .from('core_soil_sensors')
              .select('id')
              .eq('room_id', batch.location);

          if (soilSensors && soilSensors.length > 0) {
              const sensorIds = soilSensors.map((s: any) => s.id);
              const { data: rawSoil } = await supabase
                  .from('soil_telemetry')
                  .select('created_at, moisture_pct, sensor_id')
                  .in('sensor_id', sensorIds)
                  .gte('created_at', startIso)
                  .lte('created_at', endIso)
                  .order('created_at', { ascending: true });

              if (rawSoil) {
                  const groupedSoil: Record<string, { sum: number, count: number }> = {};
                  rawSoil.forEach((item: any) => {
                      const day = new Date(item.created_at).toISOString().split('T')[0];
                      if (!groupedSoil[day]) {
                          groupedSoil[day] = { sum: 0, count: 0 };
                      }
                      groupedSoil[day].sum += Number(item.moisture_pct || 0);
                      groupedSoil[day].count += 1;
                  });

                  const processedSoil = Object.entries(groupedSoil).map(([date, data]) => ({
                      date: new Date(date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }),
                      moisture: Number((data.sum / data.count).toFixed(1))
                  }));
                  setSoilData(processedSoil);
              }
          }

          // 3. Fetch Agronomic Events
          const { data: eventsData } = await supabase
              .from('core_agronomic_events')
              .select('*')
              .eq('batch_id', batch.id)
              .order('date_occurred', { ascending: true });
          if (eventsData) setEvents(eventsData);

          // 4. Fetch Partial Harvests
          const { data: partialsData } = await supabase
              .from('core_partial_harvests')
              .select('*')
              .eq('batch_id', batch.id)
              .order('harvest_date', { ascending: true });
          if (partialsData) setPartials(partialsData);

          // 5. Fetch Photoperiod History
          const { data: photoData } = await supabase
              .from('core_photoperiod_history')
              .select('*')
              .eq('batch_id', batch.id)
              .order('start_date', { ascending: true });
          if (photoData) setPhotoperiod(photoData);

      } catch (e) {
          console.error("Error loading report metrics:", e);
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
      loadReportData();
  }, [batch]);

  // Totales
  const totalCost = events.reduce((sum: number, e: any) => sum + Number(e.total_cost || 0), 0);
  const totalWater = events.reduce((sum: number, e: any) => sum + Number(e.water_liters || 0), 0);
  const totalGrams = partials.reduce((sum: number, p: any) => sum + Number(p.weight_dry || 0), 0);
  const avgCostPerGram = totalGrams > 0 ? (totalCost / totalGrams) : 0;
  
  const originalPlants = (batch.stage_history && batch.stage_history.length > 0)
      ? batch.num_plants + partials.reduce((sum: number, p: any) => sum + Number(p.plants_harvested || 0), 0)
      : batch.num_plants || 1;

  const yieldPerPlant = totalGrams > 0 ? (totalGrams / originalPlants) : 0;

  const handlePrint = () => {
      window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto print:p-0 print:bg-white print:relative print:z-0">
      <div className="max-w-5xl w-full h-[90vh] bg-panel-base border border-panel-border rounded-2xl flex flex-col shadow-2xl overflow-hidden print:w-full print:h-auto print:border-none print:shadow-none print:overflow-visible">
        
        {/* Header (No imprimible) */}
        <div className="flex justify-between items-center p-6 border-b border-panel-border/60 bg-black/10 print:hidden">
          <h2 className="text-xl font-bold flex items-center gap-2 text-emerald-500">
            <FileText size={24} /> Reporte de Cultivo Finalizado
          </h2>
          <div className="flex items-center gap-2">
            {onEditReport && (
              <button onClick={() => onEditReport(batch)} className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-600/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-600 hover:text-white rounded-lg transition-colors font-bold text-xs">
                <Camera size={16} /> Subir Fotos / Notas
              </button>
            )}
            <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600 hover:text-white rounded-lg transition-colors font-bold text-xs">
              <Printer size={16} /> Imprimir PDF
            </button>
            <button onClick={onClose} className="p-1.5 text-brand-slate-600 hover:text-foreground hover:bg-white/5 rounded-lg transition-all">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 print:p-0 print:overflow-visible">
          
          {/* Printable Header */}
          <div className="hidden print:flex flex-col gap-2 border-b-2 border-slate-300 pb-4 mb-6">
            <h1 className="text-3xl font-extrabold text-slate-800">REPORTE FINAL DE CULTIVO</h1>
            <p className="text-sm font-mono text-slate-500">Generado de forma automática por CRM Cultivo • {new Date().toLocaleDateString()}</p>
          </div>

          {/* Ficha Resumen Lote */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Lote Metadata */}
            <GlassCard className="p-5 flex flex-col gap-3 relative overflow-hidden border-t-2 border-t-emerald-500">
              <h3 className="text-md font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2"><Tree size={18}/> Genética</h3>
              <div className="font-black text-2xl text-foreground mt-1">{batch.id}</div>
              <div className="flex flex-col gap-1 text-xs font-mono text-brand-slate-600 mt-2">
                <span>Cepa: <b>{batch.strain || 'S/N'}</b></span>
                <span>Origen: <b>{batch.origen || 'Clon'}</b></span>
                <span>Población Inicial: <b>{originalPlants} plantas</b></span>
                <span>Inicio: <b>{new Date(startDate).toLocaleDateString()}</b></span>
                <span>Fin: <b>{new Date(endDate).toLocaleDateString()}</b></span>
              </div>
            </GlassCard>

            {/* Ciclo Tiempos */}
            <GlassCard className="p-5 flex flex-col gap-3 relative overflow-hidden border-t-2 border-t-purple-500">
              <h3 className="text-md font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2"><CalendarCheck size={18}/> Duración Ciclo</h3>
              <div className="font-black text-2xl text-foreground mt-1">{totalDays} Días Totales</div>
              <div className="flex flex-col gap-1.5 text-xs font-mono text-brand-slate-600 mt-2">
                <div className="flex justify-between border-b border-panel-border/30 pb-0.5">
                  <span>Vegetativo 🌱:</span>
                  <span className="font-bold text-foreground">{stageStats.vegetativo} días</span>
                </div>
                <div className="flex justify-between border-b border-panel-border/30 pb-0.5">
                  <span>Floración 🌸:</span>
                  <span className="font-bold text-purple-400">{stageStats.floración} días</span>
                </div>
                <div className="flex justify-between">
                  <span>Cosecha ✂️:</span>
                  <span className="font-bold text-orange-400">{stageStats.cosecha} días</span>
                </div>
              </div>
            </GlassCard>

            {/* Rendimiento Económico */}
            <GlassCard className="p-5 flex flex-col gap-3 relative overflow-hidden border-t-2 border-t-orange-500">
              <h3 className="text-md font-bold uppercase tracking-wider text-orange-400 flex items-center gap-2"><Coins size={18}/> Balanza Agronómica</h3>
              <div className="font-black text-2xl text-status-green mt-1">{totalGrams.toFixed(1)}g Totales</div>
              <div className="flex flex-col gap-1 text-xs font-mono text-brand-slate-600 mt-2">
                <span>Rend. por Planta: <b>{yieldPerPlant.toFixed(2)} g/planta</b></span>
                <span>Inversión OpEx: <b>${totalCost.toLocaleString('es-AR')}</b></span>
                <span className="text-status-yellow font-bold mt-1">Costo Unitario: ${(avgCostPerGram).toFixed(2)} /g</span>
                <span>Consumo H2O: <b>{totalWater} litros</b></span>
              </div>
            </GlassCard>
          </div>

          {/* Notas de Cosecha y Fotos */}
          <GlassCard className="p-6 border-l-4 border-l-orange-500 bg-orange-500/5 print:break-inside-avoid">
            <h3 className="text-lg font-bold text-orange-400 flex items-center gap-2 mb-4">
              <ShieldCheck size={22}/> Bitácora de Cosecha & Fotos Finales
            </h3>
            {batch.harvest_notes || (batch.harvest_photos && batch.harvest_photos.length > 0) ? (
              <>
                {batch.harvest_notes && (
                  <p className="text-sm italic text-brand-slate-700 dark:text-slate-300 font-sans mb-4 whitespace-pre-wrap">
                    "{batch.harvest_notes}"
                  </p>
                )}
                {batch.harvest_photos && batch.harvest_photos.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-2">
                    {batch.harvest_photos.map((url: string, index: number) => (
                      <div key={index} className="aspect-square rounded-xl overflow-hidden border border-panel-border/50 relative group bg-black/10">
                        <img src={url} alt={`Cosecha ${index + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-6 print:hidden">
                <p className="text-sm text-brand-slate-600 mb-3 font-sans">No se han registrado conclusiones ni fotos para esta cosecha.</p>
                {onEditReport && (
                  <button 
                    onClick={() => onEditReport(batch)}
                    className="px-4 py-2 bg-orange-600/20 text-orange-400 border border-orange-500/30 hover:bg-orange-600 hover:text-white rounded-lg transition-colors font-bold text-xs"
                  >
                    📷 Subir Fotos y Conclusión ahora
                  </button>
                )}
              </div>
            )}
          </GlassCard>

          {/* Gráficos de Telemetría */}
          <GlassCard className="p-6 print:break-inside-avoid">
            {/* Tabs (No imprimibles) */}
            <div className="flex gap-2 border-b border-panel-border/50 pb-3 mb-6 print:hidden">
              <button 
                onClick={() => setActiveTab("clima")}
                className={`px-4 py-2 text-xs font-bold uppercase rounded-lg transition-colors flex items-center gap-1.5 ${activeTab === 'clima' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'text-brand-slate-600 hover:bg-white/5'}`}
              >
                <Thermometer size={14}/> Temperatura y Humedad
              </button>
              <button 
                onClick={() => setActiveTab("vpd")}
                className={`px-4 py-2 text-xs font-bold uppercase rounded-lg transition-colors flex items-center gap-1.5 ${activeTab === 'vpd' ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30' : 'text-brand-slate-600 hover:bg-white/5'}`}
              >
                <Gauge size={14}/> VPD (Déficit Presión)
              </button>
              {soilData.length > 0 && (
                <button 
                  onClick={() => setActiveTab("suelo")}
                  className={`px-4 py-2 text-xs font-bold uppercase rounded-lg transition-colors flex items-center gap-1.5 ${activeTab === 'suelo' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-brand-slate-600 hover:bg-white/5'}`}
                >
                  <Drop size={14}/> Humedad Suelo (%)
                </button>
              )}
              <button 
                onClick={() => setActiveTab("insumos")}
                className={`px-4 py-2 text-xs font-bold uppercase rounded-lg transition-colors flex items-center gap-1.5 ${activeTab === 'insumos' ? 'bg-status-yellow/10 text-status-yellow border border-status-yellow/30' : 'text-brand-slate-600 hover:bg-white/5'}`}
              >
                <ShoppingBag size={14}/> Insumos Aplicados
              </button>
            </div>

            {/* Display de Gráficas */}
            {loading ? (
              <div className="py-20 text-center font-mono opacity-50">Cargando Historial...</div>
            ) : (
              <div className="w-full">
                
                {/* 1. CLIMA CHART */}
                {(activeTab === 'clima' || typeof window === 'undefined') && (
                  <div className="flex flex-col gap-3">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2 mb-2"><Thermometer size={16}/> Comportamiento Climático (Vida del Lote)</h4>
                    {climateData.length === 0 ? (
                        <p className="text-xs text-brand-slate-600 italic py-10 text-center">Sin registros telemétricos de clima para este periodo.</p>
                    ) : (
                      <div className="h-[280px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={climateData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                            <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
                            <YAxis yAxisId="left" stroke="#34d399" fontSize={10} name="Temp" unit="°C" />
                            <YAxis yAxisId="right" orientation="right" stroke="#60a5fa" fontSize={10} name="Humedad" unit="%" />
                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Line yAxisId="left" type="monotone" dataKey="temp" name="Temperatura (°C)" stroke="#34d399" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                            <Line yAxisId="right" type="monotone" dataKey="humidity" name="Humedad (%)" stroke="#60a5fa" strokeWidth={2} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. VPD CHART */}
                {activeTab === 'vpd' && (
                  <div className="flex flex-col gap-3">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2 mb-2"><Gauge size={16}/> Estrés de Transpiración (VPD)</h4>
                    {climateData.length === 0 ? (
                        <p className="text-xs text-brand-slate-600 italic py-10 text-center">Sin registros de VPD para este periodo.</p>
                    ) : (
                      <div className="h-[280px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={climateData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                            <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
                            <YAxis stroke="#a78bfa" fontSize={10} unit=" kPa" />
                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Line type="monotone" dataKey="vpdAmbient" name="VPD Ambiental (kPa)" stroke="#a78bfa" strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="vpdLeaf" name="VPD de Hoja (kPa)" stroke="#f472b6" strokeWidth={2} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. SOIL CHART */}
                {activeTab === 'suelo' && soilData.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-blue-400 flex items-center gap-2 mb-2"><Drop size={16}/> Humedad del Sustrato</h4>
                    <div className="h-[280px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={soilData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                          <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
                          <YAxis stroke="#3b82f6" fontSize={10} unit="%" />
                          <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Line type="monotone" dataKey="moisture" name="Humedad del Suelo (%)" stroke="#3b82f6" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* 4. INSUMOS LIST */}
                {activeTab === 'insumos' && (
                  <div className="flex flex-col gap-3">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-status-yellow flex items-center gap-2 mb-2"><ShoppingBag size={16}/> Historial de Nutrición y Agroquímicos</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono">
                        <thead>
                          <tr className="border-b border-panel-border/50 text-brand-slate-600 pb-2">
                            <th className="py-2">Fecha</th>
                            <th className="py-2">Evento</th>
                            <th className="py-2">Producto</th>
                            <th className="py-2 text-right">Cantidad</th>
                            <th className="py-2 text-right">Agua (L)</th>
                            <th className="py-2 text-right">Costo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {events.map((e, idx) => (
                            <tr key={idx} className="border-b border-panel-border/20 hover:bg-black/5">
                              <td className="py-2">{new Date(e.date_occurred).toLocaleDateString()}</td>
                              <td className="py-2 capitalize font-bold text-foreground">{e.event_type}</td>
                              <td className="py-2 opacity-80">{e.description || '-'}</td>
                              <td className="py-2 text-right">{e.amount_applied ? `${e.amount_applied}g/ml` : '-'}</td>
                              <td className="py-2 text-right">{e.water_liters || '-'}</td>
                              <td className="py-2 text-right text-status-yellow">${Number(e.total_cost || 0).toFixed(2)}</td>
                            </tr>
                          ))}
                          {events.length === 0 && <tr><td colSpan={6} className="py-8 text-center opacity-40">Sin eventos registrados.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              </div>
            )}
          </GlassCard>

          {/* Historial de Cosechas Parciales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:break-inside-avoid">
            {/* Tabla Tandas */}
            <GlassCard className="p-5 flex flex-col gap-3">
              <h3 className="text-md font-bold uppercase tracking-wider text-orange-400 flex items-center gap-2 mb-2"><X size={18}/> Desglose de Tandas</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-panel-border/50 text-brand-slate-600">
                      <th className="py-2">Tanda</th>
                      <th className="py-2">Fecha</th>
                      <th className="py-2 text-right">Plantas</th>
                      <th className="py-2 text-right">Peso Seco</th>
                      <th className="py-2 text-right">OpEx</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partials.map((p, idx) => (
                      <tr key={idx} className="border-b border-panel-border/20">
                        <td className="py-2 font-bold text-foreground">{p.tanda_name}</td>
                        <td className="py-2">{new Date(p.harvest_date).toLocaleDateString()}</td>
                        <td className="py-2 text-right">{p.plants_harvested}</td>
                        <td className="py-2 text-right text-orange-400 font-bold">{p.weight_dry}g</td>
                        <td className="py-2 text-right text-status-green">${Number(p.opex_allocated || 0).toFixed(0)}</td>
                      </tr>
                    ))}
                    {partials.length === 0 && <tr><td colSpan={5} className="py-4 text-center opacity-40">Sin cosechas ingresadas.</td></tr>}
                  </tbody>
                </table>
              </div>
            </GlassCard>

            {/* Historial Fotoperiodo */}
            <GlassCard className="p-5 flex flex-col gap-3">
              <h3 className="text-md font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2 mb-2"><Calendar size={18}/> Historial de Fotoperiodo</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-panel-border/50 text-brand-slate-600">
                      <th className="py-2">Ciclo Luz/Osc</th>
                      <th className="py-2">Desde</th>
                      <th className="py-2">Hasta</th>
                      <th className="py-2 text-right">Auto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {photoperiod.map((ph, idx) => (
                      <tr key={idx} className="border-b border-panel-border/20">
                        <td className="py-2 font-bold text-foreground">{ph.light_hours} hs / {ph.dark_hours} hs</td>
                        <td className="py-2">{new Date(ph.start_date).toLocaleDateString()}</td>
                        <td className="py-2">{ph.end_date ? new Date(ph.end_date).toLocaleDateString() : 'Activo/Fin'}</td>
                        <td className="py-2 text-right">{ph.auto_trigger ? 'Sí' : 'No'}</td>
                      </tr>
                    ))}
                    {photoperiod.length === 0 && <tr><td colSpan={4} className="py-4 text-center opacity-40">Sin cambios registrados.</td></tr>}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </div>

        </div>

      </div>
    </div>
  );
}
