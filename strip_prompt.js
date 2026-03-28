const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function killPrompt() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    console.log('Fetching live workflow...');
    let res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT nodes FROM workflow_entity WHERE id = \'scpZdPe5Cp4MG98G\';"');
    let nodesStr = res.stdout;

    // Use regex to locate the huge Tool mock array at the bottom of the prompt
    // The block starts near "Human: ¿Qué lotes tengo activos?"
    const removeRegex = /Human: ¿Qué lotes tengo activos\?(.*?)\]/gs;

    let newNodesStr = nodesStr.replace(removeRegex, 'Human: ¿Qué lotes tengo activos?\nAI: [{"name":"consultar_lotes","args":{"filtro_opcional":" "},"id":"tool_call_1","type":"tool_call"}]\nTool: []');

    // Also explicitly kill any remaining '11111111' strings
    newNodesStr = newNodesStr.replace(/11111111-1111-1111-1111-111111111111/g, 'LOTE-DEMO-1');
    newNodesStr = newNodesStr.replace(/22222222-2222-2222-2222-222222222222/g, 'LOTE-DEMO-2');

    console.log('Original length:', nodesStr.length);
    console.log('Patched length:', newNodesStr.length);

    // Escape for SQLite update
    let sqlStr = newNodesStr.replace(/'/g, "''");

    console.log('Updating SQLite...');
    let up = await ssh.execCommand(`sqlite3 /root/.n8n/database.sqlite "UPDATE workflow_entity SET nodes = '${sqlStr}' WHERE id = 'scpZdPe5Cp4MG98G';"`);
    console.log(up.stdout, up.stderr);

    console.log('Restarting PM2 natively...');
    let rst = await ssh.execCommand('pm2 restart n8n-service');
    console.log(rst.stdout);

    ssh.dispose();
}

killPrompt().catch(console.error);
