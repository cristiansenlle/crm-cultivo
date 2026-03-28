const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function run() {
    const wfArray = JSON.parse(fs.readFileSync('C:\\\\Users\\\\Cristian\\\\Desktop\\\\n8n-crm-cannabis-workflow-FINAL.json', 'utf8'));
    const wf = wfArray.nodes ? wfArray : wfArray[0];

    const nodesJson = JSON.stringify(wf.nodes).replace(/'/g, "''");
    const connectionsJson = JSON.stringify(wf.connections).replace(/'/g, "''");

    const sql = `UPDATE workflow_entity SET nodes='${nodesJson}', connections='${connectionsJson}' WHERE id='scpZdPe5Cp4MG98G';`;
    fs.writeFileSync('update_final.sql', sql);

    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    console.log('Uploading SQL update...');
    await ssh.putFile('update_final.sql', '/tmp/update_final.sql');

    console.log('Executing SQL update...');
    const res1 = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite < /tmp/update_final.sql');
    if (res1.stderr) console.error(res1.stderr);
    else console.log('Database updated.');

    console.log('Restarting N8N...');
    const res2 = await ssh.execCommand('pm2 restart n8n-service');
    console.log('Done:', res2.stdout.substring(0, 100) + '...');

    ssh.dispose();
}

run().catch(console.error);
