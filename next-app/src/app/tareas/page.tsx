"use client";

import React from "react";
import { GlassCard } from "../../components/ui/GlassCard";
import { CalendarCheck } from "@phosphor-icons/react";
import { NativeCalendar } from "./NativeCalendar";

export default function TareasPage() {
  return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto pb-10">
      
      {/* Top Banner Agrupador */}
      <GlassCard className="w-full relative overflow-hidden p-8 flex flex-col md:flex-row justify-between md:items-center gap-6 border-l-4 border-emerald-500">
        <div className="z-10">
           <h1 className="text-3xl font-extrabold flex items-center gap-3">
             <CalendarCheck size={32} className="text-emerald-500" />
             Calendario y Tareas
           </h1>
           <p className="text-brand-slate-600 dark:text-slate-400 font-mono mt-2">
             Historial de la bitácora agronómica y planificación de tareas futuras nativas del sistema.
           </p>
        </div>
      </GlassCard>

      {/* NATIVE CALENDAR */}
      <NativeCalendar />
      
    </div>
  );
}
