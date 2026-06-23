require('dotenv').config({ path: '.env.local' });
const mqtt = require('mqtt');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("Iniciando mqtt_logger...");

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Faltan credenciales de Supabase en .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const client = mqtt.connect('mqtt://109.199.99.126:1883', { clientId: 'crm-mqtt-logger-fix2' });

const deviceNames = {};

async function // notifyWhatsApp(deviceId, eventStr) {
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
      if (!response.ok) console.error("[WA] Server respondi status:", response.status);
      else console.log("[WA] Notificacin enviada con xito");
    }
  } catch (err) { console.error("[WA] Error enviando:", err.message); }
}

client.on('connect', () => {
  console.log("Conectado al Broker MQTT de Contabo!");
  client.subscribe('+/events/rpc', (err) => {
    if (!err) console.log("Suscrito a eventos de Shelly.");
    else console.error("Error al suscribir:", err);
  });
  // Shelly appends /rpc to the src string
  client.subscribe('logger_rpc/rpc', (err) => {
    if (!err) console.log("Suscrito a respuestas RPC.");
    else console.error("Error al suscribir a logger_rpc/rpc:", err);
  });
  
  // Ask for names on startup for the 2 known devices! (Fallback)
  client.publish('shellyplus1-8813bf9f8878/rpc', JSON.stringify({id: 999, src: 'logger_rpc', method: 'Shelly.GetDeviceInfo'}));
  client.publish('shellyplus1-8813bf9fc354/rpc', JSON.stringify({id: 999, src: 'logger_rpc', method: 'Shelly.GetDeviceInfo'}));
});

client.on('error', (err) => console.error("MQTT Error:", err));
client.on('offline', () => console.log("MQTT Offline"));

client.on('message', async (topic, message) => {
  try {
    const payload = JSON.parse(message.toString());
    
    // Si es respuesta de un Sys.GetConfig o Shelly.GetDeviceInfo
    if (topic === 'logger_rpc/rpc' && payload.id === 999 && payload.result) {
        // En Shelly.GetDeviceInfo, el nombre est en payload.result.name
        const name = payload.result.name || (payload.result.device && payload.result.device.name) || (payload.result.sys && payload.result.sys.device && payload.result.sys.device.name);
        const deviceId = payload.src; // src indicates who sent the response
        if (name && deviceId) {
            deviceNames[deviceId] = name;
            console.log(`[Cache] Nombre actualizado: ${deviceId} -> ${name}`);
        }
        return;
    }

    if (payload.method === 'NotifyStatus' && payload.params) {
        const deviceId = topic.split('/')[0];
        if (!deviceId.startsWith('shelly')) return;

        // Pedimos el nombre para la próxima vez si no lo tenemos (esto actualiza el caché en background)
        if (!deviceNames[deviceId]) {
            client.publish(`${deviceId}/rpc`, JSON.stringify({id: 999, src: 'logger_rpc', method: 'Shelly.GetDeviceInfo'}));
        }

        // 1. Procesamiento de Relés (Switch)
        if (payload.params['switch:0']) {
            const state = payload.params['switch:0'];
            if (typeof state.output === 'boolean') {
                const eventStr = state.output ? 'on' : 'off';
                console.log(`[${new Date().toISOString()}] Evento detectado: ${deviceId} -> ${eventStr}`);
                const { error } = await supabase.from('device_logs').insert([{ device_ip: deviceId, event: eventStr, source: 'mqtt_logger' }]);
                if (error) console.error("Error al guardar en Supabase:", error.message);
                // notifyWhatsApp(deviceId, eventStr);
            }
        }

        // 2. Procesamiento de Sensores H&T Gen3 (Humedad y Temperatura)
        if (payload.params['temperature:0'] || payload.params['humidity:0']) {
            const tC = payload.params['temperature:0']?.tC;
            const rh = payload.params['humidity:0']?.rh;
            
            if (typeof tC === 'number' && typeof rh === 'number') {
                console.log(`[${new Date().toISOString()}] Telemetría detectada: ${deviceId} -> T:${tC}°C H:${rh}%`);
                
                // Cálculo de VPD
                const svp = 0.61078 * Math.exp((17.27 * tC) / (tC + 237.3));
                const vpd_kpa = Number((svp * (1 - rh / 100)).toFixed(2));

                // Buscar el sensor mapeado en la BD cuyo nombre contenga (deviceId)
                const { data: sensors } = await supabase.from('core_sensors').select('id, name, room_id');
                if (sensors) {
                    const matchedSensor = sensors.find(s => s.name && s.name.includes(`(${deviceId})`));
                    if (matchedSensor) {
                        const { error } = await supabase.from('daily_telemetry').insert([{
                            sensor_id: matchedSensor.id,
                            room_id: matchedSensor.room_id,
                            temperature_c: tC,
                            humidity_percent: rh,
                            vpd_kpa: vpd_kpa
                        }]);
                        if (error) console.error("Error guardando telemetría:", error.message);
                        else console.log(`[OK] Telemetría guardada para sensor ${matchedSensor.name} [VPD: ${vpd_kpa}]`);
                    } else {
                        console.log(`[Warn] No hay sensor en BD mapeado a (${deviceId}). Asegúrate de nombrarlo como "Nombre (${deviceId})". Ignorando telemetría.`);
                    }
                }
            }
        }
    }
  } catch (error) {}
});

