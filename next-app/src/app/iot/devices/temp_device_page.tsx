"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

const MOCK_DEVICES: Record<string, any> = {
  '1': { id: '1', name: 'Shelly Relé 1', type: 'switch', deviceId: 'shellyplus1-8813bf9fc354' },
  '2': { id: '2', name: 'Shelly Relé 2', type: 'switch', deviceId: 'shellyplus1-8813bf9f8878' },
};

export default function DevicePage() {
  const params = useParams();
  const device = MOCK_DEVICES[params.id as string];
    const [deviceName, setDeviceName] = useState(device.name);
  const [newName, setNewName] = useState(device.name);
  const [isOn, setIsOn] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'control' | 'schedules' | 'rules' | 'settings'>('control');

  // Schedule States
  const [schedules, setSchedules] = useState<any[]>([]);
  const [newSchTime, setNewSchTime] = useState('12:00');
    const [newSchAction, setNewSchAction] = useState('true');
  const [loading, setLoading] = useState(false);

  // Photoperiod States
  const [photoHoursOn, setPhotoHoursOn] = useState(18);
  const [photoHoursOff, setPhotoHoursOff] = useState(6);

  // Rule States
  const [scripts, setScripts] = useState<any[]>([]);
  const [ruleTrigger, setRuleTrigger] = useState('on');
  const [ruleTargetDev, setRuleTargetDev] = useState(device?.id === '1' ? 'shellyplus1-8813bf9f8878' : 'shellyplus1-8813bf9fc354');
  const [ruleAction, setRuleAction] = useState('off');
  const [ruleDelay, setRuleDelay] = useState(0);

  useEffect(() => {
    if (device) {
      // Fetch Status
      fetch('/api/iot/shelly', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: device.deviceId, action: 'status' })
      }).then(r => r.json()).then(data => {
        if (data.success && data.result) { setIsOn(data.result['switch:0']?.output || false); if (data.result.device_info?.name) setDeviceName(data.result.device_info.name); }
      });

      // Fetch History
      const fetchHistory = async () => {
        const hRes = await fetch(`/api/iot/history?deviceId=${device.deviceId}`);
        const hData = await hRes.json();
        if (hData.success) setHistory(hData.data);
      };
      fetchHistory();
      const interval = setInterval(fetchHistory, 3000);

      fetchSchedules();
      fetchScripts();

      return () => clearInterval(interval);
    }
  }, [device]);

  const fetchSchedules = async () => {
    const res = await fetch('/api/iot/shelly', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: device.deviceId, action: 'list_schedules' })
    });
    const data = await res.json();
    if (data.success && data.result?.jobs) setSchedules(data.result.jobs);
  };

  const fetchScripts = async () => {
    const res = await fetch('/api/iot/shelly', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: device.deviceId, action: 'list_scripts' })
    });
    const data = await res.json();
    if (data.success && data.result?.scripts) setScripts(data.result.scripts);
  };

  const saveName = async () => {
    if (!newName) return;
    setLoading(true);
    await fetch('/api/iot/shelly', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: device.deviceId, action: 'set_name', payload: { name: newName } })
    });
    setDeviceName(newName);
    setLoading(false);
    alert('Nombre actualizado en el dispositivo');
  };

  const toggleSwitch = async () => {
    const newState = !isOn;
    setIsOn(newState);
    await fetch('/api/iot/shelly', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: device.deviceId, action: 'toggle', payload: { on: newState } })
    });
  };

  const createSchedule = async () => {
    setLoading(true);
    const [hh, mm] = newSchTime.split(':');
    const timespec = `0 ${mm} ${hh} * * *`;
    
    await fetch('/api/iot/shelly', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: device.deviceId, action: 'create_schedule', payload: { timespec, on: newSchAction === 'true' }
      })
    });
    await fetchSchedules();
    setLoading(false);
  };

    const deleteSchedule = async (id: number) => {
    if (!confirm('¿Eliminar esta programación?')) return;
    await fetch('/api/iot/shelly', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: device.deviceId, action: 'delete_schedule', payload: { id } })
    });
    await fetchSchedules();
  };

  const createPhotoperiod = async () => {
    setLoading(true);
    await fetch('/api/iot/shelly', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: device.deviceId,
        action: 'create_photoperiod',
        payload: { hoursOn: photoHoursOn, hoursOff: photoHoursOff }
      })
    });
    await fetchScripts();
    setLoading(false);
  };

  const createRule = async () => {
    setLoading(true);
    await fetch('/api/iot/shelly', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: device.deviceId,
        action: 'create_sequence',
        payload: {
          trigger: ruleTrigger,
          targetDeviceId: ruleTargetDev,
          targetAction: ruleAction,
          delaySeconds: ruleDelay
        }
      })
    });
    await fetchScripts();
    setLoading(false);
  };

  const deleteScript = async (id: number) => {
    if (!confirm('¿Eliminar esta regla?')) return;
    await fetch('/api/iot/shelly', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: device.deviceId, action: 'delete_script', payload: { id } })
    });
    await fetchScripts();
  };

  if (!device) return <div className="p-8 text-white">Dispositivo no encontrado</div>;

  return (
    <div className="p-8 space-y-6 bg-zinc-950 min-h-screen text-white">
      <Link href="/iot" className="text-emerald-500 hover:text-emerald-400 font-medium">&larr; Volver</Link>
      
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-bold">{deviceName}</h1>
        <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-sm font-medium border border-emerald-500/20">En línea (MQTT)</span>
      </div>

      <div className="flex space-x-2 border-b border-zinc-800 pb-px">
        {['control', 'schedules', 'rules', 'settings'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab as any)}
            className={`px-6 py-3 font-medium text-sm rounded-t-lg transition-colors ${activeTab === tab ? 'bg-zinc-900 text-white border-t border-x border-zinc-800' : 'text-zinc-400 hover:text-white'}`}
          >
            {tab === 'control' ? 'Control Manual' : tab === 'schedules' ? 'Programación (Timers)' : tab === 'rules' ? 'Automatizaciones' : 'Ajustes'}
          </button>
        ))}
      </div>

      {activeTab === 'control' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-6">Interruptor Principal</h2>
            <div className="flex items-center justify-between p-4 bg-black/40 rounded-lg">
              <span className="font-medium text-lg">Estado del Relé</span>
              <button onClick={toggleSwitch} className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${isOn ? 'bg-emerald-500' : 'bg-zinc-700'}`}>
                <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${isOn ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
                        </div>
          </div>
        )}

      {activeTab === 'settings' && (
        <div className="space-y-6 pt-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-6">Ajustes Generales</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-black/40 rounded-lg p-5">
                  <h3 className="text-sm font-medium text-zinc-400 mb-3">Renombrar Shelly</h3>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={newName} 
                      onChange={e => setNewName(e.target.value)}
                      placeholder="Nuevo nombre..."
                      className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:border-indigo-500 focus:outline-none"
                    />
                    <button 
                      onClick={saveName}
                      disabled={loading}
                      className="bg-zinc-800 hover:bg-zinc-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
                    >
                      Guardar
                    </button>
                  </div>
                </div>

                <div className="bg-black/40 rounded-lg p-5 border border-amber-900/50">
                  <h3 className="text-sm font-medium text-amber-500 mb-2">Mudanza de Red Wi-Fi</h3>
                  <p className="text-xs text-zinc-400 mb-4">Inyecta la clave Wi-Fi del galpón de cultivo como red de respaldo para que los dispositivos no se desconecten al mudarlos.</p>
                  <Link href="/iot/migration" className="block text-center w-full bg-amber-600/20 hover:bg-amber-600/30 text-amber-500 border border-amber-600/30 font-medium py-2 px-4 rounded-lg transition-colors">
                    Abrir Asistente de Mudanza
                  </Link>
                </div>
              </div>
          </div>
          </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 lg:col-span-2">
              <h2 className="text-xl font-semibold mb-6">Historial en Vivo</h2>
            <div className="bg-black/40 rounded-lg p-4 h-64 overflow-y-auto">
              <ul className="space-y-3">
                {history.map((log) => (
                  <li key={log.id} className="flex justify-between items-center border-b border-zinc-800 pb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${log.event === 'on' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                      <span className="font-medium text-sm">{log.event === 'on' ? 'Encendido' : 'Apagado'}</span>
                    </div>
                    <span className="text-xs text-zinc-400">{new Date(log.created_at).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'schedules' && (
        <div className="space-y-6 pt-4">

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 border-l-4 border-indigo-500">
            <h2 className="text-xl font-semibold mb-2 text-indigo-400">Fotoperíodo Avanzado (Ciclo Continuo)</h2>
            <p className="text-sm text-zinc-400 mb-6">Inyecta un script en el microchip que permite ciclos infinitos y sobrevive a cortes de luz. Ideal para ciclos mayores a 24 horas (Ej: 36h ON, 12h OFF).</p>
            
            <div className="flex items-end gap-4 max-w-2xl">
              <div className="flex-1">
                <label className="block text-sm font-medium text-zinc-400 mb-1">Horas Encendido</label>
                <input 
                  type="number" min="0" step="0.5"
                  value={photoHoursOn} 
                  onChange={e => setPhotoHoursOn(Number(e.target.value))} 
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-zinc-400 mb-1">Horas Apagado</label>
                <input 
                  type="number" min="0" step="0.5"
                  value={photoHoursOff} 
                  onChange={e => setPhotoHoursOff(Number(e.target.value))} 
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <button 
                onClick={createPhotoperiod} disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 px-6 rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? '...' : '+ Iniciar Ciclo'}
              </button>
            </div>
            
            <div className="mt-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3">
              <p className="text-sm text-indigo-300">
                <strong>Nota:</strong> Los fotoperíodos se inyectan en la memoria interna del equipo. Puedes detenerlos o eliminarlos desde la pestaña de <strong>Automatizaciones</strong>.
              </p>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-2">Crear Nueva Programación</h2>
            <p className="text-sm text-zinc-400 mb-6">Los horarios se guardan en el chip interno del Shelly.</p>
            <div className="flex items-end gap-4 max-w-2xl">
              <div className="flex-1"><label className="block text-sm font-medium text-zinc-400 mb-1">Hora</label><input type="time" value={newSchTime} onChange={e => setNewSchTime(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white" /></div>
              <div className="flex-1"><label className="block text-sm font-medium text-zinc-400 mb-1">Acción</label><select value={newSchAction} onChange={e => setNewSchAction(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white"><option value="true">Encender</option><option value="false">Apagar</option></select></div>
              <button onClick={createSchedule} disabled={loading} className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 px-6 rounded-lg">{loading ? '...' : '+ Agregar'}</button>
            </div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <table className="min-w-full divide-y divide-zinc-800">
              <thead className="bg-zinc-950/50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Patrón</th><th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Acción</th><th className="px-6 py-3 text-right text-xs font-medium text-zinc-400 uppercase">Opciones</th></tr></thead>
              <tbody className="divide-y divide-zinc-800">
                {schedules.map((job) => (
                  <tr key={job.id} className="hover:bg-zinc-800/50">
                    <td className="px-6 py-4 text-sm font-mono text-zinc-300">{job.timespec}</td>
                    <td className="px-6 py-4 text-sm font-medium">{job.calls[0]?.params?.on ? <span className="text-emerald-400">⚡ Encender</span> : <span className="text-red-400">🔌 Apagar</span>}</td>
                    <td className="px-6 py-4 text-right"><button onClick={() => deleteSchedule(job.id)} className="text-red-500 hover:text-red-400 text-sm font-medium">Eliminar</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'rules' && (
        <div className="space-y-6 pt-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-2">Crear Automatización Cruzada</h2>
            <p className="text-sm text-zinc-400 mb-6">El script vivirá en este dispositivo y enviará comandos MQTT al otro Shelly con precisión milimétrica.</p>
            <div className="grid grid-cols-5 items-end gap-4">
              <div className="col-span-1"><label className="block text-sm font-medium text-zinc-400 mb-1">Si este se...</label><select value={ruleTrigger} onChange={e => setRuleTrigger(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white"><option value="on">Enciende</option><option value="off">Apaga</option></select></div>
              <div className="col-span-1"><label className="block text-sm font-medium text-zinc-400 mb-1">Retraso (Segs)</label><input type="number" min="0" value={ruleDelay} onChange={e => setRuleDelay(Number(e.target.value))} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white" /></div>
              <div className="col-span-2"><label className="block text-sm font-medium text-zinc-400 mb-1">Entonces el Dispositivo...</label><select value={ruleTargetDev} onChange={e => setRuleTargetDev(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white">{Object.values(MOCK_DEVICES).map(d => <option key={d.id} value={d.deviceId}>{d.name} ({d.deviceId})</option>)}</select></div>
              <div className="col-span-1"><label className="block text-sm font-medium text-zinc-400 mb-1">Debe...</label><select value={ruleAction} onChange={e => setRuleAction(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white"><option value="on">Encenderse</option><option value="off">Apagarse</option></select></div>
            </div>
            <button onClick={createRule} disabled={loading} className="mt-6 bg-purple-600 hover:bg-purple-500 text-white font-medium py-2 px-6 rounded-lg">{loading ? '...' : '+ Agregar Regla'}</button>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <table className="min-w-full divide-y divide-zinc-800">
              <thead className="bg-zinc-950/50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Script Name</th><th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Estado</th><th className="px-6 py-3 text-right text-xs font-medium text-zinc-400 uppercase">Opciones</th></tr></thead>
              <tbody className="divide-y divide-zinc-800">
                {scripts.map((s) => (
                  <tr key={s.id} className="hover:bg-zinc-800/50">
                    <td className="px-6 py-4 text-sm font-medium text-white">{s.name}</td>
                    <td className="px-6 py-4 text-sm"><span className={`px-2 py-1 rounded text-xs ${s.running ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>{s.running ? 'Activo' : 'Detenido'}</span></td>
                    <td className="px-6 py-4 text-right"><button onClick={() => deleteScript(s.id)} className="text-red-500 hover:text-red-400 text-sm font-medium">Eliminar</button></td>
                  </tr>
                ))}
                {scripts.length === 0 && <tr><td colSpan={3} className="px-6 py-8 text-center text-zinc-500 text-sm">No hay reglas configuradas.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}











