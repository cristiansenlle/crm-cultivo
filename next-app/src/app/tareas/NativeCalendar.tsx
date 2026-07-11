"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { CaretLeft, CaretRight, Plus, CheckCircle, ClockCounterClockwise, Drop, Bug, Scissors, Warning, CalendarPlus, X, Copy, PencilSimple, Trash } from '@phosphor-icons/react';
import { supabase } from '../../lib/supabase';
import { GlassCard } from '../../components/ui/GlassCard';

export function NativeCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [rooms, setRooms] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [allBatches, setAllBatches] = useState<any[]>([]);

  // Task form state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskType, setTaskType] = useState('Riego');
  const [taskRoom, setTaskRoom] = useState('');
  const [taskBatch, setTaskBatch] = useState('');
  const [taskDate, setTaskDate] = useState('');
  const [taskTime, setTaskTime] = useState('');
  const [recurrenceDays, setRecurrenceDays] = useState('0');
  const [recurrenceCount, setRecurrenceCount] = useState('1');

  // Editing state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
    fetchRoomsAndBatches();
  }, [currentDate.getMonth(), currentDate.getFullYear()]);

  const fetchEvents = async () => {
    setLoading(true);
    // Fetch events for current month (plus padding for grid)
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 20);
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 10);
    
    const { data, error } = await supabase
      .from('core_agronomic_events')
      .select('*')
      .gte('date_occurred', start.toISOString())
      .lte('date_occurred', end.toISOString());
      
    if (data) {
      setEvents(data);
    }
    setLoading(false);
  };

  const fetchRoomsAndBatches = async () => {
    const { data: rData } = await supabase.from('core_rooms').select('id, name');
    const { data: bData } = await supabase.from('core_batches').select('id, strain, stage, room_id, location');
    if (rData) setRooms(rData);
    if (bData) {
        setAllBatches(bData);
        setBatches(bData.filter((b: any) => b.stage !== 'finalizado' && b.stage !== 'cosecha seca' && b.stage !== 'cosechado' && b.stage !== 'curado'));
    }
  };

  const getRoomName = (id: string) => rooms.find(r => r.id === id)?.name || `ID: ${id.substring(0,4)}`;
  const getBatchName = (id: string) => {
    const b = allBatches.find(b => b.id === id);
    return b ? `${id.substring(0,6)} - ${b.strain}` : `ID: ${id.substring(0,4)}`;
  };

  const filteredFormBatches = useMemo(() => {
    if (!taskRoom) return batches;
    return batches.filter(b => b.room_id === taskRoom || b.location === taskRoom);
  }, [batches, taskRoom]);

  // Calendar logic
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  
  const today = new Date();

  // Generate grid days
  const calendarGrid = useMemo(() => {
    const grid = [];
    const prevMonthDays = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0).getDate();
    
    // Previous month padding
    for (let i = 0; i < firstDayOfMonth; i++) {
      grid.push({
        day: prevMonthDays - firstDayOfMonth + i + 1,
        monthOffset: -1,
        date: new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, prevMonthDays - firstDayOfMonth + i + 1)
      });
    }
    
    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
      grid.push({
        day: i,
        monthOffset: 0,
        date: new Date(currentDate.getFullYear(), currentDate.getMonth(), i)
      });
    }
    
    // Next month padding
    const remainingSlots = 42 - grid.length; // 6 rows * 7 days
    for (let i = 1; i <= remainingSlots; i++) {
      grid.push({
        day: i,
        monthOffset: 1,
        date: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, i)
      });
    }
    
    return grid;
  }, [currentDate, daysInMonth, firstDayOfMonth]);

  const getEventsForDate = (date: Date) => {
    const start = new Date(date);
    start.setHours(0,0,0,0);
    const end = new Date(date);
    end.setHours(23,59,59,999);
    
    return events.filter(ev => {
      const evDate = new Date(ev.date_occurred);
      return evDate >= start && evDate <= end;
    });
  };

  const getEventIcon = (type: string) => {
    const t = type?.toLowerCase() || '';
    if (t.includes('riego') || t.includes('nutri')) return <Drop weight="fill" />;
    if (t.includes('ipm')) return <Bug weight="fill" />;
    if (t.includes('poda')) return <Scissors weight="fill" />;
    if (t.includes('alerta')) return <Warning weight="fill" />;
    return <CheckCircle weight="fill" />;
  };

  const getEventColor = (type: string) => {
    const t = type?.toLowerCase() || '';
    if (t.includes('riego') || t.includes('nutri')) return 'text-blue-400 bg-blue-500/20';
    if (t.includes('ipm')) return 'text-red-400 bg-red-500/20';
    if (t.includes('poda')) return 'text-green-400 bg-green-500/20';
    if (t.includes('alerta')) return 'text-yellow-400 bg-yellow-500/20';
    return 'text-emerald-400 bg-emerald-500/20';
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const payloads = [];
    const baseDate = new Date(`${taskDate}T${taskTime || '12:00'}:00`);
    const rDays = parseInt(recurrenceDays) || 0;
    const rCount = editingTaskId ? 1 : (parseInt(recurrenceCount) || 1);
    
    for (let i = 0; i < rCount; i++) {
      const occurrenceDate = new Date(baseDate.getTime() + i * rDays * 24 * 60 * 60 * 1000);
      
      payloads.push({
        description: taskTitle + (rCount > 1 ? ` (${i+1}/${rCount})` : ''),
        event_type: taskType,
        date_occurred: occurrenceDate.toISOString(),
        status: 'pending',
        room_id: taskRoom || null,
        batch_id: taskBatch || null,
      });
    }

    if (editingTaskId) {
      await supabase.from('core_agronomic_events').update(payloads[0]).eq('id', editingTaskId);
    } else {
      await supabase.from('core_agronomic_events').insert(payloads);
    }
    
    setShowTaskForm(false);
    setEditingTaskId(null);
    clearTaskForm();
    fetchEvents();
  };

  const clearTaskForm = () => {
    setTaskTitle('');
    setTaskType('Riego');
    setTaskRoom('');
    setTaskBatch('');
    setTaskDate('');
    setTaskTime('');
    setRecurrenceDays('0');
    setRecurrenceCount('1');
  };

  const handleMarkAsCompleted = async (ev: any) => {
    await supabase.from('core_agronomic_events').update({ status: 'completed' }).eq('id', ev.id);
    fetchEvents();
  };

  const handleDeleteTask = async (ev: any) => {
    if (window.confirm("¿Seguro que querés eliminar esta tarea programada?")) {
      await supabase.from('core_agronomic_events').delete().eq('id', ev.id);
      fetchEvents();
      if (selectedDay) {
        // Just refresh conceptually
        const d = selectedDay;
        setSelectedDay(null);
        setTimeout(() => setSelectedDay(d), 50);
      }
    }
  };

  const handleEditTask = (ev: any) => {
    const d = new Date(ev.date_occurred);
    setTaskTitle(ev.description || '');
    setTaskType(ev.event_type || 'Riego');
    setTaskRoom(ev.room_id || '');
    setTaskBatch(ev.batch_id || '');
    setTaskDate(d.toISOString().split('T')[0]);
    setTaskTime(d.toTimeString().substring(0,5));
    setEditingTaskId(ev.id);
    setShowTaskForm(true);
  };

  const handleCloneToFuture = (ev: any) => {
    // Open task form prefilled with past event details but empty date
    setTaskTitle(`(Clon) ${ev.description || ''}`);
    setTaskType(ev.event_type || 'Riego');
    setTaskRoom(ev.room_id || '');
    setTaskBatch(ev.batch_id || '');
    setTaskDate('');
    setTaskTime('');
    setEditingTaskId(null); // New task
    setShowTaskForm(true);
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 w-full">
      {/* CALENDAR SECTION */}
      <GlassCard className="flex-1 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold capitalize text-emerald-500">
            {currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="p-2 bg-black/[0.08] dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors">
              <CaretLeft size={20} />
            </button>
            <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 text-sm font-bold bg-black/[0.08] dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors">
              Hoy
            </button>
            <button onClick={nextMonth} className="p-2 bg-black/[0.08] dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors">
              <CaretRight size={20} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
            <div key={d} className="text-center text-xs font-bold text-brand-slate-600 uppercase tracking-widest">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {calendarGrid.map((slot, i) => {
            const isToday = slot.date.toDateString() === today.toDateString();
            const isSelected = selectedDay?.toDateString() === slot.date.toDateString();
            const dayEvents = getEventsForDate(slot.date);
            
            // Limit icons to show
            const displayEvents = dayEvents.slice(0, 3);
            const extraCount = dayEvents.length - 3;

            return (
              <div 
                key={i} 
                onClick={() => setSelectedDay(slot.date)}
                className={`
                  min-h-[80px] p-2 rounded-xl cursor-pointer border transition-all duration-200 flex flex-col
                  ${slot.monthOffset !== 0 ? 'opacity-30 bg-black/[0.01] dark:bg-black/10 border-transparent' : 'bg-black/[0.03] dark:bg-black/20 border-panel-border/50 hover:border-emerald-500/50'}
                  ${isToday ? 'ring-2 ring-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)_inset]' : ''}
                  ${isSelected ? 'border-emerald-500 bg-emerald-500/5' : ''}
                `}
              >
                <div className={`text-sm font-bold mb-1 ${isToday ? 'text-emerald-500' : 'text-brand-slate-600'}`}>
                  {slot.day}
                </div>
                
                <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                  {displayEvents.map((ev, idx) => (
                    <div key={idx} className={`text-[10px] truncate px-1.5 py-0.5 rounded font-mono flex items-center gap-1 ${ev.status === 'pending' ? 'border border-dashed opacity-80 ' + getEventColor(ev.event_type) : getEventColor(ev.event_type)}`} title={ev.description}>
                      {getEventIcon(ev.event_type)} 
                      {ev.status === 'pending' ? <span className="uppercase text-[8px] font-bold">PROG</span> : ''} {ev.event_type}
                    </div>
                  ))}
                  {extraCount > 0 && (
                    <div className="text-[10px] text-brand-slate-600 font-bold px-1">+ {extraCount} más</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* SIDEBAR FOR SELECTED DAY / TASK FORM */}
      <div className="w-full xl:w-96 flex flex-col gap-6">
        
        {/* NEW TASK BUTTON */}
        <GlassCard className="p-6 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <button 
              onClick={() => { clearTaskForm(); setEditingTaskId(null); setShowTaskForm(true); }}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all relative z-10 cursor-pointer"
            >
              <CalendarPlus size={24} /> Programar Tarea
            </button>
        </GlassCard>

        {/* TASK FORM MODAL */}
        {showTaskForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 p-4">
            <div className="bg-panel-base border border-emerald-500/50 w-full max-w-md rounded-2xl shadow-2xl flex flex-col slide-in-from-bottom-5 duration-300 relative overflow-hidden">
              <div className="p-6 border-b border-panel-border bg-emerald-500/5 flex justify-between items-center relative">
                <h3 className="font-bold text-lg text-emerald-500 flex items-center gap-2">
                  <CalendarPlus size={24} /> {editingTaskId ? "Editar Tarea" : "Nueva Tarea"}
                </h3>
                <button onClick={() => setShowTaskForm(false)} className="text-brand-slate-600 hover:text-white bg-black/10 rounded-lg p-2 transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6">
                <form onSubmit={handleSaveTask} className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-bold text-brand-slate-600 uppercase mb-1 block">Descripción</label>
                    <input required type="text" value={taskTitle} onChange={e=>setTaskTitle(e.target.value)} placeholder="Ej. Poda Apical" className="w-full bg-black/[0.03] dark:bg-black/20 border border-panel-border p-3 rounded-xl text-sm outline-none focus:border-emerald-500" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-brand-slate-600 uppercase mb-1 block">Tipo</label>
                      <select value={taskType} onChange={e=>setTaskType(e.target.value)} className="w-full bg-black/[0.03] dark:bg-black/20 border border-panel-border p-3 rounded-xl text-sm outline-none focus:border-emerald-500">
                        <option value="Riego">Riego / Nutri</option>
                        <option value="IPM">IPM (Plagas)</option>
                        <option value="Poda">Poda / Mant.</option>
                        <option value="Alerta">Inspección</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-brand-slate-600 uppercase mb-1 block">Fecha</label>
                      <input required type="date" value={taskDate} onChange={e=>setTaskDate(e.target.value)} className="w-full bg-black/[0.03] dark:bg-black/20 border border-panel-border p-3 rounded-xl text-sm outline-none focus:border-emerald-500" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-brand-slate-600 uppercase mb-1 block">Sala</label>
                      <select value={taskRoom} onChange={e=>setTaskRoom(e.target.value)} className="w-full bg-black/[0.03] dark:bg-black/20 border border-panel-border p-3 rounded-xl text-sm outline-none focus:border-emerald-500 truncate">
                        <option value="">-- Ninguna --</option>
                        {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-brand-slate-600 uppercase mb-1 block">Lote (Activos en sala)</label>
                      <select value={taskBatch} onChange={e=>setTaskBatch(e.target.value)} className="w-full bg-black/[0.03] dark:bg-black/20 border border-panel-border p-3 rounded-xl text-sm outline-none focus:border-emerald-500 truncate">
                        <option value="">-- Ninguno --</option>
                        {filteredFormBatches.map(b => <option key={b.id} value={b.id}>{b.id.substring(0,6)} - {b.strain}</option>)}
                      </select>
                    </div>
                  </div>

                  {!editingTaskId && (
                    <div className="grid grid-cols-2 gap-3 mt-1 border-t border-panel-border pt-4">
                      <div>
                        <label className="text-xs font-bold text-brand-slate-600 uppercase mb-1 block">Repetir cada (Días)</label>
                        <input type="number" min="0" value={recurrenceDays} onChange={e=>setRecurrenceDays(e.target.value)} className="w-full bg-black/[0.03] dark:bg-black/20 border border-panel-border p-3 rounded-xl text-sm outline-none focus:border-emerald-500" placeholder="0 = No repetir" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-brand-slate-600 uppercase mb-1 block">Cantidad de veces</label>
                        <input type="number" min="1" value={recurrenceCount} onChange={e=>setRecurrenceCount(e.target.value)} disabled={!recurrenceDays || recurrenceDays === '0'} className="w-full bg-black/[0.03] dark:bg-black/20 border border-panel-border p-3 rounded-xl text-sm outline-none focus:border-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed" />
                      </div>
                    </div>
                  )}

                  <button type="submit" className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold mt-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all">
                    {editingTaskId ? "Guardar Cambios" : "Programar en Calendario"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* SELECTED DAY DETAILS */}
        <GlassCard className="p-6 flex-1 flex flex-col max-h-[600px]">
          {selectedDay ? (
            <>
              <h3 className="font-bold text-lg mb-4 flex items-center justify-between border-b border-panel-border pb-3">
                <span>{selectedDay.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                <span className="text-xs bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-full font-mono">{getEventsForDate(selectedDay).length} eventos</span>
              </h3>
              
              <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-3">
                {getEventsForDate(selectedDay).length === 0 ? (
                  <div className="text-center text-sm font-mono text-brand-slate-600 my-10 opacity-50">Día sin actividad registrada.</div>
                ) : (
                  getEventsForDate(selectedDay).map((ev) => (
                    <div key={ev.id} className={`p-4 rounded-xl border ${ev.status === 'pending' ? 'border-dashed ' + getEventColor(ev.event_type) : getEventColor(ev.event_type)} flex flex-col gap-2 relative group`}>
                       <div className="flex justify-between items-start">
                          <span className="flex items-center gap-1.5 font-bold text-xs uppercase">
                            {getEventIcon(ev.event_type)} {ev.event_type}
                            {ev.status === 'pending' && <span className="bg-white/20 px-1.5 py-0.5 rounded text-[8px]">PROG</span>}
                          </span>
                          
                          {/* Actions */}
                          <div className="flex items-center gap-1 opacity-80 hover:opacity-100 transition-opacity">
                             {ev.status === 'pending' ? (
                               <>
                                 <button onClick={()=>handleMarkAsCompleted(ev)} className="p-1 bg-emerald-500 text-white rounded hover:bg-emerald-400" title="Marcar Realizada">
                                    <CheckCircle size={14} weight="bold" />
                                 </button>
                                 <button onClick={()=>handleEditTask(ev)} className="p-1 bg-black/20 text-white rounded hover:bg-black/40" title="Editar Tarea">
                                    <PencilSimple size={14} weight="bold" />
                                 </button>
                                 <button onClick={()=>handleDeleteTask(ev)} className="p-1 bg-red-500/80 text-white rounded hover:bg-red-500" title="Eliminar">
                                    <Trash size={14} weight="bold" />
                                 </button>
                               </>
                             ) : (
                               <button onClick={()=>handleCloneToFuture(ev)} className="p-1.5 bg-black/20 text-white rounded hover:bg-black/40 flex items-center gap-1 text-[10px] font-bold uppercase" title="Replicar Tarea al Futuro">
                                  <Copy size={12} weight="bold" /> Replicar
                               </button>
                             )}
                          </div>
                       </div>
                       
                       <p className="text-sm font-medium leading-snug">{ev.description}</p>
                       
                       {/* Metadata footers */}
                       <div className="flex flex-wrap gap-2 mt-2">
                         {ev.room_id && <span className="text-[10px] font-bold text-brand-slate-600 bg-black/[0.05] dark:bg-black/40 px-2 py-1 rounded-full border border-panel-border">SALA: {getRoomName(ev.room_id)}</span>}
                         {ev.batch_id && <span className="text-[10px] font-bold text-brand-slate-600 bg-black/[0.05] dark:bg-black/40 px-2 py-1 rounded-full border border-panel-border">LOTE: {getBatchName(ev.batch_id)}</span>}
                       </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full opacity-50">
              <ClockCounterClockwise size={48} className="text-brand-slate-600 mb-4" />
              <p className="text-sm font-mono text-center">Seleccioná un día en el calendario para ver su bitácora detallada y tareas.</p>
            </div>
          )}
        </GlassCard>

      </div>
    </div>
  );
}
