import { NextResponse } from 'next/server';
import mqtt from 'mqtt';
import { exec } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const MQTT_BROKER = process.env.MQTT_BROKER_URL || 'mqtt://127.0.0.1:1883';
const STATUS_CACHE_FILE = process.platform === 'win32'
  ? path.join(os.tmpdir(), 'broadlink_rm4_status.json')
  : '/tmp/broadlink_rm4_status.json';
const EQUIPMENT_STATE_FILE = process.platform === 'win32'
  ? path.join(os.tmpdir(), 'broadlink_equipment_state.json')
  : '/tmp/broadlink_equipment_state.json';

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

interface EquipmentStateStore {
  equipmentStates: Record<string, EquipmentRuntimeState>;
  executingSequence: ExecutingSequenceState | null;
}

function readEquipmentStateFile(): EquipmentStateStore {
  try {
    if (fs.existsSync(EQUIPMENT_STATE_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(EQUIPMENT_STATE_FILE, 'utf8'));
      return {
        equipmentStates: parsed.equipmentStates && typeof parsed.equipmentStates === 'object' ? parsed.equipmentStates : {},
        executingSequence: parsed.executingSequence || null,
      };
    }
  } catch (e) {}
  return { equipmentStates: {}, executingSequence: null };
}

function writeEquipmentStateFile(store: EquipmentStateStore): void {
  try {
    fs.writeFileSync(EQUIPMENT_STATE_FILE, JSON.stringify(store, null, 2), 'utf8');
  } catch (e) {}
}

function applyEquipmentStateUpdate(update: Partial<EquipmentRuntimeState> & { equipment: string }, clearExecuting = false): EquipmentStateStore {
  const store = readEquipmentStateFile();
  const prev = store.equipmentStates[update.equipment];
  store.equipmentStates[update.equipment] = {
    equipment: update.equipment,
    powerState: update.powerState === 'off' ? 'off' : 'on',
    activeCommandId: update.activeCommandId !== undefined ? update.activeCommandId : (prev?.activeCommandId ?? null),
    activeCommandName: update.activeCommandName !== undefined ? update.activeCommandName : (prev?.activeCommandName ?? null),
    isSequence: update.isSequence !== undefined ? Boolean(update.isSequence) : Boolean(prev?.isSequence),
    steps: update.steps !== undefined ? update.steps : prev?.steps,
    source: update.source || 'manual',
    ruleName: update.ruleName !== undefined ? update.ruleName : null,
    updatedAt: new Date().toISOString(),
  };
  if (clearExecuting) {
    store.executingSequence = null;
  }
  writeEquipmentStateFile(store);
  return store;
}

function saveStatusCache(data: any) {
  try {
    const existing = readStatusCache();
    const merged = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(STATUS_CACHE_FILE, JSON.stringify(merged, null, 2), 'utf8');
  } catch (e) {
    // ignore fs error on non-linux local dev
  }
}

function readStatusCache(): any {
  try {
    if (fs.existsSync(STATUS_CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(STATUS_CACHE_FILE, 'utf8'));
    }
  } catch (e) {}
  return null;
}

function resetBroadlinkBridgeSocket(): Promise<string> {
  return new Promise((resolve) => {
    const cmd = `
      LINE=$(grep -h "New client connected" /var/log/mosquitto/mosquitto.log.1 /var/log/mosquitto/mosquitto.log 2>/dev/null | grep -i "broadlink-bridge" | tail -n 1)
      if [ -n "$LINE" ]; then
        ADDR=$(echo "$LINE" | sed -n 's/.*from \\([0-9.]*:[0-9]*\\) as.*/\\1/p')
        IP=$(echo "$ADDR" | cut -d: -f1)
        PORT=$(echo "$ADDR" | cut -d: -f2)
        if [ -n "$IP" ] && [ -n "$PORT" ]; then
          ACTIVE=$(ss -tn state established "( sport = :1883 and dst = $IP and dport = :$PORT )" | tail -n +2)
          if [ -n "$ACTIVE" ]; then
            ss -K dst "$IP" dport = "$PORT"
            echo "surgical:$IP:$PORT"
            exit 0
          fi
        fi
      fi
      ss -K state established '( sport = :1883 and dst != 127.0.0.1 )'
      echo "broadcast_reset"
    `;
    exec(cmd, (err, stdout) => {
      resolve((stdout || '').trim() || (err ? err.message : 'done'));
    });
  });
}

