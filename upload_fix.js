const { NodeSSH } = require('node-ssh');
const path = require('path');
const ssh = new NodeSSH();

async function run() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    await ssh.putFile(
        path.join(__dirname, 'supabase-client.js'),
        '/opt/crm-cannabis/supabase-client.js'
    );
    console.log('✅ supabase-client.js uploaded with login fix!');
    ssh.dispose();
}
run();
