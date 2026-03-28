const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

(async () => {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' });
        
        console.log('--- Checking Nodes in k2d and scp ---');
        
        const resK2D = await ssh.execCommand("sqlite3 -json /root/.n8n/database.sqlite \"SELECT nodes FROM workflow_entity WHERE id = 'k2d7SbuTEeGHCDzR';\"");
        const nodesK2D = JSON.parse(resK2D.stdout || '[]');
        console.log('k2d Nodes Count:', nodesK2D[0]?.nodes ? JSON.parse(nodesK2D[0].nodes).length : 0);

        const resSCP = await ssh.execCommand("sqlite3 -json /root/.n8n/database.sqlite \"SELECT nodes FROM workflow_entity WHERE id = 'scpZdPe5Cp4MG98G';\"");
        const nodesSCP = JSON.parse(resSCP.stdout || '[]');
        console.log('scp Nodes Count:', nodesSCP[0]?.nodes ? JSON.parse(nodesSCP[0].nodes).length : 0);

        ssh.dispose();
    } catch (err) {
        console.error('Check nodes failed:', err.message);
    }
})();
