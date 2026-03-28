const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function findTable() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    const tables = [
        'execution_data', 'execution_entity', 'workflow_history', 'chat_hub_messages', 'shared_workflow', 'webhook_entity'
    ];

    for (const t of tables) {
        let cmd = `sqlite3 /root/.n8n/database.sqlite "SELECT COUNT(*) FROM it WHERE 1=0;"`; // just checking if table exists
        let res = await ssh.execCommand(`sqlite3 /root/.n8n/database.sqlite "SELECT COUNT(*) FROM ${t};"`);
        if (!res.stderr) {
            console.log(`Table ${t} row count:`, res.stdout.trim());

            // dump to specific file
            let q = `sqlite3 /root/.n8n/database.sqlite ".dump ${t}" | grep -a "11111111" | wc -l`;
            let res2 = await ssh.execCommand(q);
            console.log(`   Matches for 11111111:`, res2.stdout.trim());
        }
    }

    ssh.dispose();
}

findTable().catch(console.error);
