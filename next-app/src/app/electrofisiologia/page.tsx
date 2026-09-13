"use client";

import React from 'react';
import { ElectrophysiologyWidget } from '../../components/dashboard/ElectrophysiologyWidget';
import { GlassCard } from '../../components/ui/GlassCard';
import { Zap, Activity, Info, BookOpen, Warehouse, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export default function ElectrofisiologiaPage() {
  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Encabezado Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-panel-border/60 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              <Zap size={26} className="animate-pulse" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-foreground">
                Electrofisiología Vegetal
              </h1>
              <p className="text-xs sm:text-sm text-foreground/60 font-mono mt-0.5">
                Diagnóstico bioeléctrico de membrana, fotosíntesis y nutrición en tiempo real (16-bit ADS1115)
              </p>
            </div>
          </div>
        </div>

        {/* Accesos Rápidos */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <Link
            href="/cultivo"
            className="px-3.5 py-2 rounded-lg bg-black/40 hover:bg-black/60 border border-panel-border text-foreground/80 hover:text-foreground transition-colors flex items-center gap-1.5"
          >
            <Activity size={14} className="text-emerald-400" />
            Salas de Cultivo
          </Link>
          <Link
            href="/protocolos"
            className="px-3.5 py-2 rounded-lg bg-black/40 hover:bg-black/60 border border-panel-border text-foreground/80 hover:text-foreground transition-colors flex items-center gap-1.5"
          >
            <BookOpen size={14} className="text-purple-400" />
            Protocolos SOP
          </Link>
          <Link
            href="/insumos"
            className="px-3.5 py-2 rounded-lg bg-black/40 hover:bg-black/60 border border-panel-border text-foreground/80 hover:text-foreground transition-colors flex items-center gap-1.5"
          >
            <Warehouse size={14} className="text-blue-400" />
            Bodega
          </Link>
        </div>
      </div>

      {/* Widget Principal de Telemetría y Diagnóstico */}
      <ElectrophysiologyWidget />

      {/* Tarjetas de Información Científica y Metodología */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4">
        <GlassCard className="p-5 border border-panel-border/60 bg-black/20">
          <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2 mb-2">
            <Zap size={16} /> Fundamento Bioeléctrico
          </h3>
          <p className="text-xs text-foreground/75 leading-relaxed">
            Las células vegetales mantienen una diferencia de potencial eléctrico a través de su membrana plasmática generada por bombas <strong>H⁺-ATPasas</strong>. Cualquier cambio en iluminación, hidratación, ataque de plagas o influjo de nutrientes genera despolarizaciones transitorias o potenciales de acción medibles en milivoltios (mV).
          </p>
        </GlassCard>

        <GlassCard className="p-5 border border-panel-border/60 bg-black/20">
          <h3 className="text-sm font-bold text-purple-400 flex items-center gap-2 mb-2">
            <Warehouse size={16} /> Mapeo Nutricional de Bodega
          </h3>
          <p className="text-xs text-foreground/75 leading-relaxed">
            El sistema cruza automáticamente los productos aplicados en la bitácora (<em>Top veg, CalMag, Barrier, Myr clorosis, Top bloom</em>) con sus principios activos (<strong>N, P, K, Ca, Mg, Si, Fe</strong>), evaluando si la planta asimila correctamente los iones sin requerir medición manual de EC ni pH.
          </p>
        </GlassCard>

        <GlassCard className="p-5 border border-panel-border/60 bg-black/20">
          <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2 mb-2">
            <ShieldAlert size={16} /> Detección Temprana de Estrés
          </h3>
          <p className="text-xs text-foreground/75 leading-relaxed">
            Las variaciones electrofisiológicas detectan el déficit de agua y nutrientes de <strong>2 a 9 días antes</strong> de que aparezcan síntomas visuales de marchitamiento o clorosis foliar, permitiendo correcciones agronómicas preventivas.
          </p>
        </GlassCard>
      </div>
    </div>
  );
}
