const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function run() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    console.log('Fetching active workflows from DB...');
    // We check which workflows are active
    const res = await ssh.execCommand('sqlite3 -header -csv /root/.n8n/database.sqlite "SELECT id, name, active FROM workflow_entity WHERE active=1;"');
    console.log('Active Workflows:', res.stdout);

    // Dump the nodes/connections of the one we care about
    await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"SELECT nodes, connections FROM workflow_entity WHERE id='scpZdPe5Cp4MG98G';\" > /tmp/db_wf.txt");
    await ssh.getFile('db_wf.txt', '/tmp/db_wf.txt');
    console.log('✅ Dump downloaded');

    ssh.dispose();

    // Analyze the dump
    const dump = fs.readFileSync('db_wf.txt', 'utf8').split('|');
    if (dump.length >= 2) {
        const nodes = JSON.parse(dump[0]);
        const connections = JSON.parse(dump[1]);

        const validNodes = new Set(nodes.map(n => n.name));
        let ghost = 0;
        for (const src in connections) {
            if (!validNodes.has(src)) ghost++;
            for (const type in connections[src]) {
                for (const out of connections[src][type]) {
                    for (const t of out) {
                        if (!validNodes.has(t.node)) ghost++;
                    }
                }
            }
        }
        console.log(`Database has ${nodes.length} nodes and ${ghost} ghost connections.`);

        const tools = nodes.filter(n => n.type.includes('tool') || n.type.includes('Tool'));
        let missingParams = 0;
        for (const t of tools) {
            if (!t.parameters || !t.parameters.name) missingParams++;
        }
        console.log(`Tools missing parameters.name in DB: ${missingParams} out of ${tools.length}`);
    }
}

run().catch(console.error);
