const { Client, LocalAuth } = require('whatsapp-web.js');
const path = require('path');
const fs = require('fs');
const qrcode = require('qrcode-terminal');
const axios = require('axios');

try {
    const lockFile = path.join('/opt/crm-cannabis/.wwebjs_auth/session-bot/Default', 'SingletonLock');
    if (fs.existsSync(lockFile)) {
        fs.unlinkSync(lockFile);
        console.log('[INIT] Removed stale SingletonLock');
    }
} catch (e) { }

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

const N8N_WEBHOOK_URL = 'http://109.199.99.126:5678/webhook/wa-inbound';

// Specific number to allow
const ADMIN_NUMS = [
    '5491156548820'
];

client.on('qr', (qr) => {
    console.log('');
    console.log('📱 ¡ESCANEA ESTE CÓDIGO QR CON LA APP DE WHATSAPP (Dispositivos Vinculados)! 📱');
    console.log('');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ Cliente conectado y listo.');
    console.log('🤖 Bot ID:', client.info.wid._serialized);
    console.log('📱 Bot Number:', client.info.wid.user);
    console.log('Esperando mensajes en WhatsApp...');
});

client.on('message_create', async (msg) => {
    // Determine who is sending the message relative to the admin list
    const sender = msg.from.split('@')[0];
    const isAdmin = ADMIN_NUMS.some(num => sender.includes(num));

    if (!isAdmin) {
        // If it's not from admin, check if it's TO an admin (optional, depending on user preference)
        // But the user said "contestar solo a ese numero", so we'll filter by SENDER for capturing data.
        console.log(`[DEBUG] Ignored: Not from admin (${msg.from})`);
        return;
    }

    console.log(`\n===========================================`);
    console.log(`[WA] Capturando mensaje de ADMIN: ${msg.from}`);
    console.log(`[WA] Texto: "${msg.body}"`);

    try {
        console.log(`[HTTP] Enviando a Webhook n8n...`);
        const response = await axios.post(N8N_WEBHOOK_URL, {
            sessionId: msg.from,
            phone: msg.from,
            body: msg.body,
            timestamp: msg.timestamp,
            fromMe: msg.fromMe
        });

        console.log(`[HTTP] Respuesta n8n: Estado ${response.status}`);

        if (response.data && response.data.response) {
            console.log(`[WA] Respondiendo con: "${response.data.response}"`);
            // Always respond to the specific admin number
            client.sendMessage(msg.from, '\u200B' + response.data.response);
        }
    } catch (error) {
        console.error('Error puenteando a n8n:', error.message);
    }
});

client.initialize();
