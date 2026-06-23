const fs = require('fs');
const mqtt = require('mqtt');

let SUPABASE_URL = "";
let SUPABASE_ANON_KEY = "";
try {
  let envFile = fs.readFileSync('/opt/crm-cannabis-next/.env.local', 'utf8');
  envFile = envFile.replace(/^\uFEFF/, '');
  envFile.split('\n').forEach(line => {
    if (line.includes('NEXT_PUBLIC_SUPABASE_URL=')) SUPABASE_URL = line.split('NEXT_PUBLIC_SUPABASE_URL=')[1].trim();
    if (line.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) SUPABASE_ANON_KEY = line.split('NEXT_PUBLIC_SUPABASE_ANON_KEY=')[1].trim();
  });
} catch(e) {
  console.error("Error reading env file:", e);
}

console.log("Iniciando mqtt_logger...");

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Faltan credenciales de Supabase en /opt/crm-cannabis-next/.env.local");
  process.exit(1);
}

const client = mqtt.connect('mqtt://127.0.0.1:1883', { clientId: 'crm-mqtt-logger-fix6' });
const deviceNames = {};

async function insertSupabase(table, payload) {
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const err = await res.text();
            console.error(`Error Supabase insert [${table}]:`, res.status, err);
            return { error: new Error(err) };
        }
        return { data: true, error: null };
    } catch(e) {
        console.error(`Fetch error [${table}]:`, e);
        return { error: e };
    }
}

async function getSupabase(table) {
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        if (!res.ok) return { data: null };
        const data = await res.json();
        return { data };
    } catch(e) {
        console.error(`Fetch error [${table}]:`, e);
        return { data: null };
    }
}

async function notifyWhatsApp(deviceId, eventStr) {
  try {
    const deviceName = deviceNames[deviceId] || deviceId;
    const statusEmoji = eventStr.toLowerCase() === 'on' ? '🟢' : '🔴';
    const statusText = eventStr.toLowerCase() === 'on' ? 'ENCENDIDO' : 'APAGADO';
    const message = `${statusEmoji} El dispositivo *${deviceName}* se ha ${statusText}.`;
    
    console.log("[WA] Enviando:", message);
    
    if (typeof fetch === "undefined") {
      const http = require('http');
      const data = JSON.stringify({ phone: '5491156548820@c.us', message: message });
      const options = { hostname: '127.0.0.1', port: 5007, path: '/send-message', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } };
      const req = http.request(options, res => { console.log("[WA] HTTP Status:", res.statusCode); });
      req.on('error', e => console.error("[WA] HTTP Error:", e));
      req.write(data); req.end();
    } else {
      const response = await fetch('http://127.0.0.1:5007/send-message', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: '5491156548820@c.us', message: message })
      });
      if (!response.ok) console.error("[WA] Server respondió status:", response.status);
      else console.log("[WA] Notificación enviada con éxito");
    }
  } catch (err) { console.error("[WA] Error enviando:", err.message); }
}

client.on('connect', () => {
  console.log("Conectado al Broker MQTT de Contabo!");
  client.subscribe('+/events/rpc', (err) => {
    if (!err) console.log("Suscrito a eventos de Shelly.");
    else console.error("Error al suscribir:", err);
  });
  client.subscribe('logger_rpc/rpc', (err) => {
    if (!err) console.log("Suscrito a respuestas RPC.");
    else console.error("Error al suscribir a logger_rpc/rpc:", err);
  });
  client.subscribe('cultivo/soil/esp32/#', (err) => {
    if (!err) console.log("Suscrito a topics ESP32.");
  });
  
  client.publish('shellyplus1-8813bf9f8878/rpc', JSON.stringify({id: 999, src: 'logger_rpc', method: 'Shelly.GetDeviceInfo'}));
  client.publish('shellyplus1-8813bf9fc354/rpc', JSON.stringify({id: 999, src: 'logger_rpc', method: 'Shelly.GetDeviceInfo'}));
});

client.on('error', (err) => console.error("MQTT Error:", err));
client.on('offline', () => console.log("MQTT Offline"));

