const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function activateAndTest() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        console.log("Activating CRM Cannabis workflow...");
        let res = await ssh.execCommand('n8n update:workflow --id=scpZdPe5Cp4MG98G --active=true');
        console.log("Activation Output:", res.stdout, res.stderr);

        ssh.dispose();
    } catch (e) {
        console.error(e);
        ssh.dispose();
    }
}

activateAndTest().catch(console.error);
