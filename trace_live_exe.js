const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function traceLive() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    console.log('--- Tracing latest execution data ---');
    // Get the highest execution ID
    let res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT executionId FROM execution_data ORDER BY executionId DESC LIMIT 1;"');
    const exeId = res.stdout.trim();

    // Dump that execution's data trace
    let res2 = await ssh.execCommand(`sqlite3 /root/.n8n/database.sqlite "SELECT data FROM execution_data WHERE executionId = '${exeId}';"`);
    fs.writeFileSync('THE_NEWEST_exe_trace.json', res2.stdout);
    console.log('Saved to THE_NEWEST_exe_trace.json');

    ssh.dispose();
}

traceLive().catch(console.error);
