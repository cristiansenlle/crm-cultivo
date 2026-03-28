const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const axios = require('axios');

async function test() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });
        
        console.log('--- 1. SENDING REPORT ---');
        const reportRes = await ssh.execCommand(`curl -X POST http://localhost:5678/webhook/wa-inbound -H 'Content-Type: application/json' -d '{"body": {"body": "TM 26.5 60 2de32401", "phone": "5491112345678"}}'`);
        console.log('Report Answer:', reportRes.stdout);

        console.log('\n--- 2. SENDING CONFIRMATION ---');
        const confirmRes = await ssh.execCommand(`curl -X POST http://localhost:5678/webhook/wa-inbound -H 'Content-Type: application/json' -d '{"body": {"body": "si", "phone": "5491112345678"}}'`);
        console.log('Confirm Answer:', confirmRes.stdout);

        console.log('\nWaiting 3 seconds for processing...');
        await new Promise(r => setTimeout(r, 4000));

        console.log('--- 3. CHECKING DB ---');
        const k = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wbmpyeml4c3JpemRucGhiam5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1Nzc2NTAsImV4cCI6MjA4ODE1MzY1MH0.Hx6t3ZFZj6TGei8c99bfdwUfJ1ce5XaGM4IuUBJUeC8';
        const res = await axios.get('https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/daily_telemetry?order=created_at.desc&limit=1', {
            headers: { 'apikey': k, 'Authorization': `Bearer ${k}` }
        });
        
        console.log(JSON.stringify(res.data[0], null, 2));

        if (res.data[0] && res.data[0].temperature_c == 26.5 && res.data[0].room_id) {
            console.log('\nSUCCESS: Data reached DB with room_id mapping!');
        } else {
            console.log('\nFAILURE: Data not found or missing room_id.');
        }

        ssh.dispose();
    } catch (e) {
        console.error(e);
    }
}
test();
