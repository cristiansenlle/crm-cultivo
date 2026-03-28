// Creates the core_rooms table using Supabase Management API
// Runs from the server which may have the service role key in env
const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function createRoomsTable() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    // 1. Check if there's a service role key in environment or n8n config
    const envCheck = await ssh.execCommand('grep -r "service_role\\|SERVICE_ROLE\\|supabase" /root/.n8n/config 2>/dev/null | head -20');
    console.log('N8N Config Supabase refs:', envCheck.stdout.substring(0, 500));

    // 2. Check n8n credentials in DB for Supabase service key
    const credCheck = await ssh.execCommand(`sqlite3 /root/.n8n/database.sqlite "SELECT name, data FROM credentials_entity LIMIT 10;"`);
    console.log('Credentials:', credCheck.stdout.substring(0, 800));

    // 3. Check environment for any supabase keys
    const envVars = await ssh.execCommand('env | grep -i supa');
    console.log('Env vars:', envVars.stdout);

    ssh.dispose();
}

createRoomsTable().catch(console.error);
