const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function checkCreds() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    // Check active workflows to ensure we patched the right one
    const activeWs = await ssh.execCommand(`sqlite3 /root/.n8n/database.sqlite "SELECT id, name FROM workflow_entity WHERE active=1;"`);
    console.log('Active Workflows:\n', activeWs.stdout);

    // Get the Postgres credentials to check host
    // N8N stores credentials encrypted. We can export them using CLI if password is known, or check raw database contents.
    // Rather than decrypting, let's just see if the host strings "dvvfdsaqvcyftaaronhd" or "opnjrzixsrizdnphbjnq" are in the raw encrypted blob (since sometimes keys/hostnames aren't fully encrypted if they are in the 'data' column vs 'secret' column, but usually they are).
    // Let's use N8N CLI to list credentials or export them.
    console.log('\nChecking if n8n CLI can export credentials (needs encryption key)...');

    // As seen in previous get_pg_creds.js, N8N stores encryption key in ~/.n8n/config
    const exportCreds = await ssh.execCommand('cd /root/.n8n && n8n export:credentials --all --backup --output=/root/creds_backup.json');
    console.log('Export creds status:', exportCreds.stdout, exportCreds.stderr);

    // If exported, read the file and look for test DB URLs
    const readCreds = await ssh.execCommand('cat /root/creds_backup.json | grep -i "supabase\\|dvvf\\|opnj"');
    console.log('\nCreds backup grep results:\n', readCreds.stdout);

    const readEnv = await ssh.execCommand('cat /etc/systemd/system/n8n-service.service | grep -i "supabase\\|dvvf\\|opnj"');
    console.log('\nSystemd Env grep results:\n', readEnv.stdout);

    const readEnvSys = await ssh.execCommand('env | grep -i "supabase\\|dvvf\\|opnj"');
    console.log('\nGlobal Env grep results:\n', readEnvSys.stdout);

    ssh.dispose();
}

checkCreds().catch(console.error);
