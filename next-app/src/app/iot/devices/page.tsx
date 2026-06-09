"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

const MOCK_DEVICES = [
  { id: '1', name: 'Shelly Relé 1', type: 'shelly_1plus', ip: '192.168.0.53', deviceId: 'shellyplus1-8813bf9fc354', status: 'offline', last_seen: 'Nunca' },
  { id: '2', name: 'Shelly Relé 2', type: 'shelly_1plus', ip: '192.168.0.142', deviceId: 'shellyplus1-8813bf9f8878', status: 'offline', last_seen: 'Nunca' },
];

export default function DevicesPage() {
  const [devices, setDevices] = useState(MOCK_DEVICES);

  useEffect(() => {
    // Para cada dispositivo, preguntamos su nombre real a la API (via MQTT)
    devices.forEach((dev) => {
      fetch('/api/iot/shelly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: dev.deviceId, action: 'status' })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.result?.device_info?.name) {
          setDevices(prev => prev.map(d => 
            d.id === dev.id 
              ? { ...d, name: data.result.device_info.name, status: 'online', last_seen: 'Ahora' } 
              : d
          ));
        } else if (data.success) {
          setDevices(prev => prev.map(d => d.id === dev.id ? { ...d, status: 'online', last_seen: 'Ahora' } : d));
        }
      })
      .catch(() => {});
    });
  }, []);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Dispositivos IoT</h1>
          <p className="text-gray-400">Gestión y configuración de hardware local y remoto.</p>
        </div>
        <button className="bg-emerald-600 hover:bg-emerald-500 text-foreground px-4 py-2 rounded font-medium transition-colors">
          + Agregar Dispositivo
        </button>
      </div>

      <div className="bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden shadow-lg">
        <table className="w-full text-left text-foreground">
          <thead className="bg-neutral-950 border-b border-neutral-800">
            <tr>
              <th className="px-6 py-4 font-semibold text-gray-400">Dispositivo</th>
              <th className="px-6 py-4 font-semibold text-gray-400">Tipo</th>
              <th className="px-6 py-4 font-semibold text-gray-400">IP Local / MQTT ID</th>
              <th className="px-6 py-4 font-semibold text-gray-400">Estado</th>
              <th className="px-6 py-4 font-semibold text-gray-400 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {devices.map(device => (
              <tr key={device.id} className="hover:bg-neutral-800/50 transition-colors">
                <td className="px-6 py-4 font-medium">{device.name}</td>
                <td className="px-6 py-4 text-gray-400 font-mono text-sm">{device.type}</td>
                <td className="px-6 py-4 font-mono text-sm text-gray-500">{device.deviceId}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    device.status === 'online' ? 'bg-emerald-900 text-emerald-300' : 'bg-red-900 text-red-300'
                  }`}>
                    {device.status === 'online' ? 'En línea' : 'Desconectado'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <Link href={`/iot/devices/${device.id}`} className="text-blue-400 hover:text-blue-300 font-medium">
                    Configurar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}



