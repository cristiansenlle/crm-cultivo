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

const client = mqtt.connect('mqtt://127.0.0.1:1883', { clientId: 'crm-mqtt-logger-fix6-' + Math.random().toString(16).substr(2, 8) });
const deviceNames = {};
const lastPhytoSaveTime = {};

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

const scriptTimers = {};
const pendingNotifications = {};
const lastNotifiedState = {};

// ==========================================
// ESTADO Y EVALUADOR DE CLIMATIZACIÓN AUTOMÁTICA
// ==========================================
let isLightOn = true;
let lastKnownTC = null;
let lastKnownRH = null;
let lastKnownVPD = null;
let lastAutomationEval = 0;
const ruleCooldowns = {};


let cameraAutoCaptureTimer = null;

function getCameraShellyConfig() {
  try {
    const gridPath = '/var/www/captures/crop_vision/plant_grid.json';
    if (fs.existsSync(gridPath)) {
      const grid = JSON.parse(fs.readFileSync(gridPath, 'utf8'));
      return {
        linked_shelly_device_id: grid.linked_shelly_device_id || 'shellyplus1-8813bf9f8878',
        linked_shelly_name: grid.linked_shelly_name || 'Shelly Iluminación Carpa (8813bf9f8878)',
        only_capture_when_shelly_on: grid.only_capture_when_shelly_on !== false,
        auto_capture_on_shelly_on: grid.auto_capture_on_shelly_on !== false
      };
    }
  } catch (e) {
    console.warn('[VISION AUTO] Error leyendo plant_grid.json:', e.message);
  }
  return {
    linked_shelly_device_id: 'shellyplus1-8813bf9f8878',
    linked_shelly_name: 'Shelly Iluminación Carpa (8813bf9f8878)',
    only_capture_when_shelly_on: true,
    auto_capture_on_shelly_on: true
  };
}

function publishCameraLightState(shellyId, isOn) {
  try {
    const cfg = getCameraShellyConfig();
    const payload = {
      linked_shelly_device_id: shellyId || cfg.linked_shelly_device_id,
      is_on: Boolean(isOn),
      only_capture_when_shelly_on: cfg.only_capture_when_shelly_on,
      capture_enabled: !cfg.only_capture_when_shelly_on || Boolean(isOn),
      updated_at: new Date().toISOString()
    };
    client.publish('cultivo/camera/light_state', JSON.stringify(payload), { retain: true, qos: 1 });
  } catch (e) {
    console.error('[VISION AUTO] Error publicando light_state:', e.message);
  }
}

