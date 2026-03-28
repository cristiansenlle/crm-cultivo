const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkPub() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    console.log('--- Checking workflow_published_version ---');
    let res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT id, workflowId FROM workflow_published_version;"');
    console.log(res.stdout);

    // Dump it if it exists
    let res2 = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT nodes FROM workflow_published_version WHERE workflowId = \'scpZdPe5Cp4MG98G\';"');
    const nodesStr = res2.stdout;

    if (nodesStr && nodesStr.includes('LOTE')) {
        console.log('BINGO! 11111111 mock array exists in the published version!');

        const removeRegex = /Human: ¿Qué lotes tengo activos\?(.*?)\]/gs;
        let newNodesStr = nodesStr.replace(removeRegex, 'Human: ¿Qué lotes tengo activos?\\nAI: [{"name":"consultar_lotes","args":{"filtro_opcional":" "},"id":"tool_call_1","type":"tool_call"}]\\nTool: []');
        newNodesStr = newNodesStr.replace(/11111111-1111-1111-1111-111111111111/g, 'LOTE-DEMO-1');
        newNodesStr = newNodesStr.replace(/22222222-2222-2222-2222-222222222222/g, 'LOTE-DEMO-2');

        if (newNodesStr !== nodesStr) {
            let sqlStr = newNodesStr.replace(/'/g, "''");
            console.log('Patching published version in SQLite...');
            let up = await ssh.execCommand(`sqlite3 /root/.n8n/database.sqlite "UPDATE workflow_published_version SET nodes = '${sqlStr}' WHERE workflowId = 'scpZdPe5Cp4MG98G';"`);
            console.log(up.stdout, up.stderr);

            console.log('Restarting PM2 manually...');
            let rst = await ssh.execCommand('pm2 restart n8n-service');
            console.log(rst.stdout);
            console.log('DONE!');
        }
    } else {
        console.log('Not found in published :(');
    }

    ssh.dispose();
}

checkPub().catch(console.error);
