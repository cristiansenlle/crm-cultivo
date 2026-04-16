const { NodeSSH } = require('node-ssh');
const fs = require('fs');

const ssh = new NodeSSH();

async function downloadExport() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        // re-export to be 100% sure it's the latest
        await ssh.execCommand('n8n export:workflow --id=scpZdPe5Cp4MG98G --output=/root/latest_export.json');

        await ssh.getFile('latest_export.json', '/root/latest_export.json');
        console.log('Downloaded latest_export.json');

        ssh.dispose();
    } catch (e) {
        console.error(e);
        ssh.dispose();
    }
}

downloadExport();
