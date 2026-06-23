"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function BroadlinkPanel() {
  const [commands, setCommands] = useState<any[]>([]);
  const [learning, setLearning] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    fetchCommands();

    // Suscribirse a nuevos comandos aprendidos
    const channel = supabase
      .channel('broadlink_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'broadlink_commands' },
        (payload) => {
          console.log('Cambio en Broadlink:', payload);
          if (payload.eventType === 'INSERT') {
            setLearning(false);
            setStatusMsg("¡Código capturado exitosamente!");
            setCommands(prev => [...prev, payload.new]);
          } else if (payload.eventType === 'UPDATE') {
            setCommands(prev => prev.map(cmd => cmd.id === payload.new.id ? payload.new : cmd));
          } else if (payload.eventType === 'DELETE') {
            setCommands(prev => prev.filter(cmd => cmd.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchCommands = async () => {
    const { data, error } = await supabase.from('broadlink_commands').select('*').order('created_at', { ascending: false });
    if (data) setCommands(data);
  };

  const startLearning = async () => {
    setLearning(true);
    setStatusMsg("Esperando señal... Apunta tu control remoto y presiona el botón.");
    // Enviar comando MQTT para que el puente inicie el aprendizaje
    try {
      await fetch('/api/iot/mqtt_publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: 'cultivo/broadlink/learn', message: '{}' })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const [macroSequence, setMacroSequence] = useState<string[]>([]);
  const [macroName, setMacroName] = useState("");
  const [isSendingMacro, setIsSendingMacro] = useState(false);

  const sendCommand = async (hex_code: string) => {
    if (hex_code.startsWith('MACRO:')) {
      setIsSendingMacro(true);
      try {
        const sequence = JSON.parse(hex_code.replace('MACRO:', ''));
        for (let i = 0; i < sequence.length; i++) {
          setStatusMsg(`Enviando paso ${i+1} de ${sequence.length}...`);
          await fetch('/api/iot/mqtt_publish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic: 'cultivo/broadlink/command', message: JSON.stringify({ code: sequence[i] }) })
          });
          if (i < sequence.length - 1) {
             setStatusMsg(`Paso ${i+1} enviado. Esperando 3 segundos...`);
             await new Promise(resolve => setTimeout(resolve, 3000));
          }
        }
        setStatusMsg("¡Secuencia completada!");
      } catch(e) {
        setStatusMsg("Error al ejecutar secuencia");
      }
      setTimeout(() => setStatusMsg(""), 3000);
      setIsSendingMacro(false);
      return;
    }

    setStatusMsg("Enviando comando IR...");
    try {
      await fetch('/api/iot/mqtt_publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: 'cultivo/broadlink/command', message: JSON.stringify({ code: hex_code }) })
      });
      setTimeout(() => setStatusMsg(""), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const saveMacro = async () => {
    if(!macroName) return alert("Ponle un nombre a la secuencia.");
    const hex_code = "MACRO:" + JSON.stringify(macroSequence);
    const { error } = await supabase.from('broadlink_commands').insert([{
      name: macroName,
      hex_code: hex_code
    }]);
    if(!error) {
      setMacroSequence([]);
      setMacroName("");
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Clonador Infrarrojo (RM4 Mini)</h2>
          <p className="text-gray-400 text-sm">Gestiona y emite señales de controles remotos IR.</p>
        </div>
        <button 
          onClick={startLearning}
          disabled={learning}
          className={`px-4 py-2 rounded font-medium transition-colors ${learning ? 'bg-amber-600 text-white animate-pulse' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
        >
          {learning ? 'Escuchando...' : 'Aprender Nuevo Comando'}
        </button>
      </div>

      {statusMsg && (
        <div className="mb-4 p-3 bg-neutral-800 border border-neutral-700 rounded text-emerald-400 text-sm">
          {statusMsg}
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
                   {i+1}. {cmdName}
                   <button 
                     onClick={() => setMacroSequence(macroSequence.filter((_, index) => index !== i))}
                     className="text-white hover:text-red-300 font-bold ml-1"
                   >
                     ×
                   </button>
                 </span>
               )
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
              try { parsedSequence = JSON.parse(macro.hex_code.replace('MACRO:', '')); } catch(e){}
              
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
            )})}
          </div>
        </div>
      )}
    </div>
  );
}
