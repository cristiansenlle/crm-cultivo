const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const fs = require('fs');

(async () => {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' });
        
        console.log('--- FORCING DATABASE PATCH (V2 - FIXED SHELL EXPANSION) ---');
        
        // Load the local definitive JSON
        const localData = JSON.parse(fs.readFileSync('wf_definitive_restoration.json', 'utf8'))[0];
        const nodesJson = JSON.stringify(localData.nodes);
        const connectionsJson = JSON.stringify(localData.connections);

        // USE QUOTED EOF TO PREVENT SHELL EXPANSION OF $VARS
        console.log('Writing temp files on server...');
        await ssh.execCommand("cat <<'EOF' > /tmp/nodes.json\n" + nodesJson + "\nEOF");
        await ssh.execCommand("cat <<'EOF' > /tmp/connections.json\n" + connectionsJson + "\nEOF");

        console.log('Executing SQL Update...');
        const updateCmd = "sqlite3 /root/.n8n/database.sqlite \"UPDATE workflow_entity SET nodes = (SELECT readfile('/tmp/nodes.json')), connections = (SELECT readfile('/tmp/connections.json')), active = 1 WHERE id = 'scpZdPe5Cp4MG98G';\"";
        const res = await ssh.execCommand(updateCmd);
        console.log('Update Status:', res.stdout || 'OK');

        // Cleanup
        await ssh.execCommand('rm /tmp/nodes.json /tmp/connections.json');

        console.log('Restarting n8n-service...');
        await ssh.execCommand('pm2 restart n8n-service');

        console.log('Patch complete. Waiting for restart...');
        await new Promise(r => setTimeout(r, 5000));
        
        ssh.dispose();
    } catch (err) {
        console.error('Patch failed:', err.message);
    }
})();
