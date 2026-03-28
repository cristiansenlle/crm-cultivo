const { NodeSSH } = require('node-ssh');
const fs = require('fs');

async function checkDb() {
    const ssh = new NodeSSH();
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });
        const script = `
const fetch = require('node-fetch');
const SUPABASE_URL = "https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/daily_telemetry?select=*";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wbmpyeml4c3JpemRucGhiam5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1Nzc2NTAsImV4cCI6MjA4ODE1MzY1MH0.Hx6t3ZFZj6TGei8c99bfdwUfJ1ce5XaGM4IuUBJUeC8";

fetch(SUPABASE_URL, {
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': \`Bearer \${SUPABASE_ANON_KEY}\` }
})
.then(res => res.json())
.then(data => console.log(JSON.stringify(data, null, 2)))
.catch(err => console.error(err));
`;
        fs.writeFileSync('temp_check_db.js', script);
        await ssh.putFile('temp_check_db.js', '/root/temp_check_db.js');
        const res = await ssh.execCommand('node /root/temp_check_db.js');
        console.log(res.stdout);
        ssh.dispose();
    } catch (err) {
        console.error(err);
    }
}

checkDb();
