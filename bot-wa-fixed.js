const { Client, LocalAuth } = require('whatsapp-web.js');
const path = require('path');
const fs = require('fs');

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

const qrcode = require('qrcode-terminal');
const axios = require('axios');

const N8N_WEBHOOK_URL = 'http://109.199.99.126:5678/webhook/wa-inbound';

client.on('qr', (qr) => {
    console.log('');
    console.log('📱 ¡ESCANEA ESTE CÓDIGO QR CON LA APP DE WHATSAPP (Dispositivos Vinculados)! 📱');
    console.log('');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ Cliente conectado y listo.');
    console.log(`🤖 Bot ID: ${client.info.wid._serialized}`);
    console.log(`📱 Bot Number: ${client.info.wid.user}`);
    console.log('Esperando mensajes en WhatsApp...');
});

client.on('disconnected', (reason) => {
    console.error('[WA] Cliente desconectado. Razón:', reason);
    setTimeout(() => { process.exit(1); }, 3000);
});

client.on('auth_failure', (msg) => {
    console.error('[WA] Auth failure:', msg);
    setTimeout(() => { process.exit(1); }, 3000);
});

client.on('message_create', async msg => {
    // RAW DEBUG LOG
    console.log(`[DEBUG] Event message_create fired. fromMe: ${msg.fromMe}, from: ${msg.from}, to: ${msg.to}, body: "${msg.body.substring(0, 20)}..."`);

    if (msg.from === 'status@broadcast' || msg.isGroupMsg || msg.from.includes('@g.us') || msg.to.includes('@g.us')) {
        return;
    }

    if (msg.fromMe && (msg.body.startsWith('\u200B') || msg.body.startsWith('✅') || msg.body.startsWith('🤖') || msg.body.startsWith('📡') || msg.body.startsWith('🐛') || msg.body.startsWith('✂️'))) {
        return;
    }

    let phoneNum = msg.from;
    if (msg.fromMe) phoneNum = msg.to;

    // Admin Numbers (JID and LID)
    const ADMIN_NUMS = [
        '5491156548820@c.us',
        '228612670267594@lid'
    ];
    
    const isAdmin = ADMIN_NUMS.some(num => phoneNum.includes(num.split('@')[0]));

    if (!isAdmin) {
        console.log(`[DEBUG] Ignored: Not admin (${phoneNum})`);
        return;
    }

    console.log(`\n===========================================`);
    console.log(`[WA] Capturando mensaje de: ${phoneNum}`);
    console.log(`[WA] Texto: "${msg.body}"`);

    try {
        console.log(`[HTTP] Enviando a Webhook n8n...`);
        const response = await axios.post(N8N_WEBHOOK_URL, {
            sessionId: msg.from,
            phone: msg.from,
            body: msg.body,
            timestamp: msg.timestamp
        });

        console.log(`[HTTP] Respuesta n8n: Estado ${response.status}`);

        if (response.data && response.data.response) {
            console.log(`[WA] Respondiendo con: "${response.data.response}"`);
            client.sendMessage(msg.from, '\u200B' + response.data.response);
        }
    } catch (error) {
        console.error('Error puenteando a n8n:', error.message);
    }
});

client.initialize();
