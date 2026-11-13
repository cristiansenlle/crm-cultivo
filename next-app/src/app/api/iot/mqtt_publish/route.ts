import { NextResponse } from 'next/server';
import mqtt from 'mqtt';
import { exec } from 'child_process';
import fs from 'fs';

const MQTT_BROKER = process.env.MQTT_BROKER_URL || 'mqtt://127.0.0.1:1883';
const STATUS_CACHE_FILE = '/tmp/broadlink_rm4_status.json';

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
  return NextResponse.json({
    success: true,
    status: cached || {
      online: true,
      rm4Ip: '192.168.100.7',
      lastMessage: 'Conectado al RM4 en 192.168.100.7',
      updatedAt: new Date().toISOString(),
    },
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
          if (ok) {
            saveStatusCache({ online: true, lastMessage: statusMessage });
          }
          resolve(NextResponse.json({ success: ok, statusMessage }));
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
