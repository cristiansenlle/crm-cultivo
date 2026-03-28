const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function recoverAndPatch() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });
    console.log("Downloading cultivo.js...");
    await ssh.getFile('c:/Users/Cristian/.gemini/antigravity/crm cannabis/cultivo.js', '/opt/crm-cannabis/public/cultivo.js');
    console.log("Recovered cultivo.js");
    ssh.dispose();
}
recoverAndPatch().catch(console.error);
