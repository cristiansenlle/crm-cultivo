// Fix the N8N bot workflow: replace ALL test Supabase URLs/keys with production ones
const { NodeSSH } = require('node-ssh');
const fs = require('fs');

const ssh = new NodeSSH();

const OLD_URL = 'dvvfdsaqvcyftaaronhd';
const OLD_KEY = 'HIDDEN_SECRET_BY_AI';

const NEW_URL = 'opnjrzixsrizdnphbjnq';
const NEW_KEY = 'HIDDEN_SECRET_BY_AI';

async function fixBotDB() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    // Read the workflow nodes JSON
    await ssh.execCommand(`sqlite3 /root/.n8n/database.sqlite "SELECT nodes FROM workflow_entity WHERE id='scpZdPe5Cp4MG98G';" > /root/bot_nodes_fix.json`);
    await ssh.getFile('bot_nodes_fix.json', '/root/bot_nodes_fix.json');

    console.log('Read workflow nodes. Patching...');

    let nodesText = fs.readFileSync('bot_nodes_fix.json', 'utf8');

    // Count occurrences before
    const countBefore = (nodesText.match(new RegExp(OLD_URL, 'g')) || []).length;
    console.log(`Found ${countBefore} occurrences of old Supabase URL`);

    // Replace old URL subdomain
    nodesText = nodesText.split(OLD_URL).join(NEW_URL);

    // Replace old API key (both in apikey and Authorization bearer)
    nodesText = nodesText.split(OLD_KEY).join(NEW_KEY);

    // Count occurrences after
    const countAfter = (nodesText.match(new RegExp(OLD_URL, 'g')) || []).length;
    console.log(`After replacement: ${countAfter} remaining old URLs (should be 0)`);

    // Write the patched nodes
    fs.writeFileSync('bot_nodes_patched.json', nodesText);

    // Parse to verify valid JSON
    const parsed = JSON.parse(nodesText);
    console.log(`✅ JSON valid. ${parsed.length} nodes total.`);

    // Also remove the temporary DDL nodes we added
    const cleanedNodes = parsed.filter(n => !['temp-webhook-sql', 'temp-pg-ddl'].includes(n.id));
    console.log(`Removed temp nodes. Now ${cleanedNodes.length} nodes.`);

    // Prepare SQL update
    const newNodesStr = JSON.stringify(cleanedNodes).replace(/'/g, "''");
    fs.writeFileSync('patch_workflow.sql', `UPDATE workflow_entity SET nodes = '${newNodesStr}' WHERE id = 'scpZdPe5Cp4MG98G';`);

    await ssh.putFile('patch_workflow.sql', '/root/patch_workflow.sql');
    const update = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite < /root/patch_workflow.sql 2>&1');
    console.log('SQL update:', update.stdout || '(no output = success)');
    console.log('SQL error:', update.stderr || '(none)');

    // Restart N8N
    await ssh.execCommand('pm2 restart n8n-service');
    console.log('✅ N8N restarted with production Supabase credentials');

    ssh.dispose();
}

fixBotDB().catch(console.error);
