const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function fetchLogin() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        console.log('Fetching login.html...');
        await ssh.getFile('remote_login.html', '/opt/crm-cannabis/login.html');

        console.log('Fetching login.js...');
        await ssh.getFile('remote_login.js', '/opt/crm-cannabis/login.js');

        console.log('✅ Local files updated.');
        ssh.dispose();
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

fetchLogin();
