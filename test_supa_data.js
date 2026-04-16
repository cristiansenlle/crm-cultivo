const http = require('http');
const https = require('https');

const SUPABASE_URL = 'opnjrzixsrizdnphbjnq.supabase.co';
// Obteniendo la key del local
const fs = require('fs');
let SUPABASE_KEY = '';
try {
    const clientConfig = fs.readFileSync('./supabase-client.js', 'utf8');
    const keyMatch = clientConfig.match(/const SUPABASE_ANON_KEY = "(.*?)"/);
    if (keyMatch) SUPABASE_KEY = keyMatch[1];
} catch (e) {
    console.warn("Could not read auth key", e);
}

async function supaFetch(path, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: SUPABASE_URL,
            path: '/rest/v1/' + path,
            method: method,
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            }
        };

        const req = https.request(options, res => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                if(res.statusCode >= 400) return reject(new Error(`Supabase Error ${res.statusCode}: ` + data));
                resolve(data ? JSON.parse(data) : null);
            });
        });

        req.on('error', e => reject(e));
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

function fuzzyMatch(lookup, targetList) {
    if (!lookup) return null;
    const normalize = str => {
        if (!str) return '';
        return String(str).toLowerCase().replace(/[^a-z0-9áéíóúñ]/g, ' ').replace(/\\s+/g, ' ').trim();
    };
    
    const lLower = normalize(lookup);
    let bestMatch = null;
    let highestScore = 0;
    
    for (const item of (targetList || [])) {
        if (!item || !item.name) continue;
        const iLower = normalize(item.name);
        if (lLower === iLower) return item;
        
        let score = 0;
        const words = lLower.split(' ');
        for(let w of words) {
            if(w.length > 2 && iLower.includes(w)) score++;
        }
        if (score > highestScore) {
            highestScore = score;
            bestMatch = item;
        }
    }
    return highestScore >= 1 ? bestMatch : null;
}

async function test() {
    try {
        const { NodeSSH } = require('node-ssh');
        const ssh = new NodeSSH();
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' });
        const log = await ssh.execCommand('tail -n 100 /root/.pm2/logs/bot-agronomy-server-out.log');
        console.log(log.stdout);
        ssh.dispose();
    } catch(e) {}
}
test();
