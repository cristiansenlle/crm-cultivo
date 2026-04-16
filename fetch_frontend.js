const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function fetchFrontendCode() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        console.log('Fetching index.html...');
        await ssh.getFile('remote_index.html', '/opt/crm-cannabis/index.html');

        console.log('Fetching app.js...');
        await ssh.getFile('remote_app.js', '/opt/crm-cannabis/assets/js/app.js');

        console.log('Fetching login.js (if exists)...');
        try {
            await ssh.getFile('remote_login.js', '/opt/crm-cannabis/assets/js/login.js');
        } catch (e) {
            console.log('login.js not found or error fetching.');
        }

        console.log('✅ Files downloaded successfully.');
        ssh.dispose();
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

fetchFrontendCode();
