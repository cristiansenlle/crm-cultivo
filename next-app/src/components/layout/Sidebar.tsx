"use client";

import React, { useState, useEffect } from "react";
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
  Plant,
  X,
  Lightning
} from "@phosphor-icons/react";
import { Camera, ChevronDown, ChevronRight, Video, History, Sparkles, Sliders } from "lucide-react";
import { cn } from "../ui/GlassCard"; // quick reuse of cn

interface SubMenuItem {
  name: string;
  path: string;
  icon?: React.ReactNode;
}

interface MenuItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  subItems?: SubMenuItem[];
}

export function Sidebar() {
  const pathname = usePathname() || "/";
  const [isOpen, setIsOpen] = useState(false);
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({
    '/vision': true
  });

  useEffect(() => {
    const handleToggle = () => setIsOpen(p => !p);
    window.addEventListener("toggle-mobile-sidebar", handleToggle);
    return () => window.removeEventListener("toggle-mobile-sidebar", handleToggle);
  }, []);

  useEffect(() => { setIsOpen(false); }, [pathname]);

  const toggleSubmenu = (path: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenSubmenus(prev => ({ ...prev, [path]: !prev[path] }));
  };

  const menu: MenuItem[] = [
    { name: "Panel Principal", path: "/", icon: <SquaresFour size={22} /> },
    { name: "Salas de Cultivo", path: "/cultivo", icon: <Thermometer size={22} /> },
    { 
      name: "Centro de Visión IA", 
      path: "/vision", 
      icon: <Camera className="w-[22px] h-[22px] text-emerald-400" />,
      subItems: [
        { name: "Cámara en Vivo", path: "/vision?tab=live", icon: <Video className="w-3.5 h-3.5 text-red-400" /> },
        { name: "Timelapse & Galería", path: "/vision?tab=timelapse", icon: <History className="w-3.5 h-3.5 text-cyan-400" /> },
        { name: "Diagnósticos IA", path: "/vision?tab=diagnostics", icon: <Sparkles className="w-3.5 h-3.5 text-amber-400" /> },
        { name: "Configuración Centinela", path: "/vision?tab=settings", icon: <Sliders className="w-3.5 h-3.5 text-purple-400" /> },
      ]
    },
    { name: "Electrofisiología Vegetal", path: "/electrofisiologia", icon: <Lightning size={22} weight="fill" className="text-emerald-400" /> },
    { name: "Gestor de Tareas", path: "/tareas", icon: <CheckSquare size={22} /> },
    { name: "Bodega e Insumos", path: "/insumos", icon: <Warehouse size={22} /> },
    { name: "Punto de Venta", path: "/pos", icon: <ShoppingCart size={22} /> },
    { name: "Finanzas & ROI", path: "/analytics", icon: <ChartLineUp size={22} /> },
    { name: "Timeline Agronómico", path: "/agronomy", icon: <ProjectorScreenChart size={22} /> },
    { name: "Protocolos", path: "/protocolos", icon: <BookOpen size={22} /> },
    { name: "Humedad de Suelo", path: "/iot/suelo", icon: <Plant size={22} /> },
    { name: "Centro IoT (Equipos)", path: "/iot/devices", icon: <Lightning size={22} /> }
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      <aside className={cn(
        "bg-panel-base backdrop-blur-xl border-r border-panel-border overflow-y-auto flex flex-col pt-8 pb-10 px-4 h-full shrink-0 w-64",
        "fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 md:relative md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
      
      <div className="flex items-center gap-3 px-2 mb-10 text-status-green drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]">
        <Plant weight="fill" size={32} />
        <span className="font-bold text-xl tracking-tight uppercase">CORE 360</span>
      </div>

      <nav className="flex flex-col gap-1.5 flex-grow">
        {menu.map((item) => {
          const isActive = pathname === item.path;
          const hasSubItems = item.subItems && item.subItems.length > 0;
          const isSubmenuOpen = openSubmenus[item.path] ?? pathname.startsWith(item.path);

          return (
            <div key={item.path} className="flex flex-col">
              <div className="flex items-center w-full">
                <Link 
                  href={item.path}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-semibold text-sm flex-1",
                    isActive 
                      ? "bg-black/10 dark:bg-white/10 text-foreground border-l-4 border-status-green" 
                      : "text-brand-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground"
                  )}
                >
                  <div className={isActive ? "text-status-green" : "opacity-80"}>
                    {item.icon}
                  </div>
                  <span className="flex-1 truncate">{item.name}</span>
                </Link>

                {hasSubItems && (
                  <button
                    onClick={(e) => toggleSubmenu(item.path, e)}
                    className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-white/5 rounded-lg transition-colors ml-0.5"
                    title="Alternar submenú"
                  >
                    {isSubmenuOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                )}
              </div>

              {hasSubItems && isSubmenuOpen && (
                <div className="ml-6 pl-3 border-l-2 border-emerald-500/25 flex flex-col gap-1 mt-1 mb-1.5">
                  {item.subItems!.map((sub) => {
                    return (
                      <Link
                        key={sub.path}
                        href={sub.path}
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                          "text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10"
                        )}
                      >
                        {sub.icon}
                        <span>{sub.name}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
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
    </>
  );
}

