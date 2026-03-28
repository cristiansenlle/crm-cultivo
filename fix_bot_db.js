const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

const OLD_SUPA_ID = 'dvvfdsaqvcyftaaronnhd';
const NEW_SUPA_ID = 'opnjrzixsrizdnphbjnq';

async function fixBotDb() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    // Find all files referencing the OLD (test) Supabase project
    console.log('=== Searching for OLD test Supabase references ===');
    const search = await ssh.execCommand(`grep -rn "${OLD_SUPA_ID}" /opt/crm-cannabis/ 2>/dev/null`);
    console.log(search.stdout || '(none found in /opt/crm-cannabis/)');

    // Search in N8N workflow config
    const searchN8n = await ssh.execCommand(`grep -rn "${OLD_SUPA_ID}" /root/.n8n/ 2>/dev/null | head -20`);
    console.log('In .n8n dir:', searchN8n.stdout.substring(0, 1000) || '(none)');

    // Search in sqlite DB (workflow nodes, credentials)
    const searchSqlite = await ssh.execCommand(`sqlite3 /root/.n8n/database.sqlite "SELECT id, name FROM credentials_entity;" 2>/dev/null`);
    console.log('Credentials in N8N DB:', searchSqlite.stdout);

    // Also check workflow nodes for old URL
    const searchWorkflow = await ssh.execCommand(`sqlite3 /root/.n8n/database.sqlite "SELECT id, name FROM workflow_entity;" 2>/dev/null`);
    console.log('Workflows:', searchWorkflow.stdout);

    ssh.dispose();
}

fixBotDb().catch(console.error);
