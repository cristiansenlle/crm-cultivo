const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

(async () => {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' });
        const res = await ssh.execCommand("sqlite3 -json /root/.n8n/database.sqlite \"SELECT nodes, connections FROM workflow_entity WHERE id = 'scpZdPe5Cp4MG98G';\"");
        const data = JSON.parse(res.stdout || '[]');
        if (data.length > 0) {
            const nodes = JSON.parse(data[0].nodes);
            const formatNode = nodes.find(n => n.name === 'Format WA Response');
            if (formatNode) {
                console.log('--- FORMAT WA RESPONSE CODE ON SERVER ---');
                console.log(formatNode.parameters.jsCode);
            } else {
                console.log('Format WA Response node not found in record!');
            }
        } else {
            console.log('Workflow record not found!');
        }
        ssh.dispose();
    } catch (err) {
        console.error(err);
    }
})();