function extractIp(msg: string): string | null {
  const m = msg.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
  return m ? m[1] : null;
}

export async function GET() {
  const cached = readStatusCache();
  const stateStore = readEquipmentStateFile();
  return NextResponse.json({
    success: true,
    status: cached || {
      online: true,
      rm4Ip: '192.168.100.7',
      lastMessage: 'Conectado al RM4 en 192.168.100.7',
      updatedAt: new Date().toISOString(),
    },
    equipmentStates: stateStore.equipmentStates,
    executingSequence: stateStore.executingSequence,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { topic, message, action } = body;

    // 1. Acción dedicada: Verificar / Reconectar RM4 a distancia
    if (action === 'verify_rm4') {
      return new Promise<Response>((resolve) => {
        const client = mqtt.connect(MQTT_BROKER, {
          clientId: `nextjs-rm4-verify-${Math.random().toString(16).slice(2, 8)}`,
          connectTimeout: 5000,
        });

        let latestMsg = '';
        let rm4Ip: string | null = null;
        let resolved = false;

        const finish = (online: boolean, msg: string) => {
          if (resolved) return;
          resolved = true;
          clearTimeout(timer);
          client.end();
          const finalIp = rm4Ip || extractIp(msg) || readStatusCache()?.rm4Ip || null;
          saveStatusCache({ online, rm4Ip: finalIp, lastMessage: msg });
          resolve(
            NextResponse.json({
              success: true,
              online,
              rm4Ip: finalIp,
              statusMessage: msg,
              timestamp: new Date().toISOString(),
            })
          );
        };

        const timer = setTimeout(() => {
          if (latestMsg) {
            const isOk = !latestMsg.toLowerCase().includes('error');
            finish(isOk, latestMsg);
          } else {
            finish(false, 'El puente Raspberry Pi no respondió al re-descubrimiento (verificar conexión en el cultivo).');
          }
        }, 5500);

        client.on('connect', () => {
          client.subscribe('cultivo/broadlink/status', async () => {
            await resetBroadlinkBridgeSocket();
          });
        });

        client.on('message', (t, payloadBuf) => {
          if (t !== 'cultivo/broadlink/status') return;
          try {
            const parsed = JSON.parse(payloadBuf.toString());
            const msg: string = parsed.message || payloadBuf.toString();
            latestMsg = msg;
            const ip = extractIp(msg);
            if (ip) rm4Ip = ip;

            if (msg.includes('Conectado al RM4') || msg.includes('Conectado exitosamente al RM4')) {
              finish(true, msg);
            } else if (msg.includes('No se encontró ningún Broadlink') || msg.includes('Esperando detección')) {
              finish(false, msg);
            }
          } catch (e) {}
        });

        client.on('error', () => {
          finish(false, 'Error de conexión con el broker MQTT.');
        });
      });
    }

    // 1b. Sincronizar estado de un equipo (Manual / Fin de secuencia) sin emitir IR
    if (action === 'sync_equipment_state') {
      const { equipment, powerState, activeCommandId, activeCommandName, isSequence, steps, source, ruleName, clearExecuting } = body;
      if (!equipment) {
        return NextResponse.json({ error: 'equipment is required' }, { status: 400 });
      }
      const store = applyEquipmentStateUpdate(
        {
          equipment,
          powerState: powerState === 'off' ? 'off' : 'on',
          activeCommandId: activeCommandId ?? null,
          activeCommandName: activeCommandName ?? null,
          isSequence: Boolean(isSequence),
          steps: Array.isArray(steps) ? steps : undefined,
          source: source || 'manual_sync',
          ruleName: ruleName ?? null,
        },
        Boolean(clearExecuting)
      );
      return NextResponse.json({
        success: true,
        equipmentStates: store.equipmentStates,
        executingSequence: store.executingSequence,
      });
    }

    // 1c. Registrar o limpiar secuencia en ejecución en vivo
    if (action === 'set_executing_sequence') {
      const store = readEquipmentStateFile();
      store.executingSequence = body.executingSequence || null;
      writeEquipmentStateFile(store);
      return NextResponse.json({
        success: true,
        executingSequence: store.executingSequence,
      });
    }

    if (!topic || message === undefined) {
      return NextResponse.json({ error: 'Topic and message are required' }, { status: 400 });
    }

    // 2. Modo Aprendizaje IR con Verificación en Vivo + Auto-Curación Remota
    if (topic === 'cultivo/broadlink/learn') {
      return new Promise<Response>((resolve) => {
        const client = mqtt.connect(MQTT_BROKER, {
          clientId: `nextjs-rm4-learn-${Math.random().toString(16).slice(2, 8)}`,
          connectTimeout: 5000,
        });

        let resolved = false;
        let autoHealing = false;
        let rm4Ip: string | null = readStatusCache()?.rm4Ip || null;

        const finish = (learningActive: boolean, msg: string, autoHealed = false) => {
          if (resolved) return;
          resolved = true;
          clearTimeout(overallTimer);
          client.end();
          saveStatusCache({
            online: learningActive,
            rm4Ip,
            lastMessage: msg,
          });
          resolve(
            NextResponse.json({
              success: learningActive,
              learningActive,
              autoHealed,
              rm4Ip,
              statusMessage: msg,
              timestamp: new Date().toISOString(),
            })
          );
        };

        const overallTimer = setTimeout(() => {
          finish(
            false,
            'El puente en el cultivo no confirmó el modo escucha. Presione "Verificar / Reconectar RM4" para comprobar la conexión.'
          );
        }, 8500);

        const triggerAutoHeal = async () => {
          if (autoHealing) return;
          autoHealing = true;
          await resetBroadlinkBridgeSocket();
        };

        client.on('connect', () => {
          client.subscribe('cultivo/broadlink/status', () => {
            client.publish(topic, typeof message === 'string' ? message : JSON.stringify(message));
            // Si en 2.5s no respondió nada, forzar auto-heal
            setTimeout(() => {
              if (!resolved && !autoHealing) {
                triggerAutoHeal();
              }
            }, 2500);
          });
        });

        client.on('message', (t, payloadBuf) => {
          if (t !== 'cultivo/broadlink/status') return;
          try {
            const parsed = JSON.parse(payloadBuf.toString());
            const msg: string = parsed.message || payloadBuf.toString();
            const ip = extractIp(msg);
            if (ip) rm4Ip = ip;

            if (msg.includes('Modo aprendizaje ACTIVADO')) {
              finish(
                true,
                autoHealing
                  ? `Sesión RM4 auto-reparada (${rm4Ip || 'LAN'}) — ${msg}`
                  : `${rm4Ip ? `[RM4 ${rm4Ip}] ` : ''}${msg}`,
                autoHealing
              );
            } else if (msg.includes('Error al entrar en modo aprendizaje') || msg.includes('No se ha detectado el Broadlink')) {
              if (!autoHealing) {
                triggerAutoHeal();
              } else {
                finish(false, `El RM4 Mini devolvió error tras intentar reconectar: ${msg}`, true);
              }
            } else if (autoHealing && (msg.includes('Conectado al RM4') || msg.includes('Conectado exitosamente al RM4'))) {
              // Apenas reconecta y autentica, re-enviamos la orden de learn
              setTimeout(() => {
                if (!resolved) {
                  client.publish(topic, typeof message === 'string' ? message : JSON.stringify(message));
                }
              }, 350);
            } else if (msg.includes('No se encontró ningún Broadlink')) {
              finish(false, 'No se detectó el RM4 Mini en la red Wi-Fi del cultivo (verificar alimentación del RM4).', autoHealing);
            }
          } catch (e) {}
        });

        client.on('error', () => {
          finish(false, 'Error conectando al broker MQTT.');
        });
      });
    }

    // 3. Emisión de Comando IR con Confirmación y Auto-Curación
    if (topic === 'cultivo/broadlink/command') {
      return new Promise<Response>((resolve) => {
        const client = mqtt.connect(MQTT_BROKER, {
          clientId: `nextjs-rm4-cmd-${Math.random().toString(16).slice(2, 8)}`,
          connectTimeout: 5000,
        });

        let resolved = false;
        const finish = (ok: boolean, statusMessage: string) => {
          if (resolved) return;
          resolved = true;
          clearTimeout(timer);
          client.end();
          let updatedEquipmentStates: Record<string, EquipmentRuntimeState> | undefined = undefined;
          if (ok) {
            saveStatusCache({ online: true, lastMessage: statusMessage });
            if (body.stateUpdate && body.stateUpdate.equipment) {
              const store = applyEquipmentStateUpdate({
                equipment: body.stateUpdate.equipment,
                powerState: body.stateUpdate.powerState === 'off' ? 'off' : 'on',
                activeCommandId: body.stateUpdate.activeCommandId ?? null,
                activeCommandName: body.stateUpdate.activeCommandName ?? null,
                isSequence: Boolean(body.stateUpdate.isSequence),
                steps: Array.isArray(body.stateUpdate.steps) ? body.stateUpdate.steps : undefined,
                source: body.stateUpdate.source || 'manual',
                ruleName: body.stateUpdate.ruleName ?? null,
              }, Boolean(body.clearExecuting));
              updatedEquipmentStates = store.equipmentStates;
            }
          }
          resolve(NextResponse.json({ success: ok, statusMessage, equipmentStates: updatedEquipmentStates }));
        };

        const timer = setTimeout(() => {
          finish(true, 'Señal enviada al puente del cultivo.');
        }, 2500);

        client.on('connect', () => {
          client.subscribe('cultivo/broadlink/status', () => {
            client.publish(topic, typeof message === 'string' ? message : JSON.stringify(message));
          });
        });

        client.on('message', (t, payloadBuf) => {
          if (t !== 'cultivo/broadlink/status') return;
          try {
            const parsed = JSON.parse(payloadBuf.toString());
            const msg: string = parsed.message || payloadBuf.toString();
            if (msg.includes('enviado correctamente') || msg.includes('emitido exitosamente')) {
              finish(true, msg);
            } else if (msg.includes('Error')) {
              finish(false, msg);
            }
          } catch (e) {}
        });

        client.on('error', () => {
          finish(false, 'Error de conexión MQTT.');
        });
      });
    }

    // 4. Cualquier otro tópico MQTT estándar
    return new Promise<Response>((resolve) => {
      const client = mqtt.connect(MQTT_BROKER, {
        clientId: `nextjs-publisher-${Math.random().toString(16).slice(2, 8)}`,
        connectTimeout: 5000,
      });

      client.on('connect', () => {
        client.publish(topic, typeof message === 'string' ? message : JSON.stringify(message), (err) => {
          client.end();
          if (err) {
            resolve(NextResponse.json({ error: 'Failed to publish' }, { status: 500 }));
          } else {
            resolve(NextResponse.json({ success: true }));
          }
        });
      });

      client.on('error', () => {
        client.end();
        resolve(NextResponse.json({ error: 'MQTT Connection error' }, { status: 500 }));
      });
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
