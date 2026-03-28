const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function verify() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        console.log('--- TRIGGERING N8N WEBHOOK FROM SERVER ---');
        // We use localhost:5678 because that's n8n's default port inside the server (or mapped)
        const curlCmd = `curl -X POST http://localhost:5678/webhook/wa-inbound -H 'Content-Type: application/json' -d '{"body": {"body": "TM 24.5 55 sala-veg-2", "phone": "5491112345678"}}'`;
        const curlRes = await ssh.execCommand(curlCmd);
        console.log('Curl Result:', curlRes.stdout);

        console.log('\n--- CHECKING SUPABASE FOR RECENT INSERT ---');
        const checkCmd = `node -e "const axios = require('axios'); const k = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wbmpyeml4c3JpemRucGhiam5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1Nzc2NTAsImV4cCI6MjA4ODE1MzY1MH0.Hx6t3ZFZj6TGei8c99bfdwUfJ1ce5XaGM4IuUBJUeC8'; axios.get('https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/daily_telemetry?order=created_at.desc&limit=1', { headers: { apikey: k, Authorization: 'Bearer ' + k } }).then(r => console.log(JSON.stringify(r.data[0], null, 2)))"`;
        const checkRes = await ssh.execCommand(checkCmd);
        console.log('Latest Supabase Entry:', checkRes.stdout);
        
        ssh.dispose();
    } catch (e) {
        console.error(e);
    }
}

verify();
