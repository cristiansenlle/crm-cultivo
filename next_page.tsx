import React from "react";
import { GlassCard } from "../components/ui/GlassCard";
import { DashboardControls } from "../components/dashboard/DashboardControls";
import { DashboardOverview } from "../components/dashboard/DashboardOverview";
import { Keyboard, Plus, Thermometer } from "@phosphor-icons/react/dist/ssr";

export default function Home() {
  return (
    <div className="flex flex-col gap-3 w-full max-w-[1600px] mx-auto pb-4">
      
      {/* Dynamic Telemetry injected via Supabase Client */}
      <DashboardOverview />

      {/* Control Widgets Row (Client Component for N8N Webhooks) */}
      <DashboardControls />

      {/* VPD Reference Matrix Row */}
      <section>
        <GlassCard className="w-full">
          <div className="mb-4 text-brand-slate-600 dark:text-slate-300 font-bold flex items-center gap-2 border-b border-panel-border pb-3">
             <BookOpen /> Rangos Óptimos VPD
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2">
            <div className="flex-1 min-w-[150px] p-3 rounded-lg bg-blue-500/10 border-l-4 border-blue-500">
               <span className="block text-sm font-bold">Propagación</span>
               <span className="text-xs text-brand-slate-600 dark:text-slate-400">0.4 - 0.8 kPa</span>
            </div>
            <div className="flex-1 min-w-[150px] p-3 rounded-lg bg-status-green/10 border-l-4 border-status-green">
               <span className="block text-sm font-bold">Vegetativo</span>
               <span className="text-xs text-brand-slate-600 dark:text-slate-400">0.8 - 1.2 kPa</span>
            </div>
            <div className="flex-1 min-w-[150px] p-3 rounded-lg bg-status-yellow/10 border-l-4 border-status-yellow">
               <span className="block text-sm font-bold">Floración</span>
               <span className="text-xs text-brand-slate-600 dark:text-slate-400">1.2 - 1.6 kPa</span>
            </div>
            <div className="flex-1 min-w-[150px] p-3 rounded-lg bg-status-red/10 border-l-4 border-status-red">
               <span className="block text-sm font-bold">⚠️ Peligro</span>
               <span className="text-xs text-brand-slate-600 dark:text-slate-400">&lt; 0.4 o &gt; 1.6 kPa</span>
            </div>
          </div>
        </GlassCard>
      </section>

    </div>
  );
}

// Inline mock for icon
function BookOpen() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,160H40V56H216V200ZM176,88a8,8,0,0,1-8,8H88a8,8,0,0,1,0-16h80A8,8,0,0,1,176,88Zm0,32a8,8,0,0,1-8,8H88a8,8,0,0,1,0-16h80A8,8,0,0,1,176,120Zm0,32a8,8,0,0,1-8,8H88a8,8,0,0,1,0-16h80A8,8,0,0,1,176,152Z"></path></svg>;
}
