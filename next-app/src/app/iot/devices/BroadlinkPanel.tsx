"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  RefreshCw,
  Radio,
  Wifi,
  CheckCircle2,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  FolderPlus,
  Layers,
  Cpu,
  Plus,
  Trash2,
  Power,
  Clock,
  Bot,
  User,
  Activity,
  Loader2,
  ListOrdered,
} from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const DEFAULT_EQUIPMENTS = [
  'Climatizador',
  'Aire Acondicionado',
  'Deshumidificador',
  'Calefactor',
  'Ventilación',
];

export type PowerEffect = 'on' | 'off' | 'toggle';

export interface CommandMeta {
  equipment: string;
  order: number;
  ip: string;
  powerEffect: PowerEffect;
}

export interface EquipmentRuntimeState {
  equipment: string;
  powerState: 'on' | 'off';
  activeCommandId: string | null;
  activeCommandName: string | null;
  isSequence: boolean;
  steps?: string[];
  source: 'manual' | 'automation' | 'manual_sync';
  ruleName?: string | null;
  updatedAt: string;
}

export interface ExecutingSequenceState {
  commandId: string | null;
  commandName: string;
  equipment: string;
  currentStep: number;
  totalSteps: number;
  currentStepName?: string;
  startedAt: string;
}

export function inferPowerEffect(name: string): PowerEffect {
  const lower = (name || '').toLowerCase();
  if (lower.includes('on/off') || lower.includes('encendido apagado') || lower.includes('encendido/apagado')) {
    return 'toggle';
  }
  if ((lower.includes('apagar') || lower.includes('off')) && !lower.includes('encend') && !lower.includes('on/')) {
    return 'off';
  }
  return 'on';
}

export function parseCommandMeta(cmd: any, fallbackIndex = 0): CommandMeta {
  const raw = cmd?.device_ip || '';
  if (typeof raw === 'string' && raw.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(raw);
      const validEffect: PowerEffect =
        parsed.powerEffect === 'on' || parsed.powerEffect === 'off' || parsed.powerEffect === 'toggle'
          ? parsed.powerEffect
          : inferPowerEffect(cmd?.name || '');
      return {
        equipment: (parsed.equipment || 'Climatizador').trim(),
        order: typeof parsed.order === 'number' ? parsed.order : fallbackIndex + 1,
        ip: parsed.ip || '192.168.100.7',
        powerEffect: validEffect,
      };
    } catch (e) {}
  }

  // Inferir equipo del nombre si aún no tenía metadatos JSON
  const lowerName = (cmd?.name || '').toLowerCase();
  let inferredEquipment = 'Climatizador';
  if (lowerName.includes('aire') || lowerName.includes('split') || lowerName.includes('ac ')) {
    inferredEquipment = 'Aire Acondicionado';
  } else if (lowerName.includes('deshum')) {
    inferredEquipment = 'Deshumidificador';
  } else if (lowerName.includes('calefac') || lowerName.includes('estufa')) {
    inferredEquipment = 'Calefactor';
  } else if (lowerName.includes('ventil') || lowerName.includes('extrac')) {
    inferredEquipment = 'Ventilación';
  } else if (lowerName.includes('climatizador')) {
    inferredEquipment = 'Climatizador';
  }

  return {
    equipment: inferredEquipment,
    order: fallbackIndex + 1,
    ip: typeof raw === 'string' && raw ? raw : '192.168.100.7',
    powerEffect: inferPowerEffect(cmd?.name || ''),
  };
}

export function serializeCommandMeta(meta: Partial<CommandMeta> & { equipment: string; order: number; ip?: string }): string {
  return JSON.stringify({
    equipment: (meta.equipment || 'General').trim() || 'General',
    order: meta.order,
    ip: meta.ip || '192.168.100.7',
    powerEffect: meta.powerEffect || 'on',
  });
}

export function formatRelativeTimeAr(isoDate?: string | null, nowMs = Date.now()): string {
  if (!isoDate) return 'Sin registro';
  const ts = new Date(isoDate).getTime();
  if (Number.isNaN(ts)) return 'Sin registro';
  const diffSec = Math.max(0, Math.floor((nowMs - ts) / 1000));
  const timeStr = new Date(ts).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (diffSec < 60) return `hace unos seg (${timeStr} hs)`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `hace ${diffMin} min (${timeStr} hs)`;
  const diffHr = Math.floor(diffMin / 60);
  const remMin = diffMin % 60;
  if (diffHr < 24) return `hace ${diffHr}h ${remMin}m (${timeStr} hs)`;
  const diffDays = Math.floor(diffHr / 24);
  return `hace ${diffDays}d (${timeStr} hs)`;
}

