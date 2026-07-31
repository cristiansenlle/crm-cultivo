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



    </div>
  );
}

// Inline mock for icon
function BookOpen() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,160H40V56H216V200ZM176,88a8,8,0,0,1-8,8H88a8,8,0,0,1,0-16h80A8,8,0,0,1,176,88Zm0,32a8,8,0,0,1-8,8H88a8,8,0,0,1,0-16h80A8,8,0,0,1,176,120Zm0,32a8,8,0,0,1-8,8H88a8,8,0,0,1,0-16h80A8,8,0,0,1,176,152Z"></path></svg>;
}
