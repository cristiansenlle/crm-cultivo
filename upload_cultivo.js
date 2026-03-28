const { NodeSSH } = require('node-ssh');
const path = require('path');
const ssh = new NodeSSH();

async function run() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    await ssh.putFile(
        path.join(__dirname, 'cultivo.js'),
        '/opt/crm-cannabis/cultivo.js'
    );
    console.log('✅ cultivo.js uploaded — demo batch removed!');
    ssh.dispose();
}
run();
