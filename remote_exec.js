const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        console.log('--- FETCHING LAST 10 EXECUTIONS ---');
        console.log('--- FINDING ANCESTOR ON SERVER ---');
        const script = `
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('/root/.n8n/database.sqlite');

db.get("SELECT nodes, connections FROM workflow_entity WHERE name='CRM Cannabis'", (err, row) => {
    if (err) { console.error(err); process.exit(1); }
    const nodes = JSON.parse(row.nodes);
    const conns = JSON.parse(row.connections);
    const target = "PG Insert WA TM";
    
    let source = null;
    for (const [name, nodeConns] of Object.entries(conns)) {
        if (JSON.stringify(nodeConns).includes(target)) {
            source = name;
            break;
        }
    }
    console.log('SOURCE_NODE:' + source);
    const sourceNode = nodes.find(n => n.name === source);
    console.log('SOURCE_DEF:' + JSON.stringify(sourceNode));
    db.close();
});
`;
        await ssh.execCommand("node -e \\\"" + script.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ') + "\\\"");
        const result = await ssh.execCommand("node -e \"" + script.replace(/\n/g, ' ') + "\"");
        console.log(result.stdout);
        console.log(result.stderr);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
