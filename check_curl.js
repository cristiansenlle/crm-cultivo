const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkCurl() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        console.log('\\n--- Checking /cultivo.html ---');
        const curl = await ssh.execCommand('curl -s -o /dev/null -w "%{http_code}" http://localhost:80/cultivo.html');
        console.log('HTTP Code cultivation:', curl.stdout);

        const curlHead = await ssh.execCommand('curl -s http://localhost:80/cultivo.html | head -n 10');
        console.log('\\nCultivo Head:\\n', curlHead.stdout);

        const curlIndexHead = await ssh.execCommand('curl -s http://localhost:80/index.html | head -n 10');
        console.log('\\nIndex Head:\\n', curlIndexHead.stdout);

        ssh.dispose();
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkCurl();
