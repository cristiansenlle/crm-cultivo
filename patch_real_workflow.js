const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function updateWorkflow() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    console.log('Downloading actual live workflow...');
    let res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT nodes FROM workflow_entity WHERE id = \'scpZdPe5Cp4MG98G\';"');

    let str = res.stdout;
    // Replace hallucination triggers
    str = str.replace(/LOTE-A01/g, 'LOTE-EX-1');
    str = str.replace(/LOTE-B02/g, 'LOTE-EX-2');

    fs.writeFileSync('temp_real_nodes_patched.json', str);

    // We create a temp file inside the remote
    await ssh.execCommand('cat > /root/temp_nodes.json', {
        stdin: str + '\n'
    });

    console.log('Uploaded patched JSON.');

    const sqlScript = `
        UPDATE workflow_entity 
        SET nodes = readfile('/root/temp_nodes.json') 
        WHERE id = 'scpZdPe5Cp4MG98G';
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
