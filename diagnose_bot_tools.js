const { NodeSSH } = require('node-ssh');
const https = require('https');
const ssh = new NodeSSH();

const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wbmpyeml4c3JpemRucGhiam5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1Nzc2NTAsImV4cCI6MjA4ODE1MzY1MH0.Hx6t3ZFZj6TGei8c99bfdwUfJ1ce5XaGM4IuUBJUeC8';

function supaGet(path) {
    return new Promise((resolve, reject) => {
        https.get(`https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/${path}`, {
            headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
        }, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => resolve(d)); }).on('error', reject);
    });
}

async function main() {
    // 1. Check actual rooms table structure
    const rooms = await supaGet('core_rooms?limit=10');
    console.log('=== SALAS ===');
    console.log(rooms);

    // 2. Check batches
    const batches = await supaGet('core_batches?select=id,status,location&order=id&limit=10');
    console.log('\n=== LOTES ===');
    console.log(batches);

    // 3. Check tool URLs in the live workflow
    ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' }).then(async () => {
        const keyRes = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"SELECT apiKey FROM user_api_keys LIMIT 1;\"");
        const apiKey = keyRes.stdout.trim();
        const wfRes = await ssh.execCommand(`curl -s http://127.0.0.1:5678/api/v1/workflows/scpZdPe5Cp4MG98G -H "X-N8N-API-KEY: ${apiKey}"`);
        const wf = JSON.parse(wfRes.stdout);

        // Find all tool nodes related to consultar_salas and consultar_lotes
        console.log('\n=== TOOL NODES (consultar/reportar) ===');
        wf.nodes.forEach(n => {
            if (n.name && (n.name.toLowerCase().includes('consultar') || n.name.toLowerCase().includes('sala') || n.name.toLowerCase().includes('lote') || n.name.toLowerCase().includes('reportar') || n.name.toLowerCase().includes('telemetria'))) {
                console.log(`\n[${n.name}] type: ${n.type}`);
                const params = n.parameters || {};
                if (params.url) console.log('  URL:', params.url);
                if (params.toolDescription) console.log('  desc:', params.toolDescription?.substring(0, 100));
                const body = JSON.stringify(params).substring(0, 400);
                console.log('  params:', body);
            }
        });

        ssh.dispose();
    });
}

main().catch(console.error);