async function initPhotoperiodState() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/device_logs?source=eq.mqtt_logger&order=created_at.desc&limit=10`, {
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
    });
    if (res.ok) {
      const logs = await res.json();
      const camCfg = getCameraShellyConfig();
      const lightLog = logs?.find(l => l.device_ip === camCfg.linked_shelly_device_id && (l.event === 'on' || l.event === 'off'))
                    || logs?.find(l => l.event === 'on' || l.event === 'off');
      if (lightLog) {
        isLightOn = lightLog.event === 'on';
        console.log(`[CLIMA AUTO] 💡 Fotoperiodo inicial recuperado de BD: ${isLightOn ? 'DÍA (Luces ON)' : 'NOCHE (Luces OFF)'}`);
      }
    }
  } catch (e) {
    console.error("[CLIMA AUTO] Error al recuperar fotoperiodo inicial:", e.message);
  }
}
initPhotoperiodState();

async function evaluateClimateAutomation(tC, rh, vpdLeaf) {
  const now = Date.now();
  if (now - lastAutomationEval < 10000) return; // Debounce mínimo 10s
  lastAutomationEval = now;

  try {
    const { data: profiles } = await getSupabase('climate_profiles');
    const activeProfile = profiles?.find(p => p.is_active);
    if (!activeProfile) return;

    const { data: rules } = await getSupabase('climate_automation_rules');
    const activeRules = rules?.filter(r => r.is_active) || [];
    if (activeRules.length === 0) return;

    const { data: commands } = await getSupabase('broadlink_commands');

    const mode = isLightOn ? 'day' : 'night';

    for (const rule of activeRules) {
      if (rule.mode !== 'both' && rule.mode !== mode) continue;

      const lastTrigger = ruleCooldowns[rule.id] || (rule.last_triggered_at ? new Date(rule.last_triggered_at).getTime() : 0);
      const cooldownMs = (rule.cooldown_minutes || 10) * 60 * 1000;
      if (now - lastTrigger < cooldownMs) continue;

      let valToCompare = 0;
      if (rule.target_parameter === 'temperature') valToCompare = tC;
      else if (rule.target_parameter === 'humidity') valToCompare = rh;
      else if (rule.target_parameter === 'vpd') valToCompare = vpdLeaf;

      let conditionMet = false;
      if (rule.condition === 'greater_than' && valToCompare > rule.threshold_value) {
        conditionMet = true;
      } else if (rule.condition === 'less_than' && valToCompare < rule.threshold_value) {
        conditionMet = true;
      }

      if (conditionMet) {
        const matchedCmd = commands?.find(c => c.id === rule.command_id);
        if (!matchedCmd) continue;

        console.log(`[CLIMA AUTO] 🚨 Disparando regla: ${rule.name} (Modo: ${mode}, Valor: ${valToCompare}, Umbral: ${rule.threshold_value}) -> Comando: ${matchedCmd.name}`);

        ruleCooldowns[rule.id] = now;

        if (matchedCmd.hex_code.startsWith('MACRO:')) {
          try {
            const seq = JSON.parse(matchedCmd.hex_code.replace('MACRO:', ''));
            for (let i = 0; i < seq.length; i++) {
              client.publish('cultivo/broadlink/command', JSON.stringify({ code: seq[i], name: `${matchedCmd.name} (Paso ${i+1})` }));
              if (i < seq.length - 1) await new Promise(r => setTimeout(r, 2000));
            }
          } catch (e) {
            console.error("[CLIMA AUTO] Error ejecutando macro:", e);
          }
        } else {
          client.publish('cultivo/broadlink/command', JSON.stringify({ code: matchedCmd.hex_code, name: matchedCmd.name }));
        }

        await insertSupabase('climate_automation_logs', {
          rule_id: rule.id,
          event_description: `Regla ${rule.name}: ${rule.target_parameter} ${rule.condition === 'greater_than' ? '>' : '<'} ${rule.threshold_value}`,
          triggered_value: valToCompare,
          mode: mode,
          command_name: matchedCmd.name
        });

        await fetch(`${SUPABASE_URL}/rest/v1/climate_automation_rules?id=eq.${rule.id}`, {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ last_triggered_at: new Date().toISOString() })
        });

        break;
      }
    }
  } catch (e) {
    console.error("[CLIMA AUTO] Error en motor de automatización:", e.message);
  }
}

async function notifyWhatsApp(deviceId, eventStr, state = null) {
  try {
    const deviceName = deviceNames[deviceId] || deviceId;
    const statusEmoji = eventStr.toLowerCase() === 'on' ? '🟢' : '🔴';
    const statusText = eventStr.toLowerCase() === 'on' ? 'ENCENDIDO' : 'APAGADO';
    let message = `${statusEmoji} El dispositivo *${deviceName}* se ha ${statusText}.`;

    let nextEpoch = null;
    if (state && state.timer_duration && state.timer_started_at) {
        nextEpoch = state.timer_started_at + state.timer_duration;
    } else if (scriptTimers[deviceId]) {
        nextEpoch = scriptTimers[deviceId];
    }

    if (nextEpoch) {
        const date = new Date(nextEpoch * 1000);
        const timeStr = new Intl.DateTimeFormat('es-AR', {
            hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires'
        }).format(date);
        const nextAction = eventStr.toLowerCase() === 'on' ? 'apagar' : 'encender';
        message += `\n⏰ Se va a volver a ${nextAction} automáticamente a las ${timeStr} hs.`;
    }
    
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
  client.subscribe('cultivo/script_timers');
  client.subscribe('logger_rpc/rpc', (err) => {
    if (!err) console.log("Suscrito a logger_rpc/rpc");
  });
  client.subscribe('cultivo/soil/esp32/#', (err) => {
    if (!err) console.log("Suscrito a topics ESP32.");
  });
  client.subscribe('cultivo/electrophysiology/esp32/#', (err) => {
    if (!err) console.log("Suscrito a topics Electrofisiologia ESP32.");
  });
  client.subscribe('cultivo/broadlink/#', (err) => {
    if (!err) console.log("Suscrito a topics Broadlink RM4.");
  });
  
  client.publish('shellyplus1-8813bf9f8878/rpc', JSON.stringify({id: 999, src: 'logger_rpc', method: 'Shelly.GetDeviceInfo'}));
  client.publish('shellyplus1-8813bf9fc354/rpc', JSON.stringify({id: 999, src: 'logger_rpc', method: 'Shelly.GetDeviceInfo'}));
  client.publish('shelly1g4-a085e3b53e7c/rpc', JSON.stringify({id: 999, src: 'logger_rpc', method: 'Shelly.GetDeviceInfo'}));

  // Consultar estado físico actual del relé (Switch.GetStatus) para sincronizar cámara y fotoperiodo
  const camCfg = getCameraShellyConfig();
  client.publish(`${camCfg.linked_shelly_device_id}/rpc`, JSON.stringify({id: 998, src: 'logger_rpc', method: 'Switch.GetStatus', params: {id: 0}}));
});

client.on('error', (err) => console.error("MQTT Error:", err));
client.on('offline', () => console.log("MQTT Offline"));

let lastBroadlinkHealTime = 0;

client.on('message', async (topic, message) => {
  try {
    const msgStr = message.toString();
    const payload = JSON.parse(msgStr);

    // Monitoreo y Auto-Reparación de Broadlink RM4 Mini
    if (topic === 'cultivo/broadlink/status') {
        const statusText = payload.message || msgStr;
        console.log(`[${new Date().toISOString()}] 📡 Broadlink Status: ${statusText}`);
        try {
            const ipMatch = statusText.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
            let cached = { online: true, rm4Ip: '192.168.100.7', lastMessage: statusText, updatedAt: new Date().toISOString() };
            if (fs.existsSync('/tmp/broadlink_rm4_status.json')) {
                try { cached = { ...JSON.parse(fs.readFileSync('/tmp/broadlink_rm4_status.json', 'utf8')), ...cached }; } catch(e) {}
            }
            if (ipMatch) cached.rm4Ip = ipMatch[1];
            cached.online = !statusText.toLowerCase().includes('error') && !statusText.includes('No se encontró');
            cached.lastMessage = statusText;
            cached.updatedAt = new Date().toISOString();
            fs.writeFileSync('/tmp/broadlink_rm4_status.json', JSON.stringify(cached, null, 2), 'utf8');
        } catch (e) {}

        if (
            (statusText.includes('Error al entrar en modo aprendizaje') || statusText.includes('No se ha detectado el Broadlink')) &&
            Date.now() - lastBroadlinkHealTime > 15000
        ) {
            lastBroadlinkHealTime = Date.now();
            console.log(`[BROADLINK AUTO-HEAL] 🔧 Error de sesión detectado en RM4 Mini. Forzando re-autenticación remota del puente...`);
            const { exec } = require('child_process');
            const healCmd = `
              LINE=$(grep -h "New client connected" /var/log/mosquitto/mosquitto.log.1 /var/log/mosquitto/mosquitto.log 2>/dev/null | grep -i "broadlink-bridge" | tail -n 1)
              if [ -n "$LINE" ]; then
                ADDR=$(echo "$LINE" | sed -n 's/.*from \\([0-9.]*:[0-9]*\\) as.*/\\1/p')
                IP=$(echo "$ADDR" | cut -d: -f1)
                PORT=$(echo "$ADDR" | cut -d: -f2)
                if [ -n "$IP" ] && [ -n "$PORT" ]; then
                  ACTIVE=$(ss -tn state established "( sport = :1883 and dst = $IP and dport = :$PORT )" | tail -n +2)
                  if [ -n "$ACTIVE" ]; then
                    ss -K dst "$IP" dport = "$PORT"
                    exit 0
                  fi
                fi
              fi
              ss -K state established '( sport = :1883 and dst != 127.0.0.1 )'
            `;
            exec(healCmd, () => {
                console.log(`[BROADLINK AUTO-HEAL] ✅ Socket reiniciado. El puente en Raspberry Pi re-autenticará el RM4 automáticamente.`);
            });
        }
        return;
    }
    
    // Check ESP32 Soil Sensor
    if (topic.includes('soil/esp32')) {
        try {
            console.log(`[${new Date().toISOString()}] ESP32 Soil MAC: ${payload.mac} -> S1:${payload.s1_pct}% S2:${payload.s2_pct}% S3:${payload.s3_pct}% S4:${payload.s4_pct}% S5:${payload.s5_pct}%`);
            
            const { data: sensors } = await getSupabase('core_soil_sensors');
            if (sensors) {
                const CARPA2_ROOM_ID = '5a650ff8-9b93-40cc-a7f9-c672bad50014';
                let mapping = {};
                if (payload.mac && payload.mac.toUpperCase() === '04:B2:47:96:AF:E8') {
                    mapping = {
                        s1: 'Sensor Humedad 1', s2: 'Sensor Humedad 2', s3: 'Sensor Humedad 3', s4: 'Sensor Humedad 4', s5: 'Sensor Humedad 5'
                    };
                } else if (payload.mac && payload.mac.toUpperCase() === 'B4:BF:E9:C9:F9:AC') {
                    mapping = {
                        s1: 'Sensor Humedad 6', s2: 'Sensor Humedad 7', s3: 'Sensor Humedad 8', s4: 'Sensor Humedad 9', s5: 'Sensor Humedad 10'
                    };
                } else {
                    console.error("[Warn] ESP32 MAC desconocida:", payload.mac);
                    return;
                }

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

    // Check ESP32 Plant Electrophysiology Biosensor
    if (topic.includes('electrophysiology')) {
        try {
            console.log(`[${new Date().toISOString()}] 🌿 Phyto Biosensor MAC: ${payload.mac} -> V:${payload.voltage_mv}mV Base:${payload.baseline_mv}mV Stress:${payload.stress_index}% Event:${payload.event} (ADS:${payload.ads_online})`);
            
            const now = Date.now();
            const lastSaved = lastPhytoSaveTime[payload.mac] || 0;
            const isSignificantEvent = payload.event === 'stress_spike' || payload.event === 'action_potential';

            // Guardar cada 15 segundos o inmediatamente si hay un evento significativo
            if (now - lastSaved >= 15000 || isSignificantEvent) {
                lastPhytoSaveTime[payload.mac] = now;

                const record = {
                    mac: payload.mac || 'ESP32-Phyto',
                    room_id: payload.room_id || '5a650ff8-9b93-40cc-a7f9-c672bad50014',
                    plant_tag: payload.plant_tag || 'Carpa2_PlantaCentinela_01',
                    voltage_mv: Number(payload.voltage_mv) || (payload.ch1 ? Number(payload.ch1.voltage_mv) : 0),
                    baseline_mv: Number(payload.baseline_mv) || (payload.ch1 ? Number(payload.ch1.baseline_mv) : 1650),
                    stress_index: Number(payload.stress_index) || (payload.ch1 ? Number(payload.ch1.stress_index) : 0),
                    event: payload.event || (payload.ch1 ? payload.ch1.event : 'steady'),
                    ch1: payload.ch1 || {
                        voltage_mv: Number(payload.voltage_mv) || 0,
                        baseline_mv: Number(payload.baseline_mv) || 1650,
                        stress_index: Number(payload.stress_index) || 0,
                        event: payload.event || 'steady'
                    },
                    ch2: payload.ch2 || null,
                    ads_online: payload.ads_online !== false,
                    timestamp: new Date().toISOString()
                };

                const { error } = await insertSupabase('device_logs', {
                    device_ip: payload.mac || 'ESP32-Phyto',
                    event: JSON.stringify(record),
                    source: 'plant_electrophysiology'
                });

                if (error) console.error("Error guardando telemetría de electrofisiología:", error.message);
                else {
                    const ch2Text = record.ch2 ? ` | CH2: ${record.ch2.voltage_mv} mV` : '';
                    console.log(`[OK] Telemetría bioeléctrica guardada en BD (CH1: ${record.voltage_mv} mV${ch2Text})`);
                }
            }
        } catch(e) {
            console.error("[Error] en electrophysiology handler:", e.message);
        }
        return;
    }

    if (topic === 'logger_rpc/rpc' && payload.id === 998 && payload.result) {
        const deviceId = payload.src;
        const camCfg = getCameraShellyConfig();
        if (deviceId === camCfg.linked_shelly_device_id && typeof payload.result.output === 'boolean') {
            isLightOn = payload.result.output;
            publishCameraLightState(deviceId, isLightOn);
            console.log(`[VISION AUTO] 💡 Estado físico en vivo del Shelly vinculado (${deviceId}): ${isLightOn ? 'ENCENDIDO (Captura Habilitada)' : 'APAGADO (Pausa Nocturna)'}`);
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

    if (topic === 'cultivo/script_timers') {
        try {
            if (payload.deviceId && payload.next_epoch) {
                console.log(`[DEBUG] Received script_timers for ${payload.deviceId}: ${payload.next_epoch}`);
                scriptTimers[payload.deviceId] = payload.next_epoch;
                setTimeout(() => { delete scriptTimers[payload.deviceId]; }, 30000);
            }
        } catch(e) { console.error("Error parsing script_timers payload:", e.message); }
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

                // Detectar cambio de fotoperiodo y vinculación con Cámara Cenital
                const camCfg = getCameraShellyConfig();
                const devName = (deviceNames[deviceId] || '').toLowerCase();
                const isLinkedCameraShelly = deviceId === camCfg.linked_shelly_device_id;
                const isLightDevice = isLinkedCameraShelly ||
                                      devName.includes('luz') || devName.includes('iluminac') ||
                                      deviceId === 'shellyplus1-8813bf9f8878' ||
                                      deviceId === 'shellyplus1-8813bf9fc354';

                if (isLightDevice) {
                    const prevMode = isLightOn;
                    isLightOn = state.output;
                    console.log(`[CLIMA AUTO] 💡 Fotoperiodo actualizado: ${isLightOn ? 'DÍA (Luces ON)' : 'NOCHE (Luces OFF)'} por ${deviceId} (${deviceNames[deviceId] || 'Shelly'})`);

                    if (prevMode !== isLightOn && lastKnownTC !== null && lastKnownRH !== null && lastKnownVPD !== null) {
                        evaluateClimateAutomation(lastKnownTC, lastKnownRH, lastKnownVPD);
                    }
                }

                if (isLinkedCameraShelly) {
                    publishCameraLightState(deviceId, state.output);
                    if (cameraAutoCaptureTimer) {
                        clearTimeout(cameraAutoCaptureTimer);
                        cameraAutoCaptureTimer = null;
                    }

                    if (state.output === true && camCfg.auto_capture_on_shelly_on) {
                        console.log(`[VISION AUTO] 📸 Shelly vinculado (${deviceId}) ENCENDIDO -> Programando captura automática de cámara en 8s...`);
                        cameraAutoCaptureTimer = setTimeout(() => {
                            cameraAutoCaptureTimer = null;
                            client.publish('cultivo/camera/commands', JSON.stringify({
                                cmd: 'capture_now',
                                trigger: 'shelly_light_on',
                                shelly_id: deviceId,
                                requested_at: new Date().toISOString()
                            }), { qos: 1 });
                            console.log(`[VISION AUTO] 📸 Comando capture_now enviado a la cámara tras encendido de ${deviceId}.`);
                        }, 8000);
                    } else if (state.output === false) {
                        console.log(`[VISION AUTO] 🌙 Shelly vinculado (${deviceId}) APAGADO -> Cámara en pausa nocturna.`);
                    }
                }

                if (pendingNotifications[deviceId]) {
                    clearTimeout(pendingNotifications[deviceId]);
                    delete pendingNotifications[deviceId];
                }
                
                if (lastNotifiedState[deviceId] !== eventStr) {
                    pendingNotifications[deviceId] = setTimeout(() => {
                        lastNotifiedState[deviceId] = eventStr;
                        notifyWhatsApp(deviceId, eventStr, state);
                        delete pendingNotifications[deviceId];
                    }, 15000);
                } else {
                    console.log(`[Debounce] Mensaje de WhatsApp omitido para ${deviceId} (estado ya era ${eventStr})`);
                }
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
                const vpdLeaf_kpa = Number((svpLeaf - avpAir).toFixed(2));
                const vpdAmbient_kpa = Number((svpAir - avpAir).toFixed(2));

                lastKnownTC = tC;
                lastKnownRH = rh;
                lastKnownVPD = vpdLeaf_kpa;

                const { data: sensors } = await getSupabase('core_sensors');
                if (sensors) {
                    const matchedSensor = sensors.find(s => s.name && s.name.includes(deviceId));
                    if (matchedSensor) {
                        const { error } = await insertSupabase('daily_telemetry', {
                            sensor_id: matchedSensor.id,
                            room_id: matchedSensor.room_id,
                            temperature_c: tC,
                            humidity_percent: rh,
                            vpd_kpa: vpdLeaf_kpa,
                            vpd_ambient_kpa: vpdAmbient_kpa,
                            vpd_leaf_kpa: vpdLeaf_kpa
                        });
                        if (error) console.error("Error guardando telemetría:", error.message);
                        else console.log(`[OK] Telemetría guardada para sensor ${matchedSensor.name} [VPD: ${vpdLeaf_kpa}]`);
                    } else {
                        console.log(`[Warn] No hay sensor en BD mapeado a (${deviceId}). Usando ID como nombre.`);
                    }
                }

                // Evaluar reglas de automatización climática Broadlink (Temp, Humedad, VPD)
                await evaluateClimateAutomation(tC, rh, vpdLeaf_kpa);
            }
        }
    }
  } catch (error) {
      // Ignorar parse JSON error
  }
});
