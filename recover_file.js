const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const fs = require('fs');

async function recover() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });
    console.log("Downloading cultivo.html from server...");
    await ssh.getFile('c:/Users/Cristian/.gemini/antigravity/crm cannabis/cultivo.html', '/opt/crm-cannabis/cultivo.html');
    console.log("Recovered!");
    ssh.dispose();
}
recover();
