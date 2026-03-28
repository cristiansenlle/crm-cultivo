const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkNodes() {
    try {
        await ssh.connect({ 
            host: '109.199.99.126', 
            username: 'root', 
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod' 
        });

        const execId = 283;
        
        console.log(`--- Checking nodes for execution: ${execId} ---`);
        // We use a small JS script on the server to parse the JSON and just list the keys (node names)
        const checkJs = `
            const fs = require('fs');
            const data = JSON.parse(fs.readFileSync('/tmp/exec_${execId}.json', 'utf8'));
            console.log(Object.keys(data.resultData.runData).join(', '));
        `;
        await ssh.execCommand(`echo "${checkJs.replace(/"/g, '\\"')}" > /tmp/inspect_nodes.js`);
        const res = await ssh.execCommand('node /tmp/inspect_nodes.js');
        
        console.log('Executed nodes:', res.stdout);

        ssh.dispose();
    } catch (err) {
        console.error('Check failed:', err.message);
    }
}

checkNodes();
