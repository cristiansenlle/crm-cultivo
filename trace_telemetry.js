const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

(async () => {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        const res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT nodes, connections FROM workflow_entity WHERE id=\'scpZdPe5Cp4MG98G\';"');
        const output = res.stdout;
        
        const connections = JSON.parse(output.split('|')[1] || '{}');
        const nodes = JSON.parse(output.split('|')[0] || '[]');

        console.log('--- Telemetry Input Connections (Webhook Telemetry) ---');
        const inputNext = connections['Webhook Telemetry'];
        if (inputNext) {
            console.log(JSON.stringify(inputNext.main[0], null, 2));
        }

        console.log('\n--- Telemetry Retrieval Connections (Webhook Get Telemetry) ---');
        const getNext = connections['Webhook Get Telemetry (WhatsApp)'];
        if (getNext) {
            console.log(JSON.stringify(getNext.main[0], null, 2));
        }

        console.log('\n--- Node Credential Detail ---');
        const pgNodes = nodes.filter(n => n.type === 'n8n-nodes-base.postgres' && !n.disabled);
        pgNodes.forEach(n => {
            console.log(`Node: ${n.name}, Creds: ${JSON.stringify(n.credentials)}`);
        });

    } catch (err) {
        console.error('Error:', err);
    } finally {
        ssh.dispose();
    }
})();
