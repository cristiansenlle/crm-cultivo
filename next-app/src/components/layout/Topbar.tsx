"use client";

import React, { useState } from "react";
import { HouseLine, Plus, Sun, Moon, SignOut, X } from "@phosphor-icons/react";
import { usePathname } from "next/navigation";
import { useRoom } from "../../context/RoomContext";
import { supabase } from "../../lib/supabase";

export function Topbar() {
  const pathname = usePathname();
  const { rooms, selectedRoom, setSelectedRoom, refreshRooms } = useRoom();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomPhase, setNewRoomPhase] = useState("Vegetativo");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const getRouteTitle = () => {
    switch (pathname) {
      case "/": return "Operaciones de Cultivo en Vivo";
      case "/cultivo": return "Gestión de Salas y Lotes";
      case "/insumos": return "Bodega e Inventario";
      case "/tareas": return "Gestor Operativo";
      default: return "Command Center";
    }
  };

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName) return;
    setIsSubmitting(true);
    
    // UUID v4 generacion simplificada o Supabase lo hace solo si es uuid(). Default core_rooms debe auto-generarlo.
    const { data, error } = await supabase.from('core_rooms').insert([
        { name: newRoomName, phase: newRoomPhase }
    ]).select();

    if (!error && data) {
       await refreshRooms();
       setSelectedRoom(data[0]); // Seleccionarlo
       setNewRoomName("");
       setIsModalOpen(false);
    } else {
       alert("Fallo creando Sala: Asegúrese que la base de datos permite inserts.");
    }
    setIsSubmitting(false);
  };

  return (
    <>
    <header className="flex items-center justify-between px-4 lg:px-8 py-5 bg-gradient-to-b from-black/5 dark:from-black/40 to-transparent backdrop-blur-sm border-b border-panel-border z-10 sticky top-0">
      <h1 className="text-xl lg:text-2xl font-extrabold tracking-tight hidden sm:block">
        {getRouteTitle()}
      </h1>

      <div className="flex items-center gap-2 lg:gap-4 ml-auto">
        
        {/* Real Dynamic Room Selector */}
        <div className="flex items-center gap-2 lg:gap-3 bg-panel-base border border-panel-border px-3 py-2 rounded-xl backdrop-blur-md">
          <HouseLine size={20} className="text-status-green" />
          <select 
            className="bg-transparent border-none outline-none font-mono text-sm cursor-pointer form-select appearance-none focus:ring-0 pr-4 text-foreground w-[130px] lg:w-auto overflow-hidden text-ellipsis"
            value={selectedRoom?.id || ""}
            onChange={(e) => {
               const r = rooms.find(r => r.id === e.target.value);
               if(r) setSelectedRoom(r);
            }}
          >
            {rooms.length === 0 && <option value="">Sin Salas...</option>}
            {rooms.map(r => (
               <option key={r.id} value={r.id} className="bg-background text-foreground">{r.name} ({r.phase})</option>
            ))}
          </select>
        </div>

        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-emerald-600/20 text-emerald-500 border border-emerald-500/30 px-3 py-2 rounded-xl backdrop-blur-md hover:bg-emerald-600 hover:text-white transition-colors font-semibold text-sm">
          <Plus size={18} />
          <span className="hidden lg:inline">Nueva Sala</span>
        </button>

        <div className="h-8 w-px bg-panel-border mx-1 lg:mx-2"></div>

        <button 
          onClick={() => {
              if (document.documentElement.classList.contains('dark')) {
                 document.documentElement.classList.remove('dark');
                 localStorage.theme = 'light';
              } else {
                 document.documentElement.classList.add('dark');
                 localStorage.theme = 'dark';
              }
          }}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-panel-border bg-panel-base hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          title="Cambiar Iluminación"
        >
          <Sun size={18} className="dark:hidden text-amber-500 font-bold" />
          <Moon size={18} className="hidden dark:block text-indigo-400 font-bold" />
        </button>

        <div className="h-8 w-px bg-panel-border mx-1 lg:mx-2"></div>

        <button className="flex items-center gap-2 px-3 py-2 rounded-xl border border-status-red/30 bg-status-red/10 text-status-red hover:bg-status-red/20 transition-colors font-semibold text-sm">
          <SignOut size={18} />
          <span className="hidden lg:inline">Salir</span>
        </button>

        <div className="h-10 w-10 flex-shrink-0 rounded-full border-2 border-panel-border overflow-hidden ml-1">
          <img src="https://ui-avatars.com/api/?name=Admin+User&background=10B981&color=fff" alt="User" />
        </div>
      </div>
    </header>

    {/* Custom Modal para Añadir Sala */}
    {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-panel-base border border-panel-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
                <div className="flex justify-between items-center p-5 border-b border-panel-border bg-black/[0.03] dark:bg-black/20">
                    <h3 className="text-xl font-bold font-sans flex items-center gap-2"><HouseLine size={24} className="text-emerald-500" /> Registrar Nueva Sala</h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-brand-slate-600 hover:text-foreground"><X size={24} /></button>
                </div>
                <form onSubmit={handleAddRoom} className="p-6 flex flex-col gap-5">
                    <div>
                        <label className="text-xs font-mono text-brand-slate-600 block mb-2 uppercase">Identificador de Sala</label>
                        <input required type="text" value={newRoomName} onChange={e => setNewRoomName(e.target.value)} placeholder="Ej: Sala Vegetativo 1" className="w-full bg-black/[0.05] dark:bg-black/30 border border-panel-border rounded-lg p-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-mono" />
                    </div>
                    <div>
                        <label className="text-xs font-mono text-brand-slate-600 block mb-2 uppercase">Fase Agronómica Actual</label>
                        <select required value={newRoomPhase} onChange={e => setNewRoomPhase(e.target.value)} className="w-full bg-black/[0.05] dark:bg-black/30 border border-panel-border rounded-lg p-3 text-sm focus:border-emerald-500 focus:outline-none transition-all font-mono appearance-none">
                            <option value="Vegetativo">Vegetativo</option>
                            <option value="Floración">Floración</option>
                            <option value="Secado">Secado</option>
                            <option value="Clones">Esquejes / Clones</option>
                        </select>
                    </div>
                    
                    <button disabled={isSubmitting} type="submit" className="mt-4 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all">
                        {isSubmitting ? 'Verificando con Nube...' : 'Confirmar Alta'}
                    </button>
                </form>
            </div>
        </div>
    )}
    </>
  );
}
