const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const fs = require('fs');

async function run() {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' });
        const res = await ssh.execCommand('cat /root/n8n-crm-FINAL-MULTI-SENSOR.json');
        
        const wf = JSON.parse(res.stdout);
        const webhookNode = wf.nodes.find(n => n.type.includes('Webhook') || n.name.toLowerCase().includes('whatsapp'));
        const switchNode = wf.nodes.find(n => n.name.includes('Switch') || n.name.includes('IF') || n.type.includes('If'));
        
        fs.writeFileSync('wf_nodes.json', JSON.stringify({ webhookNode, switchNode }, null, 2));

        // Let's also check if there's any whatsapp container
        const resDocker = await ssh.execCommand('docker ps -a');
        fs.writeFileSync('wf_docker.json', resDocker.stdout);

        ssh.dispose();
    } catch(e) {
        console.error(e);
    }
}
run();
