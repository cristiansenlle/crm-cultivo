"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  SquaresFour, 
  Thermometer, 
  CheckSquare, 
  Warehouse, 
  ShoppingCart, 
  ChartLineUp, 
  ProjectorScreenChart, 
  BookOpen, 
  Plant
} from "@phosphor-icons/react";
import { cn } from "../ui/GlassCard"; // quick reuse of cn

export function Sidebar() {
  const pathname = usePathname() || "/";

  const menu = [
    { name: "Panel Principal", path: "/", icon: <SquaresFour size={22} /> },
    { name: "Salas de Cultivo", path: "/cultivo", icon: <Thermometer size={22} /> },
    { name: "Gestor de Tareas", path: "/tareas", icon: <CheckSquare size={22} /> },
    { name: "Bodega e Insumos", path: "/insumos", icon: <Warehouse size={22} /> },
    { name: "Punto de Venta", path: "/pos", icon: <ShoppingCart size={22} /> },
    { name: "Finanzas & ROI", path: "/analytics", icon: <ChartLineUp size={22} /> },
    { name: "Timeline Agronómico", path: "/agronomy", icon: <ProjectorScreenChart size={22} /> },
    { name: "Protocolos", path: "/protocolos", icon: <BookOpen size={22} /> }
  ];

  return (
    <aside className="w-64 bg-panel-base backdrop-blur-xl border-r border-panel-border overflow-y-auto flex flex-col pt-8 pb-10 px-4 h-full shrink-0">
      
      <div className="flex items-center gap-3 px-2 mb-10 text-status-green drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]">
        <Plant weight="fill" size={32} />
        <span className="font-bold text-xl tracking-tight uppercase">CORE 360</span>
      </div>

      <nav className="flex flex-col gap-2 flex-grow">
        {menu.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link 
              key={item.path} 
              href={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-semibold text-sm",
                isActive 
                  ? "bg-black/10 dark:bg-white/10 text-foreground border-l-4 border-status-green" 
                  : "text-brand-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground"
              )}
            >
              <div className={isActive ? "text-status-green" : "opacity-80"}>
                {item.icon}
              </div>
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-6 border-t border-panel-border">
          <div className="flex items-center gap-2 px-2">
            <div className="w-2.5 h-2.5 rounded-full bg-status-green shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse"></div>
            <span className="text-xs font-mono opacity-60">SISTEMA ONLINE</span>
          </div>
      </div>
    </aside>
  );
}
