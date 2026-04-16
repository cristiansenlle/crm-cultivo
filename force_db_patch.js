const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const fs = require('fs');

(async () => {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' });
        
        console.log('--- FORCING DATABASE PATCH ---');
        
        // Load the local definitive JSON
        const localData = JSON.parse(fs.readFileSync('wf_definitive_restoration.json', 'utf8'))[0];
        const nodesJson = JSON.stringify(localData.nodes);
        const connectionsJson = JSON.stringify(localData.connections);

        // We'll use a temporary file on the server to hold the large JSON strings to avoid shell escaping hell
        await ssh.execCommand('cat <<EOF > /tmp/nodes.json\n' + nodesJson + '\nEOF');
        await ssh.execCommand('cat <<EOF > /tmp/connections.json\n' + connectionsJson + '\nEOF');

        console.log('Executing SQL Update...');
        // Use sqlite3 to read from the temp files and update the record
        const updateCmd = "sqlite3 /root/.n8n/database.sqlite \"UPDATE workflow_entity SET nodes = (SELECT readfile('/tmp/nodes.json')), connections = (SELECT readfile('/tmp/connections.json')), active = 1 WHERE id = 'scpZdPe5Cp4MG98G';\"";
        const res = await ssh.execCommand(updateCmd);
        console.log('Update Status:', res.stdout || 'OK');

        // Cleanup temp files
        await ssh.execCommand('rm /tmp/nodes.json /tmp/connections.json');

        console.log('Restarting n8n-service...');
        await ssh.execCommand('pm2 restart n8n-service');

        console.log('Patch complete.');
        ssh.dispose();
    } catch (err) {
        console.error('Patch failed:', err.message);
    }
})();
