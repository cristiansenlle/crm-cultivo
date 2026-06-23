'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const MOCK_DEVICES = [
  { id: '1', name: 'Shelly Relé 1', type: 'switch', deviceId: 'shellyplus1-8813bf9fc354' },
  { id: '2', name: 'Shelly Relé 2', type: 'switch', deviceId: 'shellyplus1-8813bf9f8878' },
  { id: '3', name: 'Shelly H&T Gen3', type: 'shellyhtg3', ip: '192.168.0.190', deviceId: 'shellyhtg3-d0cf13c2f578' },
];

export default function MigrationPage() {
  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');
  const [devices, setDevices] = useState<any[]>([]);
  const [status, setStatus] = useState<any>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Populate with our hardcoded test devices instead of Supabase
    setDevices(MOCK_DEVICES);
  }, []);

  const handleMigration = async () => {
    if (!ssid) return alert("El SSID es obligatorio");
    if (!confirm("¿Estás seguro? Esto inyectará la nueva WiFi en todos los dispositivos como red secundaria (Backup).")) return;
    
    setLoading(true);
    const newStatus = { ...status };

    for (const device of devices) {
      if (!device.deviceId) continue;
      newStatus[device.id] = "⏳ Inyectando...";
      setStatus({ ...newStatus });

      try {
        const res = await fetch('/api/iot/shelly', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deviceId: device.deviceId,
            action: 'set_wifi',
            payload: { ssid, password }
          })
        });
        const data = await res.json();
        if (data.success) {
          newStatus[device.id] = "✅ Éxito";
        } else {
          newStatus[device.id] = "❌ Error";
        }
      } catch (err) {
        newStatus[device.id] = "⚠️ Timeout/Error";
      }
      setStatus({ ...newStatus });
    }
    setLoading(false);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="text-foreground/60 dark:text-foreground/60 dark:text-foreground/50 mb-4">
        <Link href="/iot/devices" className="hover:text-zinc-700 dark:text-foreground/90">← Volver a Dispositivos</Link>
      </div>
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">Herramienta de Mudanza WiFi</h1>
      </div>

      <div className="bg-panel-base backdrop-blur-md border border-zinc-200 dark:border-panel-border rounded-xl p-6 shadow-xl">
        <div className="mb-6 bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded-r-lg">
          <p className="text-blue-300 text-sm">
            Esta herramienta inyectará la nueva red WiFi en la memoria de los dispositivos como <strong>red secundaria (Backup)</strong>. 
            No perderán la conexión actual inmediatamente. Cuando los traslades a la nueva ubicación y enciendas el router nuevo, se conectarán automáticamente.
          </p>
        </div>

        <div className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-foreground/60 dark:text-foreground/60 dark:text-foreground/60 dark:text-foreground/60 dark:text-foreground/60 mb-1">Nuevo WiFi SSID</label>
            <input 
              type="text" 
              value={ssid} 
              onChange={e => setSsid(e.target.value)} 
              className="w-full bg-zinc-50 dark:bg-background border border-zinc-200 dark:border-panel-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-green-500"
              placeholder="Ej: WiFi-Cultivo-5G"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/60 dark:text-foreground/60 dark:text-foreground/60 dark:text-foreground/60 dark:text-foreground/60 mb-1">Nueva Contraseña</label>
            <input 
              type="text" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              className="w-full bg-zinc-50 dark:bg-background border border-zinc-200 dark:border-panel-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-green-500"
              placeholder="Contraseña"
            />
          </div>

          <button 
            onClick={handleMigration}
            disabled={loading || !ssid}
            className="w-full bg-green-600 hover:bg-green-500 text-foreground font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 mt-4"
          >
            {loading ? 'Inyectando Credenciales...' : 'Migrar Dispositivos'}
          </button>
        </div>
      </div>

      <div className="bg-panel-base backdrop-blur-md border border-zinc-200 dark:border-panel-border rounded-xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-panel-border">
          <h2 className="text-lg font-medium text-foreground">Estado de la Migración</h2>
        </div>
        <table className="min-w-full divide-y divide-zinc-800">
          <thead className="bg-zinc-50 dark:bg-background/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 dark:text-foreground/60 dark:text-foreground/60 dark:text-foreground/60 dark:text-foreground/60 uppercase tracking-wider">Dispositivo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 dark:text-foreground/60 dark:text-foreground/60 dark:text-foreground/60 dark:text-foreground/60 uppercase tracking-wider">Device ID / IP</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 dark:text-foreground/60 dark:text-foreground/60 dark:text-foreground/60 dark:text-foreground/60 uppercase tracking-wider">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {devices.map((device) => (
              <tr key={device.id} className="hover:bg-zinc-100 dark:bg-panel-border/30 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground font-medium">{device.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground/60 dark:text-foreground/60 dark:text-foreground/60 dark:text-foreground/60 dark:text-foreground/60 font-mono text-xs">{device.deviceId || device.ip}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {status[device.id] ? (
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      status[device.id].includes('Éxito') ? 'bg-green-500/20 text-green-400' : 
                      status[device.id].includes('Error') ? 'bg-red-500/20 text-red-400' : 
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {status[device.id]}
                    </span>
                  ) : (
                    <span className="text-zinc-600">Pendiente</span>
                  )}
                </td>
              </tr>
            ))}
            {devices.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-foreground/60 dark:text-foreground/60 dark:text-foreground/50 text-sm">
                  No hay dispositivos registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}