export default function BroadlinkPanel() {
  const [commands, setCommands] = useState<any[]>([]);
  const [learning, setLearning] = useState(false);
  const [learnSecondsLeft, setLearnSecondsLeft] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [statusType, setStatusType] = useState<'success' | 'warning' | 'error'>('success');

  // Equipo y nombre seleccionados para el próximo comando a aprender
  const [selectedEquipment, setSelectedEquipment] = useState<string>('Climatizador');
  const [customEquipments, setCustomEquipments] = useState<string[]>([]);
  const [newEquipmentInput, setNewEquipmentInput] = useState<string>('');
  const [isAddingEquipment, setIsAddingEquipment] = useState<boolean>(false);
  const [pendingCommandName, setPendingCommandName] = useState<string>('');
  const [activeFilterEquipment, setActiveFilterEquipment] = useState<string>('ALL');

  // Monitor de estado por equipo y secuencias activas
  const [equipmentStates, setEquipmentStates] = useState<Record<string, EquipmentRuntimeState>>({});
  const [executingSequence, setExecutingSequence] = useState<ExecutingSequenceState | null>(null);
  const [syncingEquipment, setSyncingEquipment] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

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
  const pendingLearnMetaRef = useRef<{ equipment: string; customName: string }>({
    equipment: 'Climatizador',
    customName: '',
  });
  const commandsRef = useRef<any[]>([]);
  commandsRef.current = commands;

  useEffect(() => {
    fetchCommands();
    fetchRm4Status();

    const pollInterval = setInterval(() => {
      fetchRm4Status();
      setNowMs(Date.now());
    }, 5000);

    const channel = supabase
      .channel('broadlink_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'broadlink_commands' },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const newCmd = payload.new as any;
            if (!newCmd.hex_code?.startsWith('MACRO:')) {
              stopLearnCountdown();
              setLearning(false);

              const targetEquip = pendingLearnMetaRef.current.equipment || 'Climatizador';
              const targetName = pendingLearnMetaRef.current.customName?.trim();

              // Calcular el siguiente número de orden dentro de este equipo
              const currentSingleCmds = commandsRef.current.filter(
                c => !c.hex_code?.startsWith('MACRO:') && c.id !== newCmd.id
              );
              const sameEquipCmds = currentSingleCmds.filter(
                c => parseCommandMeta(c).equipment.toLowerCase() === targetEquip.toLowerCase()
              );
              const maxOrder = sameEquipCmds.reduce(
                (max, c, idx) => Math.max(max, parseCommandMeta(c, idx).order),
                0
              );
              const nextOrder = maxOrder + 1;

              const rawMeta = parseCommandMeta(newCmd);
              const finalName =
                targetName && targetName.length > 0
                  ? targetName
                  : newCmd.name === 'Nuevo Comando RM4' || newCmd.name === 'Nuevo Comando (Editar nombre)'
                  ? `Comando #${nextOrder} (${targetEquip})`
                  : newCmd.name;

              const updatedDeviceIp = serializeCommandMeta({
                equipment: targetEquip,
                order: nextOrder,
                ip: rawMeta.ip,
                powerEffect: inferPowerEffect(finalName),
              });

              const updatedCmd = {
                ...newCmd,
                name: finalName,
                device_ip: updatedDeviceIp,
              };

              setCommands(prev => {
                const exists = prev.some(c => c.id === updatedCmd.id);
                return exists
                  ? prev.map(c => (c.id === updatedCmd.id ? updatedCmd : c))
                  : [...prev, updatedCmd];
              });

              setPendingCommandName('');
              setStatusType('success');
              setStatusMsg(
                `¡Código IR capturado y asignado a "${targetEquip}" en la posición #${nextOrder}!`
              );

              await supabase
                .from('broadlink_commands')
                .update({ name: finalName, device_ip: updatedDeviceIp })
                .eq('id', newCmd.id);
            } else {
              setCommands(prev => {
                const exists = prev.some(c => c.id === newCmd.id);
                return exists ? prev : [...prev, newCmd];
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            setCommands(prev => prev.map(cmd => (cmd.id === payload.new.id ? payload.new : cmd)));
          } else if (payload.eventType === 'DELETE') {
            setCommands(prev => prev.filter(cmd => cmd.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(pollInterval);
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
          setStatusMsg(
            "Modo escucha finalizado (30s agotados sin detectar señal infrarroja frente al RM4)."
          );
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const fetchCommands = async () => {
    const { data } = await supabase
      .from('broadlink_commands')
      .select('*')
      .order('created_at', { ascending: true });
    if (data) setCommands(data);
  };

  const fetchRm4Status = async () => {
    try {
      const res = await fetch('/api/iot/mqtt_publish');
      const data = await res.json();
      if (data.success) {
        if (data.status) setRm4Status(data.status);
        if (data.equipmentStates) setEquipmentStates(data.equipmentStates);
        setExecutingSequence(data.executingSequence || null);
      }
    } catch (e) {}
  };

  // Lista unificada de equipos disponibles (predefinidos + existentes en BD + creados en sesión)
  const allEquipments = useMemo(() => {
    const set = new Set<string>(DEFAULT_EQUIPMENTS);
    customEquipments.forEach(eq => set.add(eq));
    commands.forEach((c, idx) => {
      const meta = parseCommandMeta(c, idx);
      if (meta.equipment) set.add(meta.equipment);
    });
    Object.keys(equipmentStates).forEach(eq => set.add(eq));
    return Array.from(set);
  }, [commands, customEquipments, equipmentStates]);

  const singleCommands = useMemo(
    () => commands.filter(cmd => !cmd.hex_code?.startsWith('MACRO:')),
    [commands]
  );

  const macroCommands = useMemo(
    () => commands.filter(cmd => cmd.hex_code?.startsWith('MACRO:')),
    [commands]
  );

  // Agrupar comandos individuales por equipo y ordenarlos por `meta.order` ascendente
  const groupedByEquipment = useMemo(() => {
    const groups: Record<string, Array<{ cmd: any; meta: CommandMeta }>> = {};

    singleCommands.forEach((cmd, idx) => {
      const meta = parseCommandMeta(cmd, idx);
      const eq = meta.equipment || 'Climatizador';
      if (!groups[eq]) groups[eq] = [];
      groups[eq].push({ cmd, meta });
    });

    Object.keys(groups).forEach(eq => {
      groups[eq].sort((a, b) => {
        if (a.meta.order !== b.meta.order) return a.meta.order - b.meta.order;
        return new Date(a.cmd.created_at || 0).getTime() - new Date(b.cmd.created_at || 0).getTime();
      });
    });

    return groups;
  }, [singleCommands]);

  const equipmentKeysWithCommands = useMemo(() => {
    const keys = Object.keys(groupedByEquipment);
    return keys.sort((a, b) => {
      const idxA = allEquipments.indexOf(a);
      const idxB = allEquipments.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      return a.localeCompare(b);
    });
  }, [groupedByEquipment, allEquipments]);

  // Equipos visibles en el Monitor de Estado (todos los que tienen comandos, secuencias o estado guardado)
  const monitorEquipments = useMemo(() => {
    const set = new Set<string>(equipmentKeysWithCommands);
    macroCommands.forEach((m, idx) => {
      const meta = parseCommandMeta(m, idx);
      if (meta.equipment) set.add(meta.equipment);
    });
    Object.keys(equipmentStates).forEach(eq => set.add(eq));
    return Array.from(set).sort((a, b) => {
      const idxA = allEquipments.indexOf(a);
      const idxB = allEquipments.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      return a.localeCompare(b);
    });
  }, [equipmentKeysWithCommands, macroCommands, equipmentStates, allEquipments]);

  const handleAddEquipment = () => {
    const clean = newEquipmentInput.trim();
    if (!clean) return;
    if (!customEquipments.includes(clean)) {
      setCustomEquipments(prev => [...prev, clean]);
    }
    setSelectedEquipment(clean);
    setNewEquipmentInput('');
    setIsAddingEquipment(false);
  };

  const verifyRm4Connection = async () => {
    setVerifying(true);
    setStatusType('warning');
    setStatusMsg("Verificando enlace con la Raspberry Pi y re-autenticando RM4 Mini en el cultivo...");
    try {
      const res = await fetch('/api/iot/mqtt_publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify_rm4' }),
      });
      const data = await res.json();
      if (data.online) {
        setRm4Status({
          online: true,
          rm4Ip: data.rm4Ip || '192.168.100.7',
          lastMessage: data.statusMessage,
          updatedAt: data.timestamp,
        });
        setStatusType('success');
        setStatusMsg(`Enlace verificado en vivo: ${data.statusMessage}`);
      } else {
        setRm4Status(prev => ({
          ...prev,
          online: false,
          lastMessage: data.statusMessage || 'Sin respuesta del RM4',
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

  const syncEquipmentStateManually = async (equipment: string, targetPower: 'on' | 'off') => {
    setSyncingEquipment(equipment);
    const existing = equipmentStates[equipment];
    try {
      const res = await fetch('/api/iot/mqtt_publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync_equipment_state',
          equipment,
          powerState: targetPower,
          activeCommandId: targetPower === 'off' ? null : (existing?.activeCommandId ?? null),
          activeCommandName:
            targetPower === 'off'
              ? 'Apagado (Sincronización manual)'
              : existing?.activeCommandName && !existing.activeCommandName.includes('Apagado')
              ? existing.activeCommandName
              : 'Encendido (Sincronización manual)',
          isSequence: targetPower === 'off' ? false : Boolean(existing?.isSequence),
          steps: targetPower === 'off' ? undefined : existing?.steps,
          source: 'manual_sync',
          clearExecuting: true,
        }),
      });
      const data = await res.json();
      if (data.success && data.equipmentStates) {
        setEquipmentStates(data.equipmentStates);
        setExecutingSequence(null);
        setNowMs(Date.now());
        setStatusType('success');
        setStatusMsg(
          `Estado de "${equipment}" sincronizado manualmente a ${targetPower === 'on' ? 'ENCENDIDO (ON)' : 'APAGADO (OFF)'} sin emitir IR.`
        );
        setTimeout(() => setStatusMsg(""), 3000);
      }
    } catch (e) {
      setStatusType('error');
      setStatusMsg("Error al sincronizar el estado manual del equipo.");
    } finally {
      setSyncingEquipment(null);
    }
  };

  const startLearningForEquipment = async (equipmentOverride?: string) => {
    const targetEquip = equipmentOverride || selectedEquipment || 'Climatizador';
    if (equipmentOverride) {
      setSelectedEquipment(equipmentOverride);
    }
    pendingLearnMetaRef.current = {
      equipment: targetEquip,
      customName: pendingCommandName.trim(),
    };

    setLearning(true);
    setStatusType('warning');
    setStatusMsg(
      `Activando modo escucha en el RM4 Mini para el equipo "${targetEquip}"...`
    );
    try {
      const payloadMsg = pendingCommandName.trim()
        ? JSON.stringify({ name: pendingCommandName.trim(), equipment: targetEquip })
        : JSON.stringify({ equipment: targetEquip });

      const res = await fetch('/api/iot/mqtt_publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: 'cultivo/broadlink/learn', message: payloadMsg }),
      });
      const data = await res.json();

      if (data.learningActive) {
        setRm4Status(prev => ({
          ...prev,
          online: true,
          rm4Ip: data.rm4Ip || prev.rm4Ip,
          lastMessage: data.statusMessage,
        }));
        setStatusType('success');
        setStatusMsg(
          `[${targetEquip}] ${
            data.statusMessage ||
            'Modo aprendizaje ACTIVADO. Apuntá el control remoto al RM4 y presioná el botón...'
          }`
        );
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
  const [macroEquipment, setMacroEquipment] = useState<string>('Climatizador');
  const [macroPowerEffect, setMacroPowerEffect] = useState<'on' | 'off'>('on');
  const [isSendingMacro, setIsSendingMacro] = useState(false);

  const addToMacroSequence = (cmd: any) => {
    const meta = parseCommandMeta(cmd);
    if (macroSequence.length === 0 && meta.equipment) {
      setMacroEquipment(meta.equipment);
    }
    setMacroSequence(prev => [...prev, cmd.hex_code]);
  };

  const sendCommand = async (cmdObjOrHex: any) => {
    const isString = typeof cmdObjOrHex === 'string';
    const cmdObj = isString ? null : cmdObjOrHex;
    const hex_code: string = isString ? cmdObjOrHex : cmdObj.hex_code;
    const cmdMeta = cmdObj ? parseCommandMeta(cmdObj) : null;

    if (hex_code.startsWith('MACRO:')) {
      setIsSendingMacro(true);
      setStatusType('warning');
      const targetEquip = cmdMeta?.equipment || 'Climatizador';
      const targetPower: 'on' | 'off' = cmdMeta?.powerEffect === 'off' ? 'off' : 'on';

      try {
        const sequence: string[] = JSON.parse(hex_code.replace('MACRO:', ''));
        const stepNames = sequence.map((stepHex, idx) => {
          const found = singleCommands.find(c => c.hex_code === stepHex);
          return found ? found.name : `Paso ${idx + 1}`;
        });
        const startedAt = new Date().toISOString();

        for (let i = 0; i < sequence.length; i++) {
          const execPayload: ExecutingSequenceState = {
            commandId: cmdObj?.id || null,
            commandName: cmdObj?.name || 'Secuencia IR',
            equipment: targetEquip,
            currentStep: i + 1,
            totalSteps: sequence.length,
            currentStepName: stepNames[i],
            startedAt,
          };
          setExecutingSequence(execPayload);
          setStatusMsg(
            `[${targetEquip}] Ejecutando paso ${i + 1} de ${sequence.length}: "${stepNames[i]}"...`
          );

          await fetch('/api/iot/mqtt_publish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'set_executing_sequence', executingSequence: execPayload }),
          });

          const isLastStep = i === sequence.length - 1;
          const cmdRes = await fetch('/api/iot/mqtt_publish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              topic: 'cultivo/broadlink/command',
              message: JSON.stringify({ code: sequence[i], name: stepNames[i] }),
              clearExecuting: isLastStep,
              stateUpdate: isLastStep
                ? {
                    equipment: targetEquip,
                    powerState: targetPower,
                    activeCommandId: cmdObj?.id || null,
                    activeCommandName: cmdObj?.name || 'Secuencia IR',
                    isSequence: true,
                    steps: stepNames,
                    source: 'manual',
                  }
                : undefined,
            }),
          });
          const cmdData = await cmdRes.json();
          if (isLastStep && cmdData.equipmentStates) {
            setEquipmentStates(cmdData.equipmentStates);
          }

          if (!isLastStep) {
            setStatusMsg(
              `[${targetEquip}] Paso ${i + 1}/${sequence.length} (${stepNames[i]}) emitido. Esperando 3s antes del paso ${i + 2}...`
            );
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        }

        setExecutingSequence(null);
        setNowMs(Date.now());
        setStatusType('success');
        setStatusMsg(
          `¡Secuencia "${cmdObj?.name || 'IR'}" completada! "${targetEquip}" marcado como ${
            targetPower === 'on' ? 'SECUENCIA ACTIVA (ON)' : 'APAGADO (OFF)'
          }.`
        );
      } catch (e) {
        setExecutingSequence(null);
        await fetch('/api/iot/mqtt_publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'set_executing_sequence', executingSequence: null }),
        }).catch(() => {});
        setStatusType('error');
        setStatusMsg("Error al ejecutar la secuencia IR.");
      }
      setTimeout(() => setStatusMsg(""), 4500);
      setIsSendingMacro(false);
      return;
    }

    // Comando individual
    const targetEquip = cmdMeta?.equipment || 'Climatizador';
    const prevPower = equipmentStates[targetEquip]?.powerState;
    const resolvedPower: 'on' | 'off' =
      cmdMeta?.powerEffect === 'toggle'
        ? prevPower === 'on'
          ? 'off'
          : 'on'
        : cmdMeta?.powerEffect === 'off'
        ? 'off'
        : 'on';

    setStatusType('warning');
    setStatusMsg(`Emitiendo "${cmdObj?.name || 'IR'}" hacia ${targetEquip} en el cultivo...`);
    try {
      const res = await fetch('/api/iot/mqtt_publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: 'cultivo/broadlink/command',
          message: JSON.stringify({ code: hex_code, name: cmdObj?.name }),
          stateUpdate: cmdObj
            ? {
                equipment: targetEquip,
                powerState: resolvedPower,
                activeCommandId: cmdObj.id,
                activeCommandName: cmdObj.name,
                isSequence: false,
                steps: undefined,
                source: 'manual',
              }
            : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.equipmentStates) setEquipmentStates(data.equipmentStates);
        setNowMs(Date.now());
        setStatusType('success');
        setStatusMsg(
          `RM4 Mini: ${data.statusMessage || 'Código IR enviado.'} (${targetEquip} → ${
            resolvedPower === 'on' ? 'ENCENDIDO' : 'APAGADO'
          })`
        );
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
    const metaJson = serializeCommandMeta({
      equipment: macroEquipment || 'Climatizador',
      order: macroCommands.length + 1,
      ip: rm4Status.rm4Ip || '192.168.100.7',
      powerEffect: macroPowerEffect,
    });
    const { data, error } = await supabase
      .from('broadlink_commands')
      .insert([
        {
          name: macroName,
          hex_code: hex_code,
          device_ip: metaJson,
        },
      ])
      .select();
    if (!error) {
      if (data && data[0]) {
        setCommands(prev => {
          const exists = prev.some(c => c.id === data[0].id);
          return exists ? prev : [...prev, data[0]];
        });
      }
      setMacroSequence([]);
      setMacroName("");
      setStatusType('success');
      setStatusMsg(`Secuencia guardada y vinculada al equipo "${macroEquipment}".`);
      setTimeout(() => setStatusMsg(""), 3000);
    }
  };

  const updateName = async (id: string, newName: string) => {
    const { error } = await supabase
      .from('broadlink_commands')
      .update({ name: newName })
      .eq('id', id);
    if (!error) {
      setCommands(prev => prev.map(cmd => (cmd.id === id ? { ...cmd, name: newName } : cmd)));
    }
  };

  const updateCommandMetaField = async (
    cmd: any,
    patch: Partial<CommandMeta>,
    customMsg?: string
  ) => {
    const currentMeta = parseCommandMeta(cmd);
    const updatedMeta: CommandMeta = { ...currentMeta, ...patch };
    const newDeviceIp = serializeCommandMeta(updatedMeta);

    setCommands(prev =>
      prev.map(c => (c.id === cmd.id ? { ...c, device_ip: newDeviceIp } : c))
    );
    await supabase
      .from('broadlink_commands')
      .update({ device_ip: newDeviceIp })
      .eq('id', cmd.id);

    if (customMsg) {
      setStatusType('success');
      setStatusMsg(customMsg);
      setTimeout(() => setStatusMsg(""), 2500);
    }
  };

  const changeCommandEquipment = async (cmd: any, newEquipment: string) => {
    const currentMeta = parseCommandMeta(cmd);
    const targetList = groupedByEquipment[newEquipment] || [];
    const nextOrder = targetList.length + 1;
    await updateCommandMetaField(
      cmd,
      { equipment: newEquipment, order: nextOrder },
      `Comando "${cmd.name}" movido al equipo "${newEquipment}" (Orden #${nextOrder}).`
    );
  };

  const moveCommandOrder = async (equipment: string, indexInGroup: number, direction: 'up' | 'down') => {
    const group = groupedByEquipment[equipment];
    if (!group || group.length < 2) return;

    const targetIndex = direction === 'up' ? indexInGroup - 1 : indexInGroup + 1;
    if (targetIndex < 0 || targetIndex >= group.length) return;

    const reordered = [...group];
    const [moved] = reordered.splice(indexInGroup, 1);
    reordered.splice(targetIndex, 0, moved);

    const updates = reordered.map((item, idx) => {
      const updatedIp = serializeCommandMeta({
        equipment,
        order: idx + 1,
        ip: item.meta.ip,
        powerEffect: item.meta.powerEffect,
      });
      return { id: item.cmd.id, device_ip: updatedIp };
    });

    setCommands(prev =>
      prev.map(c => {
        const found = updates.find(u => u.id === c.id);
        return found ? { ...c, device_ip: found.device_ip } : c;
      })
    );

    await Promise.all(
      updates.map(u =>
        supabase.from('broadlink_commands').update({ device_ip: u.device_ip }).eq('id', u.id)
      )
    );
  };

  const deleteCommand = async (id: string) => {
    setCommands(prev => prev.filter(cmd => cmd.id !== id));
    await supabase.from('broadlink_commands').delete().eq('id', id);
  };

  const displayedEquipmentKeys = useMemo(() => {
    if (activeFilterEquipment === 'ALL') return equipmentKeysWithCommands;
    return equipmentKeysWithCommands.filter(k => k === activeFilterEquipment);
  }, [equipmentKeysWithCommands, activeFilterEquipment]);

  return (
    <div className="bg-neutral-900 rounded-xl border border-neutral-800 shadow-lg p-6 mt-8">
      {/* CABECERA */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
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
            Organiza tus controles remotos por equipo, visualiza en vivo qué secuencia está activa y emite señales IR a distancia.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={verifyRm4Connection}
            disabled={verifying || learning}
            className="px-3.5 py-2 rounded-lg font-medium text-sm bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-gray-200 transition-colors flex items-center gap-2 disabled:opacity-50"
            title="Re-autentica la sesión del RM4 Mini a distancia y verifica que esté respondiendo en la red del cultivo"
          >
            <RefreshCw className={`w-4 h-4 ${verifying ? 'animate-spin text-blue-400' : 'text-gray-400'}`} />
            {verifying ? 'Verificando...' : 'Verificar / Reconectar RM4'}
          </button>
        </div>
      </div>

      {/* MONITOR EN VIVO DE ESTADO POR EQUIPO Y SECUENCIAS ACTIVAS */}
      {monitorEquipments.length > 0 && (
        <div className="mb-6 bg-neutral-950/70 border border-neutral-800 rounded-xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Estado Actual por Equipo y Secuencias Activas (Gemelo Digital 24/7)
            </div>
            <span className="text-[11px] text-neutral-500">
              Sincronizado con acciones manuales y reglas automáticas de Contabo
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {monitorEquipments.map(eq => {
              const eqState = equipmentStates[eq];
              const isExecutingThis = executingSequence?.equipment === eq;
              const isOn = eqState?.powerState === 'on';
              const isSequenceActive = Boolean(isOn && eqState?.isSequence);

              return (
                <div
                  key={eq}
                  className={`rounded-xl p-4 border transition-all flex flex-col justify-between ${
                    isExecutingThis
                      ? 'bg-amber-950/20 border-amber-500/60 shadow-lg shadow-amber-950/20'
                      : isOn
                      ? 'bg-emerald-950/20 border-emerald-600/60 shadow-lg shadow-emerald-950/20'
                      : 'bg-neutral-900/90 border-neutral-800'
                  }`}
                >
                  <div>
                    {/* Cabecera tarjeta equipo + badge estado */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                            isExecutingThis
                              ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                              : isOn
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                              : 'bg-neutral-800 border-neutral-700 text-neutral-400'
                          }`}
                        >
                          <Cpu className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-white text-sm">{eq}</span>
                      </div>

                      {isExecutingThis ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          EJECUTANDO ({executingSequence.currentStep}/{executingSequence.totalSteps})
                        </span>
                      ) : isSequenceActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          SECUENCIA ACTIVA
                        </span>
                      ) : isOn ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          ENCENDIDO
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-neutral-800 text-neutral-400 border border-neutral-700">
                          <span className="w-2 h-2 rounded-full bg-neutral-500" />
                          APAGADO / REPOSO
                        </span>
                      )}
                    </div>

                    {/* Progreso si está ejecutando secuencia */}
                    {isExecutingThis && executingSequence && (
                      <div className="mb-3 bg-amber-950/40 border border-amber-800/50 rounded-lg p-2.5">
                        <div className="flex justify-between text-xs text-amber-200 font-medium mb-1.5">
                          <span className="truncate">{executingSequence.commandName}</span>
                          <span className="font-mono shrink-0 ml-2">
                            Paso {executingSequence.currentStep}/{executingSequence.totalSteps}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden mb-1">
                          <div
                            className="h-full bg-amber-400 transition-all duration-300"
                            style={{
                              width: `${Math.round(
                                (executingSequence.currentStep / executingSequence.totalSteps) * 100
                              )}%`,
                            }}
                          />
                        </div>
                        <div className="text-[11px] text-amber-300/90 truncate">
                          Emitiendo: {executingSequence.currentStepName || `Paso ${executingSequence.currentStep}`}
                        </div>
                      </div>
                    )}

                    {/* Detalle de secuencia/comando actual */}
                    {eqState ? (
                      <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-lg p-2.5 space-y-1.5">
                        <div className="text-[11px] text-neutral-400 flex items-center justify-between">
                          <span>
                            {eqState.powerState === 'off'
                              ? 'Última orden:'
                              : eqState.isSequence
                              ? 'Secuencia aplicada:'
                              : 'Comando activo:'}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                            {eqState.source === 'automation' ? (
                              <>
                                <Bot className="w-3 h-3 text-purple-400" />
                                {eqState.ruleName ? `Regla: ${eqState.ruleName}` : 'Automático'}
                              </>
                            ) : eqState.source === 'manual_sync' ? (
                              <>
                                <RefreshCw className="w-3 h-3 text-blue-400" />
                                Sync Manual
                              </>
                            ) : (
                              <>
                                <User className="w-3 h-3 text-emerald-400" />
                                Manual Web
                              </>
                            )}
                          </span>
                        </div>

                        <div
                          className={`text-sm font-semibold truncate ${
                            isOn ? 'text-emerald-300' : 'text-neutral-300'
                          }`}
                          title={eqState.activeCommandName || ''}
                        >
                          {eqState.activeCommandName || (isOn ? 'Encendido' : 'Apagado')}
                        </div>

                        {isOn && eqState.steps && eqState.steps.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 pt-1">
                            {eqState.steps.map((sName, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/70 border border-emerald-800/50 text-emerald-300"
                              >
                                {idx + 1}. {sName}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="text-[11px] text-neutral-500 flex items-center gap-1 pt-0.5">
                          <Clock className="w-3 h-3" />
                          <span>
                            {isOn ? 'Activa desde ' : 'Actualizado '}
                            {formatRelativeTimeAr(eqState.updatedAt, nowMs)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-neutral-950/40 border border-neutral-800/60 rounded-lg p-3 text-xs text-neutral-500">
                        Sin estado registrado aún. Al emitir un comando o secuencia, o al dispararse una regla automática, aparecerá aquí.
                      </div>
                    )}
                  </div>

                  {/* Corrección manual de estado (sin emitir IR) */}
                  <div className="mt-3 pt-2.5 border-t border-neutral-800/80 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-neutral-500">Corregir sin emitir IR:</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={syncingEquipment === eq}
                        onClick={() => syncEquipmentStateManually(eq, 'on')}
                        className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors flex items-center gap-1 ${
                          isOn
                            ? 'bg-emerald-600/30 border-emerald-500/60 text-emerald-200'
                            : 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-300'
                        }`}
                        title="Marcar equipo como encendido sin enviar señal infrarroja"
                      >
                        <Power className="w-3 h-3" /> Marcar ON
                      </button>
                      <button
                        type="button"
                        disabled={syncingEquipment === eq}
                        onClick={() => syncEquipmentStateManually(eq, 'off')}
                        className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors flex items-center gap-1 ${
                          !isOn && eqState
                            ? 'bg-red-950/60 border-red-700/60 text-red-200'
                            : 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-300'
                        }`}
                        title="Marcar equipo como apagado sin enviar señal infrarroja"
                      >
                        Marcar OFF
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* BARRA DE APRENDIZAJE ASIGNADO POR EQUIPO */}
      <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-4 mb-6">
        <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Radio className="w-3.5 h-3.5 text-blue-400" />
          Grabar Nuevo Comando Infrarrojo Asignado a un Equipo
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          {/* Selector de Equipo Destino */}
          <div className="md:col-span-4">
            <label className="text-xs text-neutral-400 block mb-1">1. Equipo del Control Remoto</label>
            {!isAddingEquipment ? (
              <div className="flex gap-2">
                <select
                  value={selectedEquipment}
                  onChange={e => setSelectedEquipment(e.target.value)}
                  className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm flex-1 focus:border-blue-500 focus:outline-none"
                >
                  {allEquipments.map(eq => (
                    <option key={eq} value={eq}>
                      {eq}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setIsAddingEquipment(true)}
                  className="px-2.5 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-blue-400 rounded-lg text-xs font-medium flex items-center gap-1 shrink-0"
                  title="Crear nuevo equipo"
                >
                  <FolderPlus className="w-4 h-4" />
                  + Equipo
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ej. Aire Carpa Flora..."
                  value={newEquipmentInput}
                  onChange={e => setNewEquipmentInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddEquipment()}
                  className="bg-neutral-900 border border-blue-500 rounded-lg px-3 py-2 text-white text-sm flex-1 focus:outline-none"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleAddEquipment}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium"
                >
                  Crear
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingEquipment(false);
                    setNewEquipmentInput('');
                  }}
                  className="px-2.5 py-2 bg-neutral-800 text-neutral-400 rounded-lg text-xs"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Nombre del botón a grabar */}
          <div className="md:col-span-5">
            <label className="text-xs text-neutral-400 block mb-1">
              2. Nombre del Comando (opcional antes o después de grabar)
            </label>
            <input
              type="text"
              placeholder={`Ej. Modo Frío 24°C, Subir Temp, Oscilación...`}
              value={pendingCommandName}
              onChange={e => setPendingCommandName(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Botón Aprender */}
          <div className="md:col-span-3">
            <button
              onClick={() => startLearningForEquipment()}
              disabled={learning || verifying}
              className={`w-full px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 ${
                learning
                  ? 'bg-amber-600 text-white animate-pulse'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-950/50'
              }`}
            >
              <Radio className="w-4 h-4" />
              {learning
                ? `Escuchando (${learnSecondsLeft}s)...`
                : `Aprender en ${selectedEquipment}`}
            </button>
          </div>
        </div>
      </div>

      {/* BANNER DE ESTADO EN VIVO */}
      {statusMsg && (
        <div
          className={`mb-6 p-3.5 rounded-lg border text-sm flex items-center gap-2.5 ${
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

      {/* PESTAÑAS DE FILTRO POR EQUIPO */}
      {equipmentKeysWithCommands.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-neutral-800 pb-3">
          <span className="text-xs text-neutral-500 uppercase tracking-wider font-semibold mr-1 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" /> Equipos:
          </span>
          <button
            onClick={() => setActiveFilterEquipment('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeFilterEquipment === 'ALL'
                ? 'bg-blue-600 text-white'
                : 'bg-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            Todos ({singleCommands.length})
          </button>
          {equipmentKeysWithCommands.map(eq => (
            <button
              key={eq}
              onClick={() => setActiveFilterEquipment(eq)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeFilterEquipment === eq
                  ? 'bg-blue-600 text-white'
                  : 'bg-neutral-800 text-neutral-300 hover:text-white'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-blue-400" />
              {eq}
              <span className="bg-neutral-900/80 px-1.5 py-0.5 rounded text-[11px] text-neutral-300">
                {groupedByEquipment[eq]?.length || 0}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* LISTADO AGRUPADO POR EQUIPO Y ORDENADO */}
      <div className="space-y-8">
        {displayedEquipmentKeys.map(equipment => {
          const groupItems = groupedByEquipment[equipment] || [];
          return (
            <div
              key={equipment}
              className="bg-neutral-950/50 rounded-xl border border-neutral-800/90 overflow-hidden"
            >
              {/* Cabecera del Equipo */}
              <div className="bg-neutral-800/50 px-5 py-3.5 border-b border-neutral-800 flex flex-wrap justify-between items-center gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      {equipment}
                      <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-neutral-800 border border-neutral-700 text-neutral-300">
                        {groupItems.length} {groupItems.length === 1 ? 'comando' : 'comandos'}
                      </span>
                    </h3>
                  </div>
                </div>

                <button
                  onClick={() => startLearningForEquipment(equipment)}
                  disabled={learning || verifying}
                  className="text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Aprender otro comando en {equipment}
                </button>
              </div>

              {/* Grilla ordenada de comandos del equipo */}
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupItems.map(({ cmd, meta }, idx) => {
                  const isActiveCmd =
                    equipmentStates[equipment]?.activeCommandId === cmd.id &&
                    equipmentStates[equipment]?.powerState === 'on';

                  return (
                    <div
                      key={cmd.id}
                      className={`p-4 rounded-xl border transition-colors flex flex-col justify-between ${
                        isActiveCmd
                          ? 'bg-emerald-950/20 border-emerald-600/60'
                          : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      <div>
                        {/* Barra superior de la tarjeta: Orden # + Flechas + Selector de Equipo */}
                        <div className="flex justify-between items-center gap-2 mb-3">
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded bg-blue-950/80 border border-blue-700/50 text-blue-300 text-xs font-bold font-mono">
                              #{idx + 1}
                            </span>
                            <div className="flex items-center bg-neutral-800 rounded border border-neutral-700">
                              <button
                                type="button"
                                onClick={() => moveCommandOrder(equipment, idx, 'up')}
                                disabled={idx === 0}
                                className="p-1 text-neutral-400 hover:text-white disabled:opacity-30 transition-colors"
                                title="Subir posición en este equipo"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveCommandOrder(equipment, idx, 'down')}
                                disabled={idx === groupItems.length - 1}
                                className="p-1 text-neutral-400 hover:text-white disabled:opacity-30 transition-colors border-l border-neutral-700"
                                title="Bajar posición en este equipo"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <select
                              value={meta.powerEffect}
                              onChange={e =>
                                updateCommandMetaField(cmd, {
                                  powerEffect: e.target.value as PowerEffect,
                                })
                              }
                              className="bg-neutral-800 border border-neutral-700 text-neutral-300 rounded px-1.5 py-0.5 text-[10px] focus:outline-none focus:border-blue-500"
                              title="Efecto del botón sobre el estado del equipo"
                            >
                              <option value="on">🟢 Activa</option>
                              <option value="off">🔴 Apaga</option>
                              <option value="toggle">🔁 On/Off</option>
                            </select>

                            <select
                              value={equipment}
                              onChange={e => changeCommandEquipment(cmd, e.target.value)}
                              className="bg-neutral-800 border border-neutral-700 text-neutral-300 rounded px-2 py-0.5 text-[11px] focus:outline-none focus:border-blue-500"
                              title="Cambiar equipo asignado"
                            >
                              {allEquipments.map(eq => (
                                <option key={eq} value={eq}>
                                  {eq}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Nombre editable del comando */}
                        <input
                          type="text"
                          value={cmd.name}
                          onChange={e => {
                            const val = e.target.value;
                            setCommands(prev =>
                              prev.map(c => (c.id === cmd.id ? { ...c, name: val } : c))
                            );
                          }}
                          onBlur={e => updateName(cmd.id, e.target.value)}
                          className="bg-transparent border-b border-neutral-700 text-white w-full focus:outline-none focus:border-blue-500 pb-1 font-medium text-sm"
                        />
                        <p
                          className="text-[11px] text-gray-500 mt-2 truncate font-mono"
                          title={cmd.hex_code}
                        >
                          IR: {cmd.hex_code.substring(0, 18)}...
                        </p>
                      </div>

                      <div className="flex justify-between items-center mt-4 pt-2 border-t border-neutral-800/80">
                        <button
                          onClick={() => addToMacroSequence(cmd)}
                          className="text-xs text-blue-400 hover:text-blue-300 font-medium border border-blue-500/30 px-2.5 py-1 rounded-md transition-colors"
                        >
                          + a Secuencia
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => sendCommand(cmd)}
                            disabled={isSendingMacro}
                            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
                            title="Emitir señal infrarroja ahora"
                          >
                            <span>▶</span> Emitir
                          </button>
                          <button
                            onClick={() => deleteCommand(cmd.id)}
                            className="text-neutral-500 hover:text-red-400 p-1.5 transition-colors"
                            title="Eliminar comando"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {singleCommands.length === 0 && !learning && (
          <div className="text-center py-10 bg-neutral-950/40 rounded-xl border border-neutral-800 text-gray-500">
            No hay comandos individuales guardados aún. Seleccioná un equipo arriba y presioná &quot;Aprender&quot;.
          </div>
        )}
      </div>

      {/* CREADOR DE SECUENCIAS (MACROS) */}
      {macroSequence.length > 0 && (
        <div className="mt-8 bg-neutral-800 p-6 rounded-xl border border-blue-500 shadow-lg">
          <h3 className="text-xl font-bold mb-4 text-blue-400 flex items-center gap-2">
            <ListOrdered className="w-5 h-5" />
            Creador de Secuencia
          </h3>
          <div className="flex flex-wrap gap-2 mb-5">
            {macroSequence.map((hex, i) => {
              const matched = singleCommands.find(c => c.hex_code === hex);
              const meta = matched ? parseCommandMeta(matched) : null;
              const cmdLabel = matched ? `[${meta?.equipment}] ${matched.name}` : "Comando";
              return (
                <span
                  key={i}
                  className="bg-blue-600 px-3 py-1 rounded text-sm text-white flex items-center gap-2"
                >
                  {i + 1}. {cmdLabel}
                  <button
                    onClick={() =>
                      setMacroSequence(macroSequence.filter((_, index) => index !== i))
                    }
                    className="text-white hover:text-red-300 font-bold ml-1"
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-4">
            <div className="md:col-span-4">
              <label className="text-xs text-neutral-300 block mb-1">Equipo que controla</label>
              <select
                value={macroEquipment}
                onChange={e => setMacroEquipment(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
              >
                {allEquipments.map(eq => (
                  <option key={eq} value={eq}>
                    {eq}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-4">
              <label className="text-xs text-neutral-300 block mb-1">Efecto sobre el equipo</label>
              <select
                value={macroPowerEffect}
                onChange={e => setMacroPowerEffect(e.target.value as 'on' | 'off')}
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="on">🟢 Deja el equipo ENCENDIDO / Activo</option>
                <option value="off">🔴 Deja el equipo APAGADO</option>
              </select>
            </div>

            <div className="md:col-span-4">
              <label className="text-xs text-neutral-300 block mb-1">Nombre de la secuencia</label>
              <input
                type="text"
                placeholder="Ej. Climatizador Modo Frío Nivel 2"
                value={macroName}
                onChange={e => setMacroName(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={saveMacro}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded font-medium transition-colors"
            >
              Guardar Secuencia
            </button>
            <button
              onClick={() => {
                setMacroSequence([]);
                setMacroName("");
              }}
              className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded font-medium transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* SECUENCIAS GUARDADAS */}
      {macroCommands.length > 0 && (
        <div className="mt-12">
          <h3 className="text-2xl font-bold text-foreground mb-6 border-b border-neutral-800 pb-2 flex items-center gap-2">
            <ListOrdered className="w-6 h-6 text-blue-400" />
            Secuencias Guardadas y Estado de Activación
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {macroCommands.map((macro, idx) => {
              let parsedSequence: string[] = [];
              try {
                parsedSequence = JSON.parse(macro.hex_code.replace('MACRO:', ''));
              } catch (e) {}

              const macroMeta = parseCommandMeta(macro, idx);
              const eqState = equipmentStates[macroMeta.equipment];
              const isMacroActive =
                eqState?.activeCommandId === macro.id && eqState?.powerState === 'on';
              const isMacroExecuting = executingSequence?.commandId === macro.id;

              const resolvedSteps = parsedSequence.map((hex, stepIdx) => {
                const match = singleCommands.find(c => c.hex_code === hex);
                return match ? match.name : `Paso ${stepIdx + 1}`;
              });

              return (
                <div
                  key={macro.id}
                  className={`p-5 rounded-xl border flex flex-col justify-between relative overflow-hidden transition-all ${
                    isMacroExecuting
                      ? 'bg-amber-950/20 border-amber-500 shadow-lg shadow-amber-950/25'
                      : isMacroActive
                      ? 'bg-emerald-950/25 border-emerald-500 shadow-lg shadow-emerald-950/25'
                      : 'bg-neutral-800/80 border-blue-900/50'
                  }`}
                >
                  <div>
                    {/* Estado superior + selector equipo y efecto */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        {isMacroExecuting ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            EJECUTANDO PASO {executingSequence?.currentStep}/{executingSequence?.totalSteps}
                          </span>
                        ) : isMacroActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/50">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            SECUENCIA ACTIVA EN {macroMeta.equipment.toUpperCase()}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-neutral-900 text-neutral-400 border border-neutral-700">
                            En espera
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <select
                          value={macroMeta.powerEffect === 'off' ? 'off' : 'on'}
                          onChange={e =>
                            updateCommandMetaField(
                              macro,
                              { powerEffect: e.target.value as 'on' | 'off' },
                              `Efecto de "${macro.name}" actualizado.`
                            )
                          }
                          className="bg-neutral-900 border border-neutral-700 text-neutral-300 rounded px-2 py-0.5 text-[11px] focus:outline-none focus:border-blue-500"
                          title="Estado en el que deja al equipo esta secuencia"
                        >
                          <option value="on">🟢 Activa Equipo</option>
                          <option value="off">🔴 Apaga Equipo</option>
                        </select>

                        <select
                          value={macroMeta.equipment}
                          onChange={e =>
                            updateCommandMetaField(
                              macro,
                              { equipment: e.target.value },
                              `Secuencia "${macro.name}" asignada a "${e.target.value}".`
                            )
                          }
                          className="bg-neutral-900 border border-neutral-700 text-blue-300 rounded px-2 py-0.5 text-[11px] focus:outline-none focus:border-blue-500"
                          title="Equipo controlado por esta secuencia"
                        >
                          {allEquipments.map(eq => (
                            <option key={eq} value={eq}>
                              {eq}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Nombre editable de la secuencia */}
                    <input
                      type="text"
                      value={macro.name}
                      onChange={e => {
                        const val = e.target.value;
                        setCommands(prev =>
                          prev.map(c => (c.id === macro.id ? { ...c, name: val } : c))
                        );
                      }}
                      onBlur={e => updateName(macro.id, e.target.value)}
                      className="bg-transparent border-b border-neutral-600 text-white w-full focus:outline-none focus:border-blue-500 pb-1 font-bold text-lg"
                    />

                    {/* Desglose de pasos reales en orden */}
                    <div className="mt-3">
                      <p className="text-xs text-blue-400 font-medium mb-2">
                        {parsedSequence.length} comandos encadenados (espera de 3s entre pasos):
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {resolvedSteps.map((stepName, sIdx) => {
                          const isCurrentStep =
                            isMacroExecuting && executingSequence?.currentStep === sIdx + 1;
                          const isCompletedStep =
                            isMacroExecuting &&
                            (executingSequence?.currentStep || 0) > sIdx + 1;

                          return (
                            <React.Fragment key={sIdx}>
                              <span
                                className={`text-xs px-2.5 py-1 rounded-md border font-medium transition-all ${
                                  isCurrentStep
                                    ? 'bg-amber-500 text-black border-amber-300 font-bold animate-pulse'
                                    : isCompletedStep
                                    ? 'bg-emerald-600/30 text-emerald-200 border-emerald-500/50'
                                    : isMacroActive
                                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60'
                                    : 'bg-neutral-900 text-neutral-300 border-neutral-700'
                                }`}
                              >
                                {sIdx + 1}. {stepName}
                              </span>
                              {sIdx < resolvedSteps.length - 1 && (
                                <span className="text-neutral-500 text-xs">→</span>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>

                    {/* Hora de activación si está activa */}
                    {isMacroActive && eqState && (
                      <div className="mt-3 text-xs text-emerald-300/90 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          Activa desde {formatRelativeTimeAr(eqState.updatedAt, nowMs)} •{' '}
                          {eqState.source === 'automation'
                            ? `Disparada por regla "${eqState.ruleName || 'Clima'}"`
                            : 'Ejecutada manualmente'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center mt-4 pt-3 border-t border-neutral-700/60">
                    <button
                      onClick={() => sendCommand(macro)}
                      disabled={isSendingMacro}
                      className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 disabled:opacity-50 ${
                        isMacroActive
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          : 'bg-blue-600 hover:bg-blue-500 text-white'
                      }`}
                    >
                      {isMacroExecuting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Ejecutando ({executingSequence?.currentStep}/{executingSequence?.totalSteps})
                        </>
                      ) : (
                        <>
                          <span>▶</span>
                          {isMacroActive ? 'Re-aplicar Secuencia' : 'Ejecutar Secuencia'}
                        </>
                      )}
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
