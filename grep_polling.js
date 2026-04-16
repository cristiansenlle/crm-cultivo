const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function findFunction() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        console.log('Searching for pollLatestTelemetry...');
        const result = await ssh.execCommand('grep -n -B 2 -A 20 "function pollLatestTelemetry" /opt/crm-cannabis/*.js');
        console.log(result.stdout);

        ssh.dispose();
    } catch (error) {
        console.error('Error:', error.message);
    }
}

findFunction();
