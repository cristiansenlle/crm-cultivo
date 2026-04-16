const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

ssh.connect({
    host: '109.199.99.126',
    username: 'root',
    password: 'HIDDEN_SECRET_BY_AI'
}).then(async () => {
    // Get the last 3 executions for this workflow
    const r = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"SELECT id, status, stoppedAt FROM execution_entity WHERE workflowId='scpZdPe5Cp4MG98G' ORDER BY id DESC LIMIT 5;\"");
    console.log('=== Latest Executions ===');
    console.log(r.stdout);
    
    // Get the most recent execution data
    const r2 = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"SELECT id, status FROM execution_entity WHERE workflowId='scpZdPe5Cp4MG98G' ORDER BY id DESC LIMIT 1;\"");
    const execId = r2.stdout.split('|')[0].trim();
    console.log('\nLatest exec ID:', execId);
    
    // Get the execution data (it's in execution_data table)
    const r3 = await ssh.execCommand(`sqlite3 /root/.n8n/database.sqlite "SELECT length(data) FROM execution_data WHERE executionId='${execId}';"`);
    console.log('Execution data size:', r3.stdout);
    
    ssh.dispose();
}).catch(e => console.error(e));
