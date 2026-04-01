const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();
async function run() {
    await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' });
    
    // Instead of echo, let's use ssh.putFile! Much safer.
    await ssh.putFile('n8n-crm-FINAL-MULTI-SENSOR.json', '/root/n8n-crm-FINAL-MULTI-SENSOR.json');
    let imp = await ssh.execCommand('n8n import:workflow --input=/root/n8n-crm-FINAL-MULTI-SENSOR.json');
    console.log('Import STDOUT:', imp.stdout);
    console.log('Import STDERR:', imp.stderr);
    ssh.dispose();
}
run().catch(console.error);
