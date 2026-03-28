const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkRedirect() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        console.log('\\n--- Checking /cultivo.html with redirects ---');
        const curl = await ssh.execCommand('curl -s -L -o /dev/null -w "%{http_code}" http://localhost:80/cultivo.html');
        console.log('HTTP Code with redirect (-L):', curl.stdout);

        const checkHtml = await ssh.execCommand('curl -s -L http://localhost:80/cultivo.html | head -n 4');
        console.log('Cultivo.html Output:', checkHtml.stdout);

        console.log('\\n--- Checking /login.html with redirects ---');
        const checkLogin = await ssh.execCommand('curl -s -L http://localhost:80/login.html | head -n 4');
        console.log('Login.html Output:', checkLogin.stdout);

        ssh.dispose();
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkRedirect();
