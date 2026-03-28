const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function deploy() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });
    console.log("Uploading cultivo.html and cultivo.js...");
    await ssh.putFile('c:/Users/Cristian/.gemini/antigravity/crm cannabis/cultivo.html', '/opt/crm-cannabis/cultivo.html');
    await ssh.putFile('c:/Users/Cristian/.gemini/antigravity/crm cannabis/cultivo.js', '/opt/crm-cannabis/cultivo.js');
    console.log("Deployed successfully");
    ssh.dispose();
}
deploy().catch(console.error);
