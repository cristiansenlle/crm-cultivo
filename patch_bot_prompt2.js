const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function updateWorkflow() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    const newNodesJson = fs.readFileSync('bot_nodes_patched_prompt.json', 'utf8');

    // We create a temp file inside the remote
    await ssh.execCommand('cat > /root/temp_nodes.json', {
        stdin: newNodesJson + '\n'
    });

    console.log('Uploaded patched JSON.');

    // Removed .mode json
    const sqlScript = `
        UPDATE workflow_entity 
        SET nodes = readfile('/root/temp_nodes.json') 
        WHERE id = '9ASt18aP8tJss5mI';
    `;

    await ssh.execCommand(`cat > /root/update_prompt.sql`, { stdin: sqlScript + '\n' });

    console.log('Running SQLite update...');
    const result = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite < /root/update_prompt.sql');

    if (result.stderr) {
        console.error('SQL Error:', result.stderr);
    } else {
        console.log('Workflow Updated Successfully!');
    }

    console.log('Restarting N8N container...');
    await ssh.execCommand('docker restart n8n-docker-n8n-1');
    console.log('N8N restarted.');

    ssh.dispose();
}

updateWorkflow().catch(console.error);
