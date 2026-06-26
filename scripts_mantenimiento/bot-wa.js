const { Client, LocalAuth } = require('whatsapp-web.js');
const { execSync } = require('child_process');

// Kill any stale Chrome processes from previous restarts to avoid SingletonLock
try { execSync('pkill -9 -f "chrome" 2>/dev/null || true'); } catch (e) { }
try { execSync('pkill -9 -f "chromium" 2>/dev/null || true'); } catch (e) { }

const client = new Client({
    authStrategy: new LocalAuth({ clientId: 'bot' }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ],
    }
});

const qrcode = require('qrcode-terminal');
const axios = require('axios');

// Webhook temporal en n8n para recibir todo lo que WhatsApp capte
const N8N_WEBHOOK_URL = 'http://109.199.99.126:5678/webhook/wa-inbound';



// Generar QR para escanear
client.on('qr', (qr) => {
    console.log('');
    console.log('📱 ¡ESCANEA ESTE CÓDIGO QR CON LA APP DE WHATSAPP (Dispositivos Vinculados)! 📱');
    console.log('');
    qrcode.generate(qr, { small: true });
    lastQR = qr;
});

// Aviso de conexión exitosa
client.on('ready', () => {
    console.log('✅ Cliente conectado y listo. Esperando mensajes en WhatsApp...');
    lastQR = '';
});

// Listener de mensajes (incluye los enviados por uno mismo)
client.on('message_create', async msg => {
    console.log('[DEBUG ALL] from:', msg.from, 'to:', msg.to, 'body:', msg.body, 'fromMe:', msg.fromMe);
    // Evitar estados, grupos (con .g.us) o el propio broadcaster
    if (msg.from === 'status@broadcast' || msg.isGroupMsg || msg.from.includes('@g.us') || msg.to.includes('@g.us')) return;

    // ⛔ PREVENIR LOOPS INFINITOS: Ignorar las respuestas automáticas del sistema usando una marca de agua invisible (\u200B) o emojis del sistema
    if (msg.fromMe && (msg.body.startsWith('\u200B') || msg.body.startsWith('✅') || msg.body.startsWith('🤖') || msg.body.startsWith('📡') || msg.body.startsWith('🐛') || msg.body.startsWith('✂️'))) {
        return;
    }

    // Identificar el usuario correcto dependiendo de si es auto-mensaje
    let phoneNum = msg.from;
    if (msg.fromMe) phoneNum = msg.to;

    // ⛔ SEGURIDAD: Procesar ÚNICAMENTE mensajes de este número (el dueño)
    const NUMERO_ADMIN = '5491156548820@c.us';
    if (phoneNum !== NUMERO_ADMIN) {
        return;
    }

    // Solo para debuggear
    console.log(`\n===========================================`);
    console.log(`[WA] Capturando mensaje de: ${phoneNum}`);
    console.log(`[WA] Texto: "${msg.body}"`);

    try {
        console.log(`[HTTP] Enviando a Webhook n8n...`);
        // Enviar payload a n8n
        const response = await axios.post(N8N_WEBHOOK_URL, {
            sessionId: msg.from,
            phone: msg.from,
            body: msg.body,
            timestamp: msg.timestamp
        });

        console.log(`[HTTP] Respuesta n8n: Estado ${response.status}`);
        console.log(`[HTTP] Data Recibida:`, JSON.stringify(response.data));

        // Si n8n (o Gemini) decide contestarle al usuario, lo mandará en la propiedad "response" del último nodo
        // Le inyectamos una "marca de agua invisible" (Zero-Width Space) al principio para que el listener sepa que es del bot y no del humano
        if (response.data && response.data.response) {
            console.log(`[WA] Respondiendo al chat con: "${response.data.response}"`);
            msg.reply('\u200B' + response.data.response);
        } else {
            console.log(`[WA] Silencio (n8n no devolvió campo response)`);
        }

    } catch (error) {
        console.error('Error puenteando a n8n:', error.message);
        // Descomentar si quieres un aviso en WA de conectividad rota
        // msg.reply('⚠️ Servidor CRM Apagado. No pude procesar tu mensaje.');
    }
});

client.initialize();

// ==========================================
// SERVIDOR HTTP PARA ALERTAS AUTÓNOMAS
// ==========================================
const http = require('http');

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

    if (req.method === 'GET' && req.url === '/qr') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        if (lastQR) {
            return res.end(`<html><head><meta charset="UTF-8"><title>Escanear QR</title></head><body style="font-family:sans-serif;text-align:center;margin-top:50px;"><h2>Escanea este QR con WhatsApp</h2><img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(lastQR)}" /></body></html>`);
        } else {
            return res.end(`<html><head><meta charset="UTF-8"><title>Estado de WhatsApp</title></head><body style="font-family:sans-serif;text-align:center;margin-top:50px;"><h2>WhatsApp ya está conectado o iniciando...</h2><p>No hay código QR pendiente de escaneo.</p></body></html>`);
        }
    }

    else if (req.method === 'POST' && req.url === '/send-message') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const payload = JSON.parse(body);
                if (!payload.phone || !payload.message) {
                    res.writeHead(400); 
                    return res.end(JSON.stringify({ error: "Missing phone or message" }));
                }

                console.log(`[HTTP IN] Enviando mensaje proactivo a ${payload.phone}`);
                // Inyectamos marca de agua para que no se auto-lea si es el mismo numero
                await client.sendMessage(payload.phone, '\u200B' + payload.message);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (err) {
                console.error(`[HTTP IN] Error: `, err.message);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
    } else {
        res.writeHead(404);
        res.end();
    }
});

const OUTBOUND_PORT = 5007;
server.listen(OUTBOUND_PORT, () => {
    console.log(`📡 Servidor de salida (Outbound) escuchando en puerto ${OUTBOUND_PORT}`);
});
