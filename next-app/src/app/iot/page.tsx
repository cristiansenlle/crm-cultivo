"use client";

import React from 'react';
import Link from 'next/link';
import { ElectrophysiologyWidget } from '../../components/dashboard/ElectrophysiologyWidget';

export default function IotDashboard() {
  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Dashboard IoT & Fitomonitoreo</h1>
          <p className="text-sm text-foreground/60 font-mono mt-1">Biopotenciales vegetales, sensores capacitivos y actuadores Shelly</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/iot/devices" className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors shadow-lg">
            Gestionar Dispositivos
          </Link>
          <Link href="/cultivo" className="bg-neutral-800 hover:bg-neutral-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors border border-neutral-700">
            Vista de Cultivo
          </Link>
        </div>
      </div>

      {/* Widget de Electrofisiología y Diagnóstico */}
      <ElectrophysiologyWidget />
    </div>
  );
}
