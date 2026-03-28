const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

const OLD_URL = "dvvfdsaqvcyftaaronhd";
const NEW_URL = "opnjrzixsrizdnphbjnq";

const OLD_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2dmZkc2FxdmN5ZnRhYXJvbmhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUyMDg5MTQsImV4cCI6MjA2MDc4NDkxNH0.pB0X6U_h9kQj7T1Y2H_xQ4tP8xV1lU2L1rY2vE6P1I8"; // This was an old jwt for the old db, but actually there might be multiple ones since it's an anon key.
// Safer way: match any eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... and replace it.

const PROD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wbmpyeml4c3JpemRucGhiam5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1Nzc2NTAsImV4cCI6MjA4ODE1MzY1MH0.Hx6t3ZFZj6TGei8c99bfdwUfJ1ce5XaGM4IuUBJUeC8';

async function patchActive() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    console.log('Downloading actual live workflow (scpZdPe5Cp4MG98G)...');
    let res = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"SELECT nodes FROM workflow_entity WHERE id = 'scpZdPe5Cp4MG98G';\"");

    let str = res.stdout;

    // Replace URL
    str = str.split(OLD_URL).join(NEW_URL);

    // Replace API keys. They all start with eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9. 
    const jwtRegex = /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/g;
    str = str.replace(jwtRegex, PROD_KEY);

    // Patch "PG Insert WA TM" query
    str = str.replace(
        /INSERT INTO daily_telemetry \(batch_id, temperature_c, humidity_percent, vpd_kpa, created_at\) VALUES \('\{\{\$json.room\}\}', \{\{\$json.temp\}\}, \{\{\$json.humidity\}\}, \{\{\$json.vpd\}\}, NOW\(\)\) RETURNING id;/g,
        "INSERT INTO daily_telemetry (batch_id, room_id, temperature_c, humidity_percent, vpd_kpa, created_at) VALUES ('{{$json.room}}', '{{$json.room}}', {{$json.temp}}, {{$json.humidity}}, {{$json.vpd}}, NOW()) RETURNING id;"
    );

    // Robust replacement for Extract TM Data
    const oldExtract = '"name": "room", "value": "={{$json.body.body.split(\' \')[3] || \'\'}}"';
    const newExtract = '"name": "room", "value": "={{$json.body.body.split(\' \')[3] || \'\'}}" }, { "name": "room_id", "value": "={{$json.body.body.split(\' \')[3] || \'\'}}"';
    str = str.split(oldExtract).join(newExtract);

    // Robust replacement for tool mappings
    const oldTool = '"name": "batch_id", "value": "{sala_o_lote}"';
    const newTool = '"name": "batch_id", "value": "{sala_o_lote}" }, { "name": "room_id", "value": "{sala_o_lote}"';
    str = str.split(oldTool).join(newTool);

    // Create a local backup of the applied JSON
    fs.writeFileSync('THE_TRUTH_live_nodes_patched.json', str);

    // Remote temp file creation requires escaping single quotes if using bash, but cat > is safer with raw input
    console.log('Uploading patched JSON to server...');
    // Because the string might contain single quotes, we pass it via stdin
    await ssh.execCommand('cat > /root/temp_nodes.json', {
        stdin: str + '\n'
    });

    const sqlScript = `
        UPDATE workflow_entity 
        SET nodes = readfile('/root/temp_nodes.json') 
        WHERE id = 'scpZdPe5Cp4MG98G';
    `;

    await ssh.execCommand(`cat > /root/update_prompt.sql`, { stdin: sqlScript + '\n' });

    console.log('Running SQLite update...');
    const result = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite < /root/update_prompt.sql');

    if (result.stderr) {
        console.error('SQL Error:', result.stderr);
    } else {
        console.log('Workflow Updated Successfully!');
    }

    console.log('Restarting N8N container...');
    await ssh.execCommand('docker restart n8n-docker-n8n-1');
    console.log('N8N restarted.');

    ssh.dispose();
}

patchActive().catch(console.error);
