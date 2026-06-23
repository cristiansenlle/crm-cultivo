const broadlink = require('node-broadlink');
const mqtt = require('mqtt');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

let SUPABASE_URL = "";
let SUPABASE_ANON_KEY = "";
try {
  let envFile = fs.readFileSync('../next-app/.env.local', 'utf8');
  envFile = envFile.replace(/^\uFEFF/, '');
  envFile.split('\n').forEach(line => {
    if (line.includes('NEXT_PUBLIC_SUPABASE_URL=')) SUPABASE_URL = line.split('NEXT_PUBLIC_SUPABASE_URL=')[1].trim();
    if (line.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) SUPABASE_ANON_KEY = line.split('NEXT_PUBLIC_SUPABASE_ANON_KEY=')[1].trim();
  });
} catch(e) {
  console.error("Error leyendo env de next-app:", e);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Configuración MQTT
const MQTT_BROKER = 'mqtt://109.199.99.126:1883';
const MQTT_TOPIC_COMMAND = 'cultivo/broadlink/command'; // Recibir comandos
const MQTT_TOPIC_LEARN = 'cultivo/broadlink/learn';     // Entrar a modo aprendizaje
const MQTT_TOPIC_STATUS = 'cultivo/broadlink/status';   // Publicar estado/respuestas

const client = mqtt.connect(MQTT_BROKER, { clientId: 'broadlink-bridge-local-' + Math.random().toString(16).slice(2, 8) });

let rmDevice = null;

function sendStatus(message) {
    console.log(`[STATUS] ${message}`);
    client.publish(MQTT_TOPIC_STATUS, JSON.stringify({ message, timestamp: new Date().toISOString() }));
}

async function discoverBroadlink() {
    try {
        console.log('[BROADLINK] Buscando dispositivos en la red local...');
        const devices = await broadlink.discover();
        if (devices && devices.length > 0) {
            rmDevice = devices[0];
            console.log(`[BROADLINK] Dispositivo encontrado: modelo ${rmDevice.model} en IP: ${rmDevice.host.address}`);
            sendStatus(`Conectado al RM4 en ${rmDevice.host.address}`);
            
            await rmDevice.auth();
            console.log('[BROADLINK] Autenticación exitosa.');
        } else {
            console.log('[BROADLINK] No se encontraron dispositivos.');
            sendStatus('Error: No se encontró ningún Broadlink en la red local.');
        }
    } catch (err) {
        console.error('[BROADLINK] Error en el descubrimiento:', err);
    }
}

client.on('connect', () => {
    console.log('[MQTT] Conectado a Contabo VPS');
    client.subscribe(MQTT_TOPIC_COMMAND);
    client.subscribe(MQTT_TOPIC_LEARN);
    sendStatus('Puente Local Iniciado');
    
    // Iniciar descubrimiento
    discoverBroadlink();
});

client.on('message', async (topic, message) => {
    console.log(`[MQTT] Recibido en ${topic}: ${message.toString()}`);
    
    if (!rmDevice) {
        sendStatus('Error: No se ha detectado el Broadlink RM4. Esperando descubrimiento...');
        return;
    }

    if (topic === MQTT_TOPIC_LEARN) {
        try {
            console.log('[BROADLINK] Entrando en Modo Aprendizaje IR...');
            await rmDevice.enterLearning();
            sendStatus('Modo aprendizaje ACTIVADO. Apunte el control remoto y presione el botón deseado...');
            
            let attempts = 0;
            const interval = setInterval(async () => {
                try {
                    attempts++;
                    const data = await rmDevice.checkData();
                    if (data) {
                        clearInterval(interval);
                        const hexCode = data.toString('hex');
                        console.log(`[BROADLINK] Código aprendido: ${hexCode}`);
                        client.publish('cultivo/broadlink/learned_code', JSON.stringify({ code: hexCode }));
                        
                        // Insertar en Supabase directamente desde el puente
                        await supabase.from('broadlink_commands').insert([{
                            name: 'Nuevo Comando (Editar nombre)',
                            hex_code: hexCode,
                            device_ip: rmDevice.host.address
                        }]);
                        
                        sendStatus(`Código capturado con éxito: ${hexCode}`);
                    }
                } catch (e) {
                    if (attempts > 30) {
                        clearInterval(interval);
                        sendStatus('Modo aprendizaje FINALIZADO por tiempo agotado (sin señal).');
                    }
                }
            }, 1000);
        } catch (err) {
            console.error('[BROADLINK] Error al entrar en aprendizaje:', err);
            sendStatus('Error al entrar en modo aprendizaje.');
        }
        
    } else if (topic === MQTT_TOPIC_COMMAND) {
        try {
            const payload = JSON.parse(message.toString());
            if (payload.code) {
                const buffer = Buffer.from(payload.code, 'hex');
                console.log(`[BROADLINK] Enviando código IR...`);
                await rmDevice.sendData(buffer);
                sendStatus('Código IR enviado correctamente.');
            }
        } catch (e) {
            console.error('[MQTT] Error procesando comando:', e.message);
        }
    }
});

client.on('error', (err) => {
    console.error('[MQTT] Error:', err);
});
