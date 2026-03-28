const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkNginx() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    const nginxConf = await ssh.execCommand('cat /etc/nginx/sites-enabled/*');
    console.log("=== NGINX SITES ===");
    console.log(nginxConf.stdout);

    const nginxMain = await ssh.execCommand('cat /etc/nginx/nginx.conf');
    console.log("=== NGINX MAIN ===");
    // Just grep for root
    const rootSearch = await ssh.execCommand('grep -r "root " /etc/nginx/');
    console.log("=== ROOT SEARCH ===");
    console.log(rootSearch.stdout);
    
    ssh.dispose();
}

checkNginx().catch(console.error);
