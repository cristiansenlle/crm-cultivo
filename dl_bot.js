const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function getWaBot() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        await ssh.getFile('bot-wa.js', '/opt/crm-cannabis/bot-wa.js');
        console.log("Downloaded bot-wa.js");

        ssh.dispose();
    } catch(e) {
        console.error(e);
        ssh.dispose();
    }
}
getWaBot();
