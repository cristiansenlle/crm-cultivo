const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const fs = require('fs');

async function run() {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' });
        
        await ssh.getFile('pulled_wf.json', '/root/n8n-crm-FINAL-MULTI-SENSOR.json');
        
        console.log("Descargado.");
        ssh.dispose();
    } catch(e) {
        console.error(e);
    }
}
run();
