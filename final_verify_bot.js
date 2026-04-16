const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const axios = require('axios');

async function test() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });
        
        console.log('--- SENDING TEST MESSAGE (TM 26.5 60 2de32401) ---');
        const curlCmd = `curl -X POST http://localhost:5678/webhook/wa-inbound -H 'Content-Type: application/json' -d '{"body": {"body": "TM 26.5 60 2de32401", "phone": "5491112345678"}}'`;
        const curlRes = await ssh.execCommand(curlCmd);
        console.log('Curl Result:', curlRes.stdout);

        console.log('\nWaiting 3 seconds for processing...');
        await new Promise(r => setTimeout(r, 3000));

        console.log('--- CHECKING DB ---');
        const k = 'HIDDEN_SECRET_BY_AI';
        const res = await axios.get('https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/daily_telemetry?order=created_at.desc&limit=1', {
            headers: { 'apikey': k, 'Authorization': `Bearer ${k}` }
        });
        
        console.log(JSON.stringify(res.data[0], null, 2));

        if (res.data[0] && res.data[0].batch_id === '2de32401' && res.data[0].room_id) {
            console.log('\nSUCCESS: Data reached DB and has room_id mapping!');
        } else {
            console.log('\nNOTE: If data is empty, it might be waiting for AI confirmation or the tool failed to call.');
        }

        ssh.dispose();
    } catch (e) {
        console.error(e);
    }
}
test();
