"use client";

import React from "react";
import { ThermometerHot, Drop, Waves } from "@phosphor-icons/react";
import { GlassCard } from "../ui/GlassCard";

interface TelemetryRadiantProps {
  type: "temperature" | "humidity" | "vpd";
  value: number;
  status: "optimal" | "warning" | "danger";
}

export function TelemetryRadiant({ type, value, status }: TelemetryRadiantProps) {
  const meta = {
    temperature: { icon: <ThermometerHot size={20} />, label: "Temperatura", unit: "°C" },
    humidity: { icon: <Drop size={20} />, label: "Humedad", unit: "%" },
    vpd: { icon: <Waves size={20} />, label: "VPD (Calculado)", unit: "kPa" }
  };

  const statusLabel = {
    optimal: "Óptima",
    warning: "Alerta",
    danger: "Peligro"
  };

  const glowColor = status === "optimal" ? "emerald" : status === "warning" ? "yellow" : "red";

  return (
    <GlassCard glowColor={glowColor} className="bg-gradient-to-br from-black/20 to-black/5 dark:from-slate-900/60 dark:to-slate-800/40">
      <div className="flex justify-between items-center w-full">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-brand-slate-600 dark:text-slate-300">
          <span className={`text-status-${glowColor === "emerald" ? "green" : glowColor}`}>
            {meta[type].icon}
          </span>
          {meta[type].label}
        </h3>
        
        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider
          ${status === "optimal" ? "bg-status-green/10 text-status-green" : 
            status === "warning" ? "bg-status-yellow/10 text-status-yellow" : 
            "bg-status-red/10 text-status-red"}
        `}>
          {statusLabel[status]}
        </span>
      </div>

      <div className="flex-grow flex items-center justify-center my-2">
        <div className="text-[3.5rem] font-bold font-mono tracking-tighter leading-none text-foreground drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] dark:drop-shadow-[0_0_15px_rgba(255,255,255,0.05)] text-center w-full">
          {value.toFixed(1)}
          <span className="text-xl ml-1 font-sans text-brand-slate-600 dark:text-slate-400 font-medium">
            {meta[type].unit}
          </span>
        </div>
      </div>
    </GlassCard>
  );
}
