const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function fetchMore() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        console.log('Fetching main.js...');
        await ssh.getFile('remote_main.js', '/opt/crm-cannabis/main.js');

        console.log('Fetching supabase-client.js...');
        await ssh.getFile('remote_supabase.js', '/opt/crm-cannabis/supabase-client.js');

        console.log('Checking for login.html...');
        const ls = await ssh.execCommand('ls -la /opt/crm-cannabis | grep login');
        console.log(ls.stdout);
        if (!ls.stdout.includes('login.html')) {
            console.log('No login.html found in the root directory.');
        }

        console.log('✅ Files downloaded successfully.');
        ssh.dispose();
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

fetchMore();
