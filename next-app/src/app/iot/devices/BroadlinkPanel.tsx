"use client";

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { RefreshCw, Radio, Wifi, CheckCircle2, AlertTriangle } from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function BroadlinkPanel() {
  const [commands, setCommands] = useState<any[]>([]);
  const [learning, setLearning] = useState(false);
  const [learnSecondsLeft, setLearnSecondsLeft] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [statusType, setStatusType] = useState<'success' | 'warning' | 'error'>('success');
  const [rm4Status, setRm4Status] = useState<{
    online: boolean;
    rm4Ip: string | null;
    lastMessage: string;
    updatedAt?: string;
  }>({
    online: true,
    rm4Ip: '192.168.100.7',
    lastMessage: 'Conectado al RM4 en 192.168.100.7',
  });

  const learnTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchCommands();
    fetchRm4Status();

    const channel = supabase
      .channel('broadlink_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'broadlink_commands' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            stopLearnCountdown();
            setLearning(false);
            setStatusType('success');
            setStatusMsg("¡Código IR capturado y guardado exitosamente en la base de datos!");
            setCommands(prev => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setCommands(prev => prev.map(cmd => cmd.id === payload.new.id ? payload.new : cmd));
          } else if (payload.eventType === 'DELETE') {
            setCommands(prev => prev.filter(cmd => cmd.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      stopLearnCountdown();
      supabase.removeChannel(channel);
    };
  }, []);

  const stopLearnCountdown = () => {
    if (learnTimerRef.current) {
      clearInterval(learnTimerRef.current);
      learnTimerRef.current = null;
    }
    setLearnSecondsLeft(0);
  };

  const startLearnCountdown = (seconds = 30) => {
    stopLearnCountdown();
    setLearnSecondsLeft(seconds);
    learnTimerRef.current = setInterval(() => {
      setLearnSecondsLeft(prev => {
        if (prev <= 1) {
          stopLearnCountdown();
          setLearning(false);
          setStatusType('warning');
          setStatusMsg("Modo escucha finalizado (30s agotados sin detectar señal infrarroja frente al RM4).");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const fetchCommands = async () => {
    const { data } = await supabase.from('broadlink_commands').select('*').order('created_at', { ascending: false });
    if (data) setCommands(data);
  };

  const fetchRm4Status = async () => {
    try {
      const res = await fetch('/api/iot/mqtt_publish');
      const data = await res.json();
      if (data.success && data.status) {
        setRm4Status(data.status);
      }
    } catch (e) {}
  };

  const verifyRm4Connection = async () => {
    setVerifying(true);
    setStatusType('warning');
    setStatusMsg("Verificando enlace con la Raspberry Pi y re-autenticando RM4 Mini en el cultivo...");
    try {
      const res = await fetch('/api/iot/mqtt_publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify_rm4' })
      });
      const data = await res.json();
      if (data.online) {
        setRm4Status({
          online: true,
          rm4Ip: data.rm4Ip || '192.168.100.7',
          lastMessage: data.statusMessage,
          updatedAt: data.timestamp
        });
        setStatusType('success');
        setStatusMsg(`Enlace verificado en vivo: ${data.statusMessage}`);
      } else {
        setRm4Status(prev => ({
          ...prev,
          online: false,
          lastMessage: data.statusMessage || 'Sin respuesta del RM4'
        }));
        setStatusType('error');
        setStatusMsg(`Alerta de enlace: ${data.statusMessage || 'No se pudo contactar al RM4 Mini'}`);
      }
    } catch (err) {
      setStatusType('error');
      setStatusMsg("Error de red al verificar el estado del RM4 Mini.");
    } finally {
      setVerifying(false);
    }
  };

  const startLearning = async () => {
    setLearning(true);
    setStatusType('warning');
    setStatusMsg("Solicitando modo escucha al RM4 Mini en el cultivo...");
    try {
      const res = await fetch('/api/iot/mqtt_publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: 'cultivo/broadlink/learn', message: '{}' })
      });
      const data = await res.json();

      if (data.learningActive) {
        setRm4Status(prev => ({
          ...prev,
          online: true,
          rm4Ip: data.rm4Ip || prev.rm4Ip,
          lastMessage: data.statusMessage
        }));
        setStatusType('success');
        setStatusMsg(data.statusMessage || "Modo aprendizaje ACTIVADO. Apuntá el control remoto al RM4 y presioná el botón...");
        startLearnCountdown(30);
      } else {
        setLearning(false);
        setStatusType('error');
        setStatusMsg(data.statusMessage || "El RM4 Mini no pudo entrar en modo escucha.");
      }
    } catch (err) {
      setLearning(false);
      setStatusType('error');
      setStatusMsg("Error al comunicarse con el servidor MQTT.");
    }
  };

  const [macroSequence, setMacroSequence] = useState<string[]>([]);
  const [macroName, setMacroName] = useState("");
  const [isSendingMacro, setIsSendingMacro] = useState(false);

  const sendCommand = async (hex_code: string) => {
    if (hex_code.startsWith('MACRO:')) {
      setIsSendingMacro(true);
      setStatusType('warning');
      try {
        const sequence = JSON.parse(hex_code.replace('MACRO:', ''));
        for (let i = 0; i < sequence.length; i++) {
          setStatusMsg(`Enviando paso ${i + 1} de ${sequence.length} al RM4 Mini...`);
          await fetch('/api/iot/mqtt_publish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic: 'cultivo/broadlink/command', message: JSON.stringify({ code: sequence[i] }) })
          });
          if (i < sequence.length - 1) {
            setStatusMsg(`Paso ${i + 1} emitido en el cultivo. Esperando 3 segundos...`);
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        }
        setStatusType('success');
        setStatusMsg("¡Secuencia IR completada y emitida en el cultivo!");
      } catch (e) {
        setStatusType('error');
        setStatusMsg("Error al ejecutar la secuencia IR.");
      }
      setTimeout(() => setStatusMsg(""), 4000);
      setIsSendingMacro(false);
      return;
    }

    setStatusType('warning');
    setStatusMsg("Emitiendo señal IR en el cultivo...");
    try {
      const res = await fetch('/api/iot/mqtt_publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: 'cultivo/broadlink/command', message: JSON.stringify({ code: hex_code }) })
      });
      const data = await res.json();
      if (data.success) {
        setStatusType('success');
        setStatusMsg(`RM4 Mini: ${data.statusMessage || 'Código IR enviado correctamente.'}`);
      } else {
        setStatusType('error');
        setStatusMsg(`Error RM4: ${data.statusMessage || 'No se pudo emitir la señal.'}`);
      }
      setTimeout(() => setStatusMsg(""), 3500);
    } catch (err) {
      setStatusType('error');
      setStatusMsg("Error de red al enviar comando IR.");
    }
  };

  const saveMacro = async () => {
    if (!macroName) return alert("Ponle un nombre a la secuencia.");
    const hex_code = "MACRO:" + JSON.stringify(macroSequence);
    const { error } = await supabase.from('broadlink_commands').insert([{
      name: macroName,
      hex_code: hex_code
    }]);
    if (!error) {
      setMacroSequence([]);
      setMacroName("");
      setStatusType('success');
      setStatusMsg("Secuencia guardada.");
      setTimeout(() => setStatusMsg(""), 2000);
    }
  };

  const singleCommands = commands.filter(cmd => !cmd.hex_code.startsWith('MACRO:'));
  const macroCommands = commands.filter(cmd => cmd.hex_code.startsWith('MACRO:'));

  const updateName = async (id: string, newName: string) => {
    const { error } = await supabase.from('broadlink_commands').update({ name: newName }).eq('id', id);
    if (!error) {
      setCommands(prev => prev.map(cmd => cmd.id === id ? { ...cmd, name: newName } : cmd));
    }
  };

  const deleteCommand = async (id: string) => {
    await supabase.from('broadlink_commands').delete().eq('id', id);
  };

  return (
    <div className="bg-neutral-900 rounded-xl border border-neutral-800 shadow-lg p-6 mt-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold text-foreground">Clonador Infrarrojo (RM4 Mini)</h2>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                rm4Status.online
                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-700/50'
                  : 'bg-red-950/60 text-red-400 border-red-700/50'
              }`}
            >
              <Wifi className="w-3.5 h-3.5" />
              {rm4Status.online
                ? `RM4 Online${rm4Status.rm4Ip ? ` (${rm4Status.rm4Ip})` : ''}`
                : 'RM4 Sin Respuesta'}
            </span>
          </div>
          <p className="text-gray-400 text-sm mt-1">
            Gestiona, verifica a distancia y emite señales de controles remotos IR a través de la Raspberry Pi en el cultivo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={verifyRm4Connection}
            disabled={verifying || learning}
            className="px-3.5 py-2 rounded font-medium text-sm bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-gray-200 transition-colors flex items-center gap-2 disabled:opacity-50"
            title="Re-autentica la sesión del RM4 Mini a distancia y verifica que esté respondiendo en la red del cultivo"
          >
            <RefreshCw className={`w-4 h-4 ${verifying ? 'animate-spin text-blue-400' : 'text-gray-400'}`} />
            {verifying ? 'Verificando...' : 'Verificar / Reconectar RM4'}
          </button>

          <button
            onClick={startLearning}
            disabled={learning || verifying}
            className={`px-4 py-2 rounded font-medium text-sm transition-colors flex items-center gap-2 ${
              learning
                ? 'bg-amber-600 text-white animate-pulse'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            <Radio className="w-4 h-4" />
            {learning
              ? `Escuchando en Cultivo (${learnSecondsLeft}s)...`
              : 'Aprender Nuevo Comando'}
          </button>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`mb-5 p-3.5 rounded-lg border text-sm flex items-center gap-2.5 ${
            statusType === 'error'
              ? 'bg-red-950/40 border-red-800/60 text-red-300'
              : statusType === 'warning'
              ? 'bg-amber-950/40 border-amber-800/60 text-amber-300'
              : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
          }`}
        >
          {statusType === 'error' ? (
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          )}
          <span>{statusMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {singleCommands.map(cmd => (
          <div key={cmd.id} className="bg-neutral-800 p-4 rounded-lg border border-neutral-700 flex flex-col justify-between">
            <div className="mb-4">
              <input
                type="text"
                value={cmd.name}
                onChange={(e) => {
                  const newCommands = [...commands];
                  const index = newCommands.findIndex(c => c.id === cmd.id);
                  newCommands[index].name = e.target.value;
                  setCommands(newCommands);
                }}
                onBlur={(e) => updateName(cmd.id, e.target.value)}
                className="bg-transparent border-b border-neutral-600 text-white w-full focus:outline-none focus:border-blue-500 pb-1 font-medium"
              />
              <p className="text-xs text-gray-500 mt-2 truncate font-mono" title={cmd.hex_code}>
                {cmd.hex_code.substring(0, 16)}...
              </p>
            </div>

            <div className="flex justify-between items-center mt-2">
              <button
                onClick={() => setMacroSequence([...macroSequence, cmd.hex_code])}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium border border-blue-500/30 px-2 py-1 rounded"
              >
                + a Secuencia
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => sendCommand(cmd.hex_code)}
                  disabled={isSendingMacro}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white p-2 rounded-full flex items-center justify-center w-8 h-8 transition-colors"
                  title="Emitir Señal"
                >
                  ▶
                </button>
                <button
                  onClick={() => deleteCommand(cmd.id)}
                  className="text-red-400 hover:text-red-300 text-xs px-2"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        ))}
        {singleCommands.length === 0 && !learning && (
          <div className="col-span-full text-center py-8 text-gray-500">
            No hay comandos individuales guardados aún.
          </div>
        )}
      </div>

      {/* Macro Builder */}
      {macroSequence.length > 0 && (
        <div className="mt-8 bg-neutral-800 p-6 rounded-xl border border-blue-500 shadow-lg">
          <h3 className="text-xl font-bold mb-4 text-blue-400">Creador de Secuencia</h3>
          <div className="flex flex-wrap gap-2 mb-6">
            {macroSequence.map((hex, i) => {
              const cmdName = singleCommands.find(c => c.hex_code === hex)?.name || "Comando";
              return (
                <span key={i} className="bg-blue-600 px-3 py-1 rounded text-sm text-white flex items-center gap-2">
                  {i + 1}. {cmdName}
                  <button
                    onClick={() => setMacroSequence(macroSequence.filter((_, index) => index !== i))}
                    className="text-white hover:text-red-300 font-bold ml-1"
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              placeholder="Nombre de la secuencia (ej. Rutina Día)"
              value={macroName}
              onChange={e => setMacroName(e.target.value)}
              className="bg-neutral-900 border border-neutral-700 rounded px-4 py-2 text-white flex-1 focus:border-blue-500 focus:outline-none"
            />
            <button
              onClick={saveMacro}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded font-medium transition-colors"
            >
              Guardar Secuencia
            </button>
            <button
              onClick={() => { setMacroSequence([]); setMacroName(""); }}
              className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded font-medium transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Macros Grid */}
      {macroCommands.length > 0 && (
        <div className="mt-12">
          <h3 className="text-2xl font-bold text-foreground mb-6 border-b border-neutral-800 pb-2">Secuencias Guardadas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {macroCommands.map(macro => {
              let parsedSequence: string[] = [];
              try { parsedSequence = JSON.parse(macro.hex_code.replace('MACRO:', '')); } catch (e) {}

              return (
                <div key={macro.id} className="bg-neutral-800 p-4 rounded-lg border border-blue-900/50 flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-blue-600/10 rounded-bl-full pointer-events-none"></div>
                  <div className="mb-4">
                    <input
                      type="text"
                      value={macro.name}
                      onChange={(e) => {
                        const newCommands = [...commands];
                        const index = newCommands.findIndex(c => c.id === macro.id);
                        newCommands[index].name = e.target.value;
                        setCommands(newCommands);
                      }}
                      onBlur={(e) => updateName(macro.id, e.target.value)}
                      className="bg-transparent border-b border-neutral-600 text-white w-full focus:outline-none focus:border-blue-500 pb-1 font-bold text-lg"
                    />
                    <p className="text-sm text-blue-400 mt-2 font-medium">
                      {parsedSequence.length} comandos (espera de 3s)
                    </p>
                  </div>

                  <div className="flex justify-between items-center mt-2">
                    <button
                      onClick={() => sendCommand(macro.hex_code)}
                      disabled={isSendingMacro}
                      className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded font-medium transition-colors flex items-center gap-2"
                    >
                      <span>▶</span> Ejecutar Secuencia
                    </button>
                    <button
                      onClick={() => deleteCommand(macro.id)}
                      className="text-red-400 hover:text-red-300 text-sm px-2"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
