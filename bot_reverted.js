process.on('uncaughtException', err => console.error('UNCAUGHT:', err));
process.on('unhandledRejection', err => console.error('UNHANDLED:', err));
const { Client, LocalAuth } = require('whatsapp-web.js');
const path = require('path');
const fs = require('fs');
const qrcode = require('qrcode-terminal');
const axios = require('axios');

const STATUS_FILE = '/opt/crm-cannabis/status.json';

function updateStatus(status, details = {}) {
    try {
        const data = {
            status,
            timestamp: new Date().toISOString(),
            ...details
        };
        fs.writeFileSync(STATUS_FILE, JSON.stringify(data, null, 2));
        console.log(`[STATUS] Updated to ${status}`);
    } catch (e) {
        console.error('[STATUS] Error writing status file:', e.message);
    }
}

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

const ADMIN_NUMS = [
    '5491156548820'
];

client.on('qr', (qr) => {
    console.log('[WA] QR Received');
    updateStatus('awaiting_qr');
    qrcode.generate(qr, { small: true });
    fs.writeFileSync('/opt/crm-cannabis/qr_code.txt', qr);
});

client.on('authenticated', () => {
    console.log('✅ Autenticado correctamente.');
    updateStatus('authenticated');
});

client.on('auth_failure', (msg) => {
    console.error('❌ Falla de autenticación:', msg);
    updateStatus('auth_failure', { error: msg });
});

client.on('ready', () => {
    console.log('✅ Cliente conectado y listo.');
    updateStatus('online', { 
        wid: client.info.wid._serialized,
        pushname: client.info.pushname 
    });
    console.log('🤖 Bot ID:', client.info.wid._serialized);
    console.log('Esperando mensajes en WhatsApp...');
});

client.on('disconnected', (reason) => {
    console.warn('⚠️ Cliente desconectado:', reason);
    updateStatus('offline', { reason });
});

client.on('message_create', async (msg) => {
    const sender = msg.from.split('@')[0];
    const isAdmin = ADMIN_NUMS.some(num => sender.includes(num));
    const isSelfChat = msg.from === msg.to;

    console.log('[DEBUG RAW MSG]', msg.from, msg.to, msg.body, msg.fromMe);
    if (!isAdmin || !isSelfChat || msg.from.includes('@g.us') || msg.from.includes('@broadcast')) {
        return;
    }

    console.log(`\n===========================================`);
    console.log(`[WA] Mensaje de ADMIN: ${msg.from}`);
    console.log(`[WA] Texto: "${msg.body}"`);

    try {
        const response = await axios.post(N8N_WEBHOOK_URL, {
            sessionId: msg.from,
            phone: msg.from,
            body: msg.body,
            timestamp: msg.timestamp,
            fromMe: msg.fromMe
        });

        if (response.data && response.data.response) {
            console.log(`[WA] Respondiendo con: "${response.data.response}"`);
            client.sendMessage(msg.from, '\u200B' + response.data.response);
        }
    } catch (error) {
        console.error('Error puenteando a n8n:', error.message);
    }
});

client.initialize();