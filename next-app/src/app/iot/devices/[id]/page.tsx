"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Timer, Trash2 } from 'lucide-react';

export default function DevicePage() {
  const params = useParams();
  const [device, setDevice] = useState<any>(null);
  const [deviceName, setDeviceName] = useState('Cargando...');
  const [newName, setNewName] = useState('');
  const [isOn, setIsOn] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'control' | 'schedules' | 'rules' | 'settings' | 'mqtt_config'>('control');

  // Schedule States
  const [schedules, setSchedules] = useState<any[]>([]);
  const [switchConfig, setSwitchConfig] = useState<any>(null);
  const [newSchTime, setNewSchTime] = useState('12:00');
  const [newSchAction, setNewSchAction] = useState('true');
  const [loading, setLoading] = useState(false);

  // Photoperiod States
  const [photoHoursOn, setPhotoHoursOn] = useState(18);
  const [photoHoursOff, setPhotoHoursOff] = useState(6);


  // Auto Timer States
  const [timerAction, setTimerAction] = useState('off');
  const [timerHours, setTimerHours] = useState(0);
  const [timerMinutes, setTimerMinutes] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(0);

  // Rule States
  const [scripts, setScripts] = useState<any[]>([]);
  const [ruleTrigger, setRuleTrigger] = useState('on');
  const [ruleTargetDev, setRuleTargetDev] = useState('');
  const [ruleAction, setRuleAction] = useState('off');
  const [ruleTargetDuration, setRuleTargetDuration] = useState(0);
  const [ruleDelay, setRuleDelay] = useState(0);
  const [ruleType, setRuleType] = useState('active');
  const [allDevices, setAllDevices] = useState<any[]>([]);
  const [viewingScript, setViewingScript] = useState<any>(null);

  useEffect(() => {
    // Fetch all devices from DB to find the current one and populate the "allDevices" list for cross-rules
    fetch('/api/iot/devices')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data) {
          const devs = data.data.map((d: any) => ({ ...d, deviceId: d.device_id }));
          setAllDevices(devs);
          const found = devs.find((d: any) => d.id === params.id || d.id === parseInt(params.id as string));
          if (found) {
            setDevice(found);
            setDeviceName(found.name);
            setNewName(found.name);
            if (found.type === 'shellyhtg3') setActiveTab('mqtt_config');
            if (devs.length > 1) {
              const other = devs.find((d: any) => d.id !== found.id);
              if (other) setRuleTargetDev(other.deviceId);
            }
          } else {
            setDeviceName('Dispositivo No Encontrado');
          }
        }
      });
  }, [params.id]);

  useEffect(() => {
    if (device) {
      // Fetch Status
      fetch('/api/iot/shelly', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: device.deviceId, action: 'status' })
      }).then(r => r.json()).then(data => {
        if (data.success && data.result) { 
          setIsOn(data.result['switch:0']?.output || false); 
          if (data.result.device_info?.name) {
            setDeviceName(data.result.device_info.name);
            setNewName(data.result.device_info.name);
          }
        }
      });

      
      // Fetch names for all devices for the dropdown
      allDevices.forEach((dev: any) => {
        fetch('/api/iot/shelly', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceId: dev.deviceId, action: 'status' })
        }).then(r => r.json()).then(data => {
          if (data.success && data.result?.device_info?.name) {
            setAllDevices(prev => prev.map((d: any) => 
              d.deviceId === dev.deviceId ? { ...d, name: data.result.device_info.name } : d
            ));
          }
        }).catch(() => {});
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

  
  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/iot/shelly', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: device.deviceId, action: 'get_config' })
      });
      const data = await res.json();
      if (data.success && data.result) setSwitchConfig(data.result);
    } catch (e) {}
  };

  const handleDeleteAutoTimer = async (type: 'auto_on' | 'auto_off') => {
    try {
      const payload: any = {
        auto_on: switchConfig?.auto_on || false,
        auto_on_delay: switchConfig?.auto_on_delay || 0,
        auto_off: switchConfig?.auto_off || false,
        auto_off_delay: switchConfig?.auto_off_delay || 0
      };
      if (type === 'auto_on') { payload.auto_on = false; }
      if (type === 'auto_off') { payload.auto_off = false; }
      
      const res = await fetch('/api/iot/shelly', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: device.deviceId, action: 'set_timers', payload })
      });
      if (res.ok) fetchConfig();
    } catch (e) {}
  };

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
    const timespec = `0 ${mm} ${hh} * * SUN,MON,TUE,WED,THU,FRI,SAT`;
    
    const res = await fetch('/api/iot/shelly', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: device.deviceId, action: 'create_schedule', payload: { timespec, on: newSchAction === 'true' }
      })
    });
    const data = await res.json();
    if (!data.success) {
      alert('Error creando programación: ' + (data.error || 'Desconocido'));
    }
    await fetchSchedules();
    setLoading(false);
  };


  const saveTimer = async () => {
    setLoading(true);
    const totalSeconds = (timerHours * 3600) + (timerMinutes * 60) + timerSeconds;
    
    const payload = {
      auto_on: timerAction === 'on' && totalSeconds > 0,
      auto_on_delay: timerAction === 'on' ? totalSeconds : 0,
      auto_off: timerAction === 'off' && totalSeconds > 0,
      auto_off_delay: timerAction === 'off' ? totalSeconds : 0
    };

    const res = await fetch('/api/iot/shelly', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: device.deviceId, action: 'set_timers', payload })
    });
    
    if (res.ok) {
      await fetchConfig(); // <-- Refrescar la UI para mostrar los timers
      alert('Temporizador Auto-' + (timerAction === 'on' ? 'ON' : 'OFF') + ' configurado exitosamente.');
    } else {
      alert('Error configurando el temporizador.');
    }
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
          ruleName: "Auto" + (ruleTrigger === 'on' ? 'ON' : 'OFF') + "->" + (ruleAction === 'on' ? 'ON' : 'OFF') + "_" + ruleTargetDev.split('-')[1].substring(0,4),
          trigger: ruleTrigger,
          targetDeviceId: ruleTargetDev,
          targetAction: ruleAction,
            targetDuration: ruleTargetDuration,
          delaySeconds: ruleDelay,
          ruleType: ruleType
        }
      })
    });
    await fetchScripts();
    setLoading(false);
  };

  
  const viewScriptCode = async (script: any) => {
    setViewingScript({ name: script.name, code: 'Cargando...', loading: true });
    try {
      const res = await fetch('/api/iot/shelly', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: device.deviceId, action: 'get_script_code', payload: { scriptId: script.id } })
      });
      const data = await res.json();
      
      const rawCode = data.result?.data || data.result?.code || JSON.stringify(data, null, 2);
      let parsedRule = '';
      if (rawCode.includes('Photoperiod')) {
        const hOnMatch = script.name.match(/([0-9]+)hON/);
        const hOffMatch = script.name.match(/([0-9]+)hOFF/);
        parsedRule = 'REGLA: Fotoperiodo configurado. ' + (hOnMatch ? hOnMatch[1] : '?') + ' horas ENCENDIDO y ' + (hOffMatch ? hOffMatch[1] : '?') + ' horas APAGADO continuamente.';
      } else if (rawCode.includes('MQTT.publish')) {
        const triggerMatch = rawCode.match(/event\.info\.state === (true|false)/);
        const targetIpMatch = rawCode.match(/MQTT\.publish\("([^/]+)\/rpc"/);
        const targetOnMatch = rawCode.match(/on: (true|false)/);
        const targetToggleMatch = rawCode.match(/toggle_after: ([0-9]+)/);
        const delayMatch = rawCode.match(/Timer\.set\(([0-9]+), false/);
        const robustDelayMatch = rawCode.match(/sys\.unixtime - State\.triggerTime >= ([0-9]+)/) || rawCode.match(/sys\.unixtime - triggerTime >= ([0-9]+)/);

        const triggerStr = triggerMatch ? (triggerMatch[1] === 'true' ? 'ENCIENDE' : 'APAGA') : 'CAMBIA';
        const targetStr = targetOnMatch ? (targetOnMatch[1] === 'true' ? 'ENCENDERSE' : 'APAGARSE') : 'CAMBIAR';
        const toggleStr = targetToggleMatch ? ` durante ${targetToggleMatch[1]} segundos` : '';
        
        let delaySecs = 0;
        if (delayMatch) delaySecs = Math.floor(parseInt(delayMatch[1])/1000);
        else if (robustDelayMatch) delaySecs = parseInt(robustDelayMatch[1]);
        const delayStr = delaySecs > 0 ? ` tras ${delaySecs} segundos` : '';
        const ipStr = targetIpMatch ? targetIpMatch[1] : '?';

        parsedRule = `REGLA: Si este dispositivo se ${triggerStr}${delayStr}, entonces el dispositivo remoto [${ipStr}] debe ${targetStr}${toggleStr}.`;
      } else if (rawCode.includes('MQTT.subscribe')) {
        const targetIpMatch = rawCode.match(/MQTT\.subscribe\("([^/]+)\/events\/rpc"/);
        const triggerMatch = rawCode.match(/s === (true|false)/);
        const targetOnMatch = rawCode.match(/on: (true|false)/);
        const targetToggleMatch = rawCode.match(/toggle_after: ([0-9]+)/);
        const delayMatch = rawCode.match(/Timer\.set\(([0-9]+), false/);

        const triggerStr = triggerMatch ? (triggerMatch[1] === 'true' ? 'ENCIENDE' : 'APAGA') : 'CAMBIA';
        const targetStr = targetOnMatch ? (targetOnMatch[1] === 'true' ? 'ENCENDERSE' : 'APAGARSE') : 'CAMBIAR';
        const toggleStr = targetToggleMatch ? ` durante ${targetToggleMatch[1]} segundos` : '';
        
        let delaySecs = 0;
        if (delayMatch) delaySecs = Math.floor(parseInt(delayMatch[1])/1000);
        const delayStr = delaySecs > 0 ? ` tras ${delaySecs} segundos` : '';
        
        const ipStr = targetIpMatch ? targetIpMatch[1] : '?';

        parsedRule = `REGLA PASIVA: Escuchando a [${ipStr}]. Si se ${triggerStr}, entonces ESTE dispositivo debe ${targetStr}${delayStr}${toggleStr}.`;
      } else {
        parsedRule = 'No se pudo interpretar la regla. Revisa el cdigo fuente.';
      }

      setViewingScript({ name: script.name, code: parsedRule + '\n\n--- CODIGO FUENTE ---\n' + rawCode, loading: false });

    } catch (e) {
      setViewingScript({ name: script.name, code: 'Error de red', loading: false });
    }
  };
  
    const toggleScript = async (id: number, running: boolean) => {
    // Optimistic update
    setScripts(prev => prev.map(s => s.id === id ? { ...s, running: !running } : s));
    try {
      const res = await fetch('/api/iot/shelly', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: device.deviceId, action: running ? 'stop_script' : 'start_script', payload: { id } })
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'API failed');
      setTimeout(() => fetchScripts(), 1000);
    } catch (e: any) {
      console.error(e);
      alert('Error al cambiar el estado del script: ' + e.message);
      fetchScripts();
    }
  };

  const deleteScript = async (id: number) => {
    if (!confirm('¿Eliminar esta automatización?')) return;
    await fetch('/api/iot/shelly', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: device.deviceId, action: 'delete_script', payload: { id } })
    });
    await fetchScripts();
  };

  if (!device) return <div>Cargando...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="text-foreground/50 mb-4">
        <Link href="/iot/devices" className="hover:text-foreground/90">← Volver</Link>
      </div>
      <h1 className="text-3xl font-bold mb-6 text-foreground">{deviceName}</h1>

      <div className="flex space-x-2 border-b border-panel-border pb-px">
        {device.type === 'sensor' ? (
          ['mqtt_config', 'settings'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab as any)}
              className={`px-6 py-3 font-medium text-sm rounded-t-lg transition-colors ${activeTab === tab ? 'bg-panel-base backdrop-blur-md text-foreground border-t border-x border-panel-border' : 'text-foreground/60 dark:text-foreground/60 hover:text-foreground'}`}
            >
              {tab === 'mqtt_config' ? 'Configuración MQTT' : 'Ajustes'}
            </button>
          ))
        ) : (
          ['control', 'schedules', 'rules', 'settings'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab as any)}
              className={`px-6 py-3 font-medium text-sm rounded-t-lg transition-colors ${activeTab === tab ? 'bg-panel-base backdrop-blur-md text-foreground border-t border-x border-panel-border' : 'text-foreground/60 dark:text-foreground/60 hover:text-foreground'}`}
            >
              {tab === 'control' ? 'Control Manual' : tab === 'schedules' ? 'Programación (Timers)' : tab === 'rules' ? 'Automatizaciones' : 'Ajustes'}
            </button>
          ))
        )}
      </div>

      {activeTab === 'mqtt_config' && device.type === 'sensor' && (
        <div className="grid grid-cols-1 gap-6 pt-4">
          <div className="bg-panel-base backdrop-blur-md border border-panel-border rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-6">Configuración Rápida MQTT (Shelly H&T Gen3)</h2>
            <div className="bg-black/20 rounded-lg p-4">
              <p className="text-sm text-foreground/80 mb-4">
                Para que el sensor envíe datos al sistema, debes configurar los siguientes parámetros en la interfaz web del Shelly (IP local):
              </p>
              <ul className="list-disc pl-5 space-y-2 text-sm text-foreground/80">
                <li><strong>MQTT Enable:</strong> Activado</li>
                <li><strong>MQTT Server:</strong> <code>109.199.99.126:1883</code></li>
                <li><strong>MQTT Client ID:</strong> (Dejar por defecto: <code>{device.deviceId}</code>)</li>
                <li><strong>RPC over MQTT:</strong> Activado</li>
                <li><strong>Generic status update over MQTT:</strong> Activado</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'control' && device.type !== 'sensor' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
          <div className="bg-panel-base backdrop-blur-md border border-panel-border rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-6">Interruptor Principal</h2>
            <div className="flex items-center justify-between p-4 bg-black/20 rounded-lg">
              <span className="font-medium text-lg">Estado del Relé</span>
              <button onClick={toggleSwitch} className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${isOn ? 'bg-emerald-500' : 'bg-zinc-700'}`}>
                <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${isOn ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
          <div className="bg-panel-base backdrop-blur-md border border-panel-border rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-6">Historial en Vivo</h2>
            <div className="bg-black/20 rounded-lg p-4 h-64 overflow-y-auto">
              <ul className="space-y-3">
                {history.map((log) => (
                  <li key={log.id} className="flex justify-between items-center border-b border-panel-border pb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${log.event === 'on' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                      <span className="font-medium text-sm">{log.event === 'on' ? 'Encendido' : 'Apagado'}</span>
                    </div>
                    <span className="text-xs text-foreground/60 dark:text-foreground/60">{new Date(log.created_at).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}      {activeTab === 'settings' && (
        <div className="space-y-6 pt-4">
          <div className="bg-panel-base backdrop-blur-md border border-panel-border rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-6">Ajustes Generales</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-black/20 rounded-lg p-5">
                <h3 className="text-sm font-medium text-foreground/60 dark:text-foreground/60 mb-3">Renombrar Shelly</h3>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newName} 
                    onChange={e => setNewName(e.target.value)}
                    placeholder="Nuevo nombre..."
                    className="flex-1 bg-background border border-panel-border rounded-lg px-4 py-2 text-foreground focus:border-indigo-500 focus:outline-none"
                  />
                  <button 
                    onClick={saveName}
                    disabled={loading}
                    className="bg-zinc-800 hover:bg-zinc-700 text-foreground font-medium px-4 py-2 rounded-lg transition-colors"
                  >
                    Guardar
                  </button>
                </div>
              </div>

              <div className="bg-black/20 rounded-lg p-5 border border-amber-900/50">
                <h3 className="text-sm font-medium text-amber-500 mb-2">Mudanza de Red Wi-Fi</h3>
                <p className="text-xs text-foreground/60 dark:text-foreground/60 mb-4">Inyecta la clave Wi-Fi del galpón de cultivo como red de respaldo para que los dispositivos no se desconecten al mudarlos.</p>
                <Link href="/iot/migration" className="block text-center w-full bg-amber-600/20 hover:bg-amber-600/30 text-amber-500 border border-amber-600/30 font-medium py-2 px-4 rounded-lg transition-colors">
                  Abrir Asistente de Mudanza
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'schedules' && (
        <div className="space-y-6 pt-4">
          <div className="bg-panel-base backdrop-blur-md border border-panel-border rounded-xl p-6 border-l-4 border-indigo-500">
            <h2 className="text-xl font-semibold mb-2 text-indigo-400">Fotoperíodo Avanzado (Ciclo Continuo)</h2>
            <p className="text-sm text-foreground/60 dark:text-foreground/60 mb-6">Inyecta un script en el microchip que permite ciclos infinitos y sobrevive a cortes de luz. Ideal para ciclos mayores a 24 horas (Ej: 36h ON, 12h OFF).</p>
            
            <div className="flex items-end gap-4 max-w-2xl">
              <div className="flex-1">
                <label className="block text-sm font-medium text-foreground/60 dark:text-foreground/60 mb-1">Horas Encendido</label>
                <input 
                  type="number" min="0" step="0.5"
                  value={photoHoursOn} 
                  onChange={e => setPhotoHoursOn(Number(e.target.value))} 
                  className="w-full bg-background border border-panel-border rounded-lg px-4 py-2 text-foreground focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-foreground/60 dark:text-foreground/60 mb-1">Horas Apagado</label>
                <input 
                  type="number" min="0" step="0.5"
                  value={photoHoursOff} 
                  onChange={e => setPhotoHoursOff(Number(e.target.value))} 
                  className="w-full bg-background border border-panel-border rounded-lg px-4 py-2 text-foreground focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <button 
                onClick={createPhotoperiod} disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-500 text-foreground font-medium py-2 px-6 rounded-lg transition-colors disabled:opacity-50"
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

          <div className="bg-panel-base backdrop-blur-md border border-panel-border rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-2">Temporizador Autom�tico (Auto ON/OFF)</h2>
            <p className="text-sm text-foreground/60 dark:text-foreground/60 mb-6">Configura un tiempo exacto para que el dispositivo cambie de estado autom�ticamente cada vez que se active. (Pon todo en 0 para desactivar).</p>
            <div className="flex flex-wrap items-end gap-4 max-w-3xl">
              <div className="flex-1 min-w-[120px]"><label className="block text-sm font-medium text-foreground/60 dark:text-foreground/60 mb-1">Acci�n</label><select value={timerAction} onChange={e => setTimerAction(e.target.value)} className="w-full bg-background border border-panel-border rounded-lg px-4 py-2 text-foreground"><option value="off">Auto Apagar</option><option value="on">Auto Encender</option></select></div>
              <div className="w-24"><label className="block text-sm font-medium text-foreground/60 dark:text-foreground/60 mb-1">Horas</label><input type="number" min="0" value={timerHours} onChange={e => setTimerHours(Number(e.target.value))} className="w-full bg-background border border-panel-border rounded-lg px-4 py-2 text-foreground" /></div>
              <div className="w-24"><label className="block text-sm font-medium text-foreground/60 dark:text-foreground/60 mb-1">Minutos</label><input type="number" min="0" max="59" value={timerMinutes} onChange={e => setTimerMinutes(Number(e.target.value))} className="w-full bg-background border border-panel-border rounded-lg px-4 py-2 text-foreground" /></div>
              <div className="w-24"><label className="block text-sm font-medium text-foreground/60 dark:text-foreground/60 mb-1">Segundos</label><input type="number" min="0" max="59" value={timerSeconds} onChange={e => setTimerSeconds(Number(e.target.value))} className="w-full bg-background border border-panel-border rounded-lg px-4 py-2 text-foreground" /></div>
              <button onClick={saveTimer} disabled={loading} className="bg-blue-600 hover:bg-blue-500 text-foreground font-medium py-2 px-6 rounded-lg">{loading ? '...' : 'Guardar Timer'}</button>
            </div>
            {/* Listado de Timers Activos */}
            {switchConfig && (switchConfig.auto_on || switchConfig.auto_off) && (
              <div className="mt-6 border-t border-panel-border pt-4">
                <h3 className="font-medium mb-3 text-sm text-text-muted">Timers Activos (En el Dispositivo)</h3>
                <div className="space-y-2">
                  {switchConfig.auto_on && (
                    <div className="flex justify-between items-center bg-background/50 p-3 rounded-lg border border-panel-border">
                      <div className="flex items-center gap-3">
                        <Timer className="text-green-400 w-5 h-5" />
                        <div>
                          <p className="font-medium">Auto Encendido</p>
                          <p className="text-xs text-text-muted">Tiempo: {switchConfig.auto_on_delay} segundos</p>
                        </div>
                      </div>
                      <button onClick={() => handleDeleteAutoTimer('auto_on')} className="text-red-400 hover:text-red-300 transition-colors p-2 bg-red-400/10 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {switchConfig.auto_off && (
                    <div className="flex justify-between items-center bg-background/50 p-3 rounded-lg border border-panel-border">
                      <div className="flex items-center gap-3">
                        <Timer className="text-red-400 w-5 h-5" />
                        <div>
                          <p className="font-medium">Auto Apagado</p>
                          <p className="text-xs text-text-muted">Tiempo: {switchConfig.auto_off_delay} segundos</p>
                        </div>
                      </div>
                      <button onClick={() => handleDeleteAutoTimer('auto_off')} className="text-red-400 hover:text-red-300 transition-colors p-2 bg-red-400/10 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

          <div className="bg-panel-base backdrop-blur-md border border-panel-border rounded-xl p-6 mt-6">
            <h2 className="text-xl font-semibold mb-2">Crear Nueva Programación</h2>
            <p className="text-sm text-foreground/60 dark:text-foreground/60 mb-6">Los horarios se guardan en el chip interno del Shelly.</p>
            <div className="flex flex-col md:flex-row items-stretch md:items-end gap-4 max-w-2xl">
              <div className="flex-1"><label className="block text-sm font-medium text-foreground/60 dark:text-foreground/60 mb-1">Hora</label><input type="time" value={newSchTime} onChange={e => setNewSchTime(e.target.value)} className="w-full bg-background border border-panel-border rounded-lg px-4 py-2 text-foreground" /></div>
              <div className="flex-1"><label className="block text-sm font-medium text-foreground/60 dark:text-foreground/60 mb-1">Acción</label><select value={newSchAction} onChange={e => setNewSchAction(e.target.value)} className="w-full bg-background border border-panel-border rounded-lg px-4 py-2 text-foreground"><option value="true">Encender</option><option value="false">Apagar</option></select></div>
              <button onClick={createSchedule} disabled={loading} className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-500 text-foreground font-medium py-2 px-6 rounded-lg">{loading ? '...' : '+ Agregar'}</button>
            </div>
          </div>
          <div className="bg-panel-base backdrop-blur-md border border-panel-border rounded-xl overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-800">
              <thead className="bg-background/50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 dark:text-foreground/60 uppercase">Patrón</th><th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 dark:text-foreground/60 uppercase">Acción</th><th className="px-6 py-3 text-right text-xs font-medium text-foreground/60 dark:text-foreground/60 uppercase">Opciones</th></tr></thead>
              <tbody className="divide-y divide-zinc-800">
                {schedules.map((job) => (
                  <tr key={job.id} className="hover:bg-panel-border/30">
                    <td className="px-6 py-4 text-sm font-mono text-foreground/90">{job.timespec}</td>
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
          <div className="bg-panel-base backdrop-blur-md border border-panel-border rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4">Crear Automatización Cruzada</h2>
            <div className="flex gap-4 mb-6">
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" value="active" checked={ruleType === 'active'} onChange={() => setRuleType('active')} className="text-purple-600" />
                <span className={ruleType === 'active' ? 'font-semibold text-purple-400' : 'text-foreground/60'}>Regla Activa (Enviar Comando)</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" value="passive" checked={ruleType === 'passive'} onChange={() => setRuleType('passive')} className="text-emerald-600" />
                <span className={ruleType === 'passive' ? 'font-semibold text-emerald-400' : 'text-foreground/60'}>Regla Pasiva (Escuchar Remoto)</span>
              </label>
            </div>
            
            <p className="text-sm text-foreground/60 dark:text-foreground/60 mb-6">
              {ruleType === 'active' 
                ? 'El script vivirá en ESTE dispositivo y enviará comandos MQTT al otro Shelly.' 
                : 'El script vivirá en ESTE dispositivo y escuchará pasivamente los comandos del otro Shelly (útil si el otro alcanzó el límite de 3 scripts).'}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-6 items-end gap-4">
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-foreground/60 dark:text-foreground/60 mb-1">
                  {ruleType === 'active' ? 'Si este se...' : 'Si el remoto se...'}
                </label>
                <select value={ruleTrigger} onChange={e => setRuleTrigger(e.target.value)} className="w-full bg-background border border-panel-border rounded-lg px-4 py-2 text-foreground">
                  <option value="on">Enciende</option><option value="off">Apaga</option>
                </select>
              </div>
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-foreground/60 dark:text-foreground/60 mb-1">Retraso (Segs)</label>
                <input type="number" min="0" value={ruleDelay} onChange={e => setRuleDelay(Number(e.target.value))} className="w-full bg-background border border-panel-border rounded-lg px-4 py-2 text-foreground" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground/60 dark:text-foreground/60 mb-1">
                  {ruleType === 'active' ? 'El Dispositivo Remoto...' : 'Dispositivo Remoto (a escuchar)...'}
                </label>
                <select value={ruleTargetDev} onChange={e => setRuleTargetDev(e.target.value)} className="w-full bg-background border border-panel-border rounded-lg px-4 py-2 text-foreground">
                  {allDevices.filter(d => d.deviceId !== device.deviceId).map(d => <option key={d.id} value={d.deviceId}>{d.name} ({d.deviceId})</option>)}
                </select>
              </div>
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-foreground/60 dark:text-foreground/60 mb-1">
                  {ruleType === 'active' ? 'Debe...' : 'ESTE debe...'}
                </label>
                <select value={ruleAction} onChange={e => setRuleAction(e.target.value)} className="w-full bg-background border border-panel-border rounded-lg px-4 py-2 text-foreground">
                  <option value="on">Encenderse</option><option value="off">Apagarse</option>
                </select>
              </div>
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-foreground/60 dark:text-foreground/60 mb-1">Duración (Segs) [Opc]</label>
                <input type="number" min="0" value={ruleTargetDuration} onChange={e => setRuleTargetDuration(Number(e.target.value))} className="w-full bg-background border border-panel-border rounded-lg px-4 py-2 text-foreground" placeholder="0 = Infinito" />
              </div>
            </div>
            <button onClick={createRule} disabled={loading} className={`mt-6 ${ruleType === 'active' ? 'bg-purple-600 hover:bg-purple-500' : 'bg-emerald-600 hover:bg-emerald-500'} text-foreground font-medium py-2 px-6 rounded-lg`}>
              {loading ? '...' : '+ Agregar Regla'}
            </button>
          </div>
          <div className="bg-panel-base backdrop-blur-md border border-panel-border rounded-xl overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-800">
              <thead className="bg-background/50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 dark:text-foreground/60 uppercase">Script Name</th><th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 dark:text-foreground/60 uppercase">Estado</th><th className="px-6 py-3 text-right text-xs font-medium text-foreground/60 dark:text-foreground/60 uppercase">Opciones</th></tr></thead>
              <tbody className="divide-y divide-zinc-800">
                {scripts.map((s) => (
                  <tr key={s.id} className="hover:bg-panel-border/30">
                    <td className="px-6 py-4 text-sm font-medium text-foreground">{s.name}</td>
                    <td className="px-6 py-4 text-sm"><span className={`px-2 py-1 rounded text-xs ${s.running ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>{s.running ? 'Activo' : 'Detenido'}</span></td>
                    <td className="px-6 py-4 text-right"><button onClick={() => viewScriptCode(s)} className="text-blue-500 hover:text-blue-400 text-sm font-medium mr-4">Ver Regla</button><button onClick={() => toggleScript(s.id, s.running)} className="text-yellow-500 hover:text-yellow-400 text-sm font-medium mr-4">{s.running ? 'Pausar' : 'Activar'}</button><button onClick={() => deleteScript(s.id)} className="text-red-500 hover:text-red-400 text-sm font-medium">Eliminar</button></td>
                  </tr>
                ))}
                {scripts.length === 0 && <tr><td colSpan={3} className="px-6 py-8 text-center text-foreground/50 text-sm">No hay reglas configuradas.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewingScript && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6 w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">Detalles del Script: {viewingScript.name}</h3>
              <button onClick={() => setViewingScript(null)} className="text-gray-400 hover:text-white font-bold">X Cerrar</button>
            </div>
            <div className="flex-1 overflow-auto bg-black p-4 rounded-lg">
              {viewingScript.loading ? (
                <p className="text-gray-400">Cargando c�digo del script...</p>
              ) : (
                <pre className="text-sm text-green-400 whitespace-pre-wrap font-mono">
                  {viewingScript.code}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