client.on('message', async (topic, message) => {
  try {
    const msgStr = message.toString();
    const payload = JSON.parse(msgStr);
    
    // Check ESP32 Soil Sensor
    if (topic.includes('soil/esp32')) {
        try {
            console.log(`[${new Date().toISOString()}] ESP32 Soil MAC: ${payload.mac} -> S1:${payload.s1_pct}% S2:${payload.s2_pct}% S3:${payload.s3_pct}% S4:${payload.s4_pct}% S5:${payload.s5_pct}%`);
            
            const { data: sensors } = await getSupabase('core_soil_sensors');
            if (sensors) {
                const CARPA2_ROOM_ID = '5a650ff8-9b93-40cc-a7f9-c672bad50014';
                
                const mapping = {
                    s1: 'Sensor Humedad 1', s2: 'Sensor Humedad 2', s3: 'Sensor Humedad 3', s4: 'Sensor Humedad 4', s5: 'Sensor Humedad 5'
                };

                for (const [key, name] of Object.entries(mapping)) {
                    if (payload[`${key}_pct`] !== undefined) {
                        const matchedSensor = sensors.find(s => s.name === name && s.room_id === CARPA2_ROOM_ID);
                        if (matchedSensor) {
                            const { error } = await insertSupabase('soil_telemetry', {
                                sensor_id: matchedSensor.id,
                                moisture_pct: payload[`${key}_pct`],
                                raw_value: payload[`${key}_raw`] || 0
                            });
                            if (error) {
                                console.error(`Error guardando soil telemetría para ${name}:`, error.message);
                            } else {
                                console.log(`[OK] Telemetría guardada para sensor ESP32 (${name})`);
                            }
                        } else {
                            console.error(`[Warn] No se encontró el sensor ${name} en Carpa 2`);
                        }
                    }
                }
            } else {
                console.error("[Error] Falló la consulta a core_soil_sensors");
            }
        } catch (err) {
            console.error(`[Error] en ESP32 handler:`, err);
        }
        return;
    }

    if (topic === 'logger_rpc/rpc' && payload.id === 999 && payload.result) {
        const name = payload.result.name || (payload.result.device && payload.result.device.name) || (payload.result.sys && payload.result.sys.device && payload.result.sys.device.name);
        const deviceId = payload.src; 
        if (name && deviceId) {
            deviceNames[deviceId] = name;
            console.log(`[Cache] Nombre actualizado: ${deviceId} -> ${name}`);
        }
        return;
    }

    if ((payload.method === 'NotifyStatus' || payload.method === 'NotifyFullStatus') && payload.params) {
        const deviceId = topic.split('/')[0];
        if (!deviceId.startsWith('shelly')) return;

        if (!deviceNames[deviceId]) {
            client.publish(`${deviceId}/rpc`, JSON.stringify({id: 999, src: 'logger_rpc', method: 'Shelly.GetDeviceInfo'}));
        }

        if (payload.params['switch:0']) {
            const state = payload.params['switch:0'];
            if (typeof state.output === 'boolean') {
                const eventStr = state.output ? 'on' : 'off';
                console.log(`[${new Date().toISOString()}] Evento detectado: ${deviceId} -> ${eventStr}`);
                const { error } = await insertSupabase('device_logs', { device_ip: deviceId, event: eventStr, source: 'mqtt_logger' });
                if (error) console.error("Error al guardar en Supabase:", error.message);
                notifyWhatsApp(deviceId, eventStr);
            }
        }

        if (payload.params['temperature:0'] || payload.params['humidity:0']) {
            const tC = payload.params['temperature:0']?.tC;
            const rh = payload.params['humidity:0']?.rh;
            
            if (typeof tC === 'number' && typeof rh === 'number') {
                console.log(`[${new Date().toISOString()}] Telemetría detectada: ${deviceId} -> T:${tC}°C H:${rh}%`);
                
                const leafTemp = tC - 1.5;
                const svpLeaf = 0.61078 * Math.exp((17.27 * leafTemp) / (leafTemp + 237.3));
                const svpAir = 0.61078 * Math.exp((17.27 * tC) / (tC + 237.3));
                const avpAir = svpAir * (rh / 100);
                const vpd_kpa = Number((svpLeaf - avpAir).toFixed(2));

                const { data: sensors } = await getSensors();
                if (sensors) {
                    const matchedSensor = sensors.find(s => s.name && s.name.includes(`(${deviceId})`));
                    if (matchedSensor) {
                        const { error } = await insertSupabase('daily_telemetry', {
                            sensor_id: matchedSensor.id,
                            room_id: matchedSensor.room_id,
                            temperature_c: tC,
                            humidity_percent: rh,
                            vpd_kpa: vpd_kpa
                        });
                        if (error) console.error("Error guardando telemetría:", error.message);
                        else console.log(`[OK] Telemetría guardada para sensor ${matchedSensor.name} [VPD: ${vpd_kpa}]`);
                    } else {
                        console.log(`[Warn] No hay sensor en BD mapeado a (${deviceId}). Usando ID como nombre.`);
                    }
                }
            }
        }
    }
  } catch (error) {
      // Ignorar parse JSON error
  }
});
