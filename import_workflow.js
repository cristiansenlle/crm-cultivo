const { NodeSSH } = require('node-ssh');
const path = require('path');
const ssh = new NodeSSH();

async function run() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    const runCmd = async (label, cmd) => {
        console.log(`\n▶️ ${label}`);
        const r = await ssh.execCommand(cmd);
        if (r.stdout) console.log(r.stdout);
        if (r.stderr && r.stderr.trim()) console.log('ERR:', r.stderr.substring(0, 300));
        return r;
    };

    const localFile = path.join(__dirname, 'n8n-crm-cannabis-workflow.json');
    const remoteFile = '/opt/crm-cannabis/n8n-crm-cannabis-workflow.json';

    console.log('Uploading workflow...');
    await ssh.putFile(localFile, remoteFile);
    console.log('✅ Workflow uploaded');

    // Find n8n binary path just in case
    const whichN8n = await runCmd('Find n8n', 'which n8n || find /usr -name n8n -type f -executable | head -1');

    // Import the workflow
    await runCmd('Import workflow', `n8n import:workflow --input='${remoteFile}' || /usr/lib/node_modules/n8n/bin/n8n import:workflow --input='${remoteFile}' || /usr/local/bin/n8n import:workflow --input='${remoteFile}'`);

    // Activate workflows using the REST API just to be sure
    await runCmd('Get N8N workflows',
        "curl -s http://109.199.99.126:5678/api/v1/workflows");

    await runCmd('Activate workflow',
        "curl -v -s -X PATCH http://109.199.99.126:5678/api/v1/workflows/1 -H 'Content-Type: application/json' -d '{\"active\":true}'");

    ssh.dispose();
}
run();
