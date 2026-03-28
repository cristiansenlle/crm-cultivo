const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' }).then(async () => {
    // Test via localhost
    const r1 = await ssh.execCommand(`curl -s -m 5 -o /dev/null -w "%{http_code}|%{time_total}" http://127.0.0.1:5006/bot-agronomico -X POST -H 'Content-Type: application/json' -d '{"batches":[],"inputs":[]}'`);
    console.log('127.0.0.1 result:', r1.stdout, r1.stderr);
    
    // Test via public IP
    const r2 = await ssh.execCommand(`curl -s -m 5 -o /dev/null -w "%{http_code}|%{time_total}" http://109.199.99.126:5006/bot-agronomico -X POST -H 'Content-Type: application/json' -d '{"batches":[],"inputs":[]}'`);
    console.log('Public IP result:', r2.stdout, r2.stderr);
    
    // Check if port is actually listening
    const r3 = await ssh.execCommand('ss -tlnp | grep 5006');
    console.log('Port 5006 listening:', r3.stdout);
    
    ssh.dispose();
});
