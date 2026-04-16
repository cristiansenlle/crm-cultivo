const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkApp() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });
    
    // Check files inside /opt/crm-cannabis
    const ls = await ssh.execCommand('ls -la /opt/crm-cannabis/');
    console.log("LS /opt/crm-cannabis/: \n", ls.stdout);
    
    // Read the main server file
    const serverFile = await ssh.execCommand('cat /opt/crm-cannabis/server.js');
    console.log("SERVER.JS: \n", serverFile.stdout);
    
    ssh.dispose();
}
checkApp().catch(console.error);
