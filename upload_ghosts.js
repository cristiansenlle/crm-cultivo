const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

const serverScript = `
const fs = require('fs');
const { execSync } = require('child_process');

const wfArray = JSON.parse(fs.readFileSync('/tmp/fixed_ghosts.json', 'utf8'));
const wf = wfArray[0] || wfArray;

// We only need to update the 'nodes' and 'connections' column.
const nodesJson = JSON.stringify(wf.nodes).replace(/'/g, "''");
const connectionsJson = JSON.stringify(wf.connections).replace(/'/g, "''");

const sql = "UPDATE workflow_entity SET nodes='" + nodesJson + "', connections='" + connectionsJson + "' WHERE id='scpZdPe5Cp4MG98G';";
fs.writeFileSync('/tmp/update_ghosts.sql', sql);

console.log('Executing SQL update...');
execSync('sqlite3 /root/.n8n/database.sqlite < /tmp/update_ghosts.sql');
console.log('Database updated.');

console.log('Restarting N8N...');
execSync('pm2 restart n8n-service');
`;

fs.writeFileSync('server_update_ghosts.js', serverScript);

async function run() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    console.log('Uploading fixed workflow...');
    await ssh.putFile('fixed_ghosts.json', '/tmp/fixed_ghosts.json');
    console.log('✅ Workflow uploaded');

    console.log('Uploading update script...');
    await ssh.putFile('server_update_ghosts.js', '/tmp/update_wf_ghosts.js');

    console.log('Running update on server...');
    const res = await ssh.execCommand('node /tmp/update_wf_ghosts.js');
    console.log(res.stdout);
    if (res.stderr) console.error(res.stderr);

    ssh.dispose();
}

run().catch(console.error);
