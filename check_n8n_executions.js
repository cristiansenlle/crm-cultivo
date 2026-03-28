const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function checkLatestExe() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    console.log('Fetching latest execution of the workflow...');
    const result = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT executionData FROM execution_entity WHERE workflowId = \'scpZdPe5Cp4MG98G\' ORDER BY id DESC LIMIT 1;"');

    // Write the raw JSON output to a local file for inspection
    fs.writeFileSync('latest_execution.json', result.stdout);
    console.log('Saved latest execution data to latest_execution.json. Length:', result.stdout.length);

    ssh.dispose();
}

checkLatestExe().catch(console.error);
