const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkMissingFiles() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        console.log('\\n--- Checking Specific Files ---');
        const ls = await ssh.execCommand('ls -l /opt/crm-cannabis/*.html');
        console.log(ls.stdout);
        if (ls.stderr) console.error(ls.stderr);

        ssh.dispose();
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkMissingFiles();
