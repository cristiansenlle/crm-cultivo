const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function getLiveNodes() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        // Create a bash script on the remote server
        const bashScript = `#!/bin/bash
sqlite3 /root/.n8n/database.sqlite "SELECT nodes FROM workflow_entity WHERE id='scpZdPe5Cp4MG98G';" > /tmp/nodes_verify.json
sqlite3 /root/.n8n/database.sqlite "SELECT connections FROM workflow_entity WHERE id='scpZdPe5Cp4MG98G';" > /tmp/conns_verify.json
        `;
        
        await ssh.execCommand('cat > /tmp/get_nodes.sh', { stdin: bashScript });
        await ssh.execCommand('chmod +x /tmp/get_nodes.sh');
        
        const res = await ssh.execCommand('/tmp/get_nodes.sh');
        console.log("SH output:", res.stdout, res.stderr);

        // Download
        await ssh.getFile('nodes_verify.json', '/tmp/nodes_verify.json');
        await ssh.getFile('conns_verify.json', '/tmp/conns_verify.json');
        console.log("Downloaded nodes_verify.json and conns_verify.json.");

        ssh.dispose();
    } catch(e) {
        console.error(e);
        ssh.dispose();
    }
}
getLiveNodes();
