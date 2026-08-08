"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import BroadlinkPanel from './BroadlinkPanel';
import SoilConfigPanel from './SoilConfigPanel';

export default function DevicesPage() {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDevice, setNewDevice] = useState({ name: '', type: 'shelly_1plus', deviceId: '' });
  const [saving, setSaving] = useState(false);

  const fetchDevices = async () => {
    try {
      const res = await fetch('/api/iot/devices');
      const data = await res.json();
      if (data.success && data.data) {
        const devs = data.data.map((d: any) => ({ ...d, status: 'offline', last_seen: 'Nunca', deviceId: d.device_id }));
        setDevices(devs);
        checkStatus(devs);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = (devs: any[]) => {
    devs.forEach((dev) => {
      if (dev.type === 'shellyhtg3') {
        setDevices(prev => prev.map(d => d.id === dev.id ? { ...d, status: 'online', last_seen: 'Transmitiendo' } : d));
        return;
      }

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
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleAddDevice = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/iot/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newDevice.name, type: newDevice.type, device_id: newDevice.deviceId })
      });
      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        setNewDevice({ name: '', type: 'shelly_1plus', deviceId: '' });
        fetchDevices();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (e: any) {
      alert('Error saving device: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Dispositivos IoT</h1>
          <p className="text-gray-400">Gestión y configuración de hardware local y remoto.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-500 text-foreground px-4 py-2 rounded font-medium transition-colors">
          + Agregar Dispositivo
        </button>
      </div>

      <div className="bg-neutral-900 rounded-xl border border-neutral-800 overflow-x-auto shadow-lg">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Cargando dispositivos...</div>
        ) : (
          <table className="w-full text-left text-foreground min-w-[600px]">
            <thead className="bg-neutral-950 border-b border-neutral-800">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-400">Dispositivo</th>
                <th className="px-6 py-4 font-semibold text-gray-400">Tipo</th>
                <th className="px-6 py-4 font-semibold text-gray-400">ID / MQTT</th>
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
              {devices.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No hay dispositivos registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <BroadlinkPanel />
      <SoilConfigPanel />

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-semibold mb-4 text-foreground">Nuevo Dispositivo Shelly</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nombre Descriptivo</label>
                <input type="text" className="w-full bg-black border border-neutral-800 rounded-lg px-4 py-2 text-white" placeholder="Ej: Relé Bomba 1" value={newDevice.name} onChange={e => setNewDevice({...newDevice, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Tipo de Dispositivo</label>
                <select className="w-full bg-black border border-neutral-800 rounded-lg px-4 py-2 text-white" value={newDevice.type} onChange={e => setNewDevice({...newDevice, type: e.target.value})}>
                  <option value="shelly_1plus">Shelly Plus 1 (Relé)</option>
                  <option value="shelly1g4">Shelly 1 Gen4 (Relé)</option>
                  <option value="shellyhtg3">Shelly H&T Gen3 (Sensor Clima)</option>
                  <option value="shellyplus2pm">Shelly Plus 2PM</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Device ID (MQTT Prefix)</label>
                <input type="text" className="w-full bg-black border border-neutral-800 rounded-lg px-4 py-2 text-white font-mono text-sm" placeholder="shellyplus1-xxxxxxxx" value={newDevice.deviceId} onChange={e => setNewDevice({...newDevice, deviceId: e.target.value})} />
                <p className="text-xs text-gray-500 mt-1">Este ID debe coincidir con la configuración MQTT del dispositivo.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-400 hover:text-white">Cancelar</button>
              <button onClick={handleAddDevice} disabled={saving || !newDevice.name || !newDevice.deviceId} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}





