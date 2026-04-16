const { NodeSSH } = require('node-ssh');
const path = require('path');
const ssh = new NodeSSH();

async function run() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        console.log('Connected to VPS.');

        // 1. Upload cultivo.html
        await ssh.putFile(
            path.join(__dirname, 'cultivo.html'),
            '/opt/crm-cannabis/cultivo.html'
        );
        console.log('✅ cultivo.html uploaded with History Modal 4-column layout!');

        // 2. Upload cultivo.js
        await ssh.putFile(
            path.join(__dirname, 'cultivo.js'),
            '/opt/crm-cannabis/cultivo.js'
        );
        console.log('✅ cultivo.js uploaded with History Modal metrics & cost array accumulation!');

    } catch (err) {
        console.error('Error during deployment:', err);
    } finally {
        ssh.dispose();
    }
}
run();
