const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function run() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    console.log('Fetching active workflows from DB...');
    await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"SELECT nodes, connections FROM workflow_entity WHERE id='scpZdPe5Cp4MG98G';\" > /tmp/db1.txt");
    await ssh.getFile('db1.txt', '/tmp/db1.txt');
    console.log('✅ Dump downloaded');

    ssh.dispose();

    // Analyze the dump
    const dump = fs.readFileSync('db1.txt', 'utf8').split('|');
    if (dump.length >= 2) {
        const nodes = JSON.parse(dump[0]);
        const connections = JSON.parse(dump[1]);

        const validNodes = new Set(nodes.map(n => n.name));
        let errs = 0;
        let missingAgents = new Set();

        for (const src in connections) {
            if (!validNodes.has(src)) {
                console.log('❌ GHOST SOURCE:', src);
                errs++;
            }

            for (const type in connections[src]) {
                for (const targets of connections[src][type]) {
                    for (const trg of targets) {
                        if (!validNodes.has(trg.node)) {
                            console.log('❌ GHOST TARGET:', trg.node, 'from', src);
                            errs++;
                        }
                        if (trg.node.includes('Agent')) {
                            if (!validNodes.has(src)) {
                                missingAgents.add(src);
                            }
                        }
                    }
                }
            }
        }
        console.log(`\n\nDatabase has ${nodes.length} nodes and ${errs} ghost errors.`);
        console.log('Missing sources that point to Agent:', [...missingAgents]);
    }
}

run().catch(console.error);
