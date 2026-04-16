const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function fixBotSource() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        // Write improved bot-wa.js with disconnect handling + auto-restart
        const newBotSrc = `const { Client, LocalAuth } = require('whatsapp-web.js');
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
});

// Aviso de conexión exitosa
client.on('ready', () => {
    console.log('✅ Cliente conectado y listo. Esperando mensajes en WhatsApp...');
});

// ← NUEVO: Manejar desconexión y reiniciar el proceso
client.on('disconnected', (reason) => {
    console.error('[WA] Cliente desconectado. Razón:', reason);
    console.log('[WA] Reiniciando proceso en 3 segundos...');
    setTimeout(() => {
        process.exit(1); // PM2 reiniciará el proceso automáticamente
    }, 3000);
});

// ← NUEVO: Manejar fallo de autenticación
client.on('auth_failure', (msg) => {
    console.error('[WA] Auth failure:', msg);
    console.log('[WA] Limpiando sesión y reiniciando...');
    setTimeout(() => {
        process.exit(1);
    }, 3000);
});

// Listener de mensajes (incluye los enviados por uno mismo)
client.on('message_create', async msg => {
    // Evitar estados, grupos (con .g.us) o el propio broadcaster
    if (msg.from === 'status@broadcast' || msg.isGroupMsg || msg.from.includes('@g.us') || msg.to.includes('@g.us')) return;

    // ⛔ PREVENIR LOOPS INFINITOS: Ignorar las respuestas automáticas del sistema usando una marca de agua invisible (\\u200B) o emojis del sistema
    if (msg.fromMe && (msg.body.startsWith('\\u200B') || msg.body.startsWith('✅') || msg.body.startsWith('🤖') || msg.body.startsWith('📡') || msg.body.startsWith('🐛') || msg.body.startsWith('✂️'))) {
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
    console.log(\`\\n===========================================\`);
    console.log(\`[WA] Capturando mensaje de: \${phoneNum}\`);
    console.log(\`[WA] Texto: "\${msg.body}"\`);

    try {
        console.log(\`[HTTP] Enviando a Webhook n8n...\`);
        // Enviar payload a n8n
        const response = await axios.post(N8N_WEBHOOK_URL, {
            sessionId: msg.from,
            phone: msg.from,
            body: msg.body,
            timestamp: msg.timestamp
        });

        console.log(\`[HTTP] Respuesta n8n: Estado \${response.status}\`);
        console.log(\`[HTTP] Data Recibida:\`, JSON.stringify(response.data));

        // Si n8n (o Gemini) decide contestarle al usuario, lo mandará en la propiedad "response" del último nodo
        // Le inyectamos una "marca de agua invisible" (Zero-Width Space) al principio para que el listener sepa que es del bot y no del humano
        if (response.data && response.data.response) {
            console.log(\`[WA] Respondiendo al chat con: "\${response.data.response}"\`);
            msg.reply('\\u200B' + response.data.response);
        } else {
            console.log(\`[WA] Silencio (n8n no devolvió campo response)\`);
        }

    } catch (error) {
        console.error('Error puenteando a n8n:', error.message);
    }
});

client.initialize();
`;

        // Write the new bot source
        await ssh.execCommand('cp /opt/crm-cannabis/bot-wa.js /opt/crm-cannabis/bot-wa.js.bak');
        await ssh.putContent(newBotSrc, '/opt/crm-cannabis/bot-wa.js');
        console.log("New bot-wa.js written to VPS");

        // Restart bot
        console.log("Restarting bot...");
        await ssh.execCommand('pm2 restart whatsapp-bot');
        await new Promise(r => setTimeout(r, 12000));

        console.log("=== Bot log after restart ===");
        const out = await ssh.execCommand('tail -n 15 /root/.pm2/logs/whatsapp-bot-out.log');
        console.log(out.stdout);

        console.log("=== PM2 status ===");
        const pm2 = await ssh.execCommand('pm2 list');
        console.log(pm2.stdout);

        ssh.dispose();
    } catch(e) {
        console.error(e.message);
        if (ssh) ssh.dispose();
    }
}
fixBotSource();
