const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function fetchStyles() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        console.log('Fetching style.css...');
        await ssh.getFile('remote_style.css', '/opt/crm-cannabis/style.css');
        console.log('✅ Fetched style.css');

        ssh.dispose();
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

fetchStyles();
