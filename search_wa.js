const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const fs = require('fs');

async function run() {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' });
        
        console.log("Checking /opt/crm-cannabis");
        const res1 = await ssh.execCommand('ls -la /opt/crm-cannabis');
        console.log(res1.stdout);
        
        console.log("Checking /root/crm-cannabis");
        const res2 = await ssh.execCommand('ls -la /root/crm-cannabis');
        console.log(res2.stdout);

        console.log("Checking for Whatsapp related processes or nodes");
        const res3 = await ssh.execCommand('find / -name "*wa*.js" -o -name "*whatsapp*.js" 2>/dev/null | grep -v node_modules | head -n 20');
        console.log(res3.stdout);
        
        fs.writeFileSync('wa_search.txt', res1.stdout + "\n---\n" + res2.stdout + "\n---\n" + res3.stdout);
        ssh.dispose();
    } catch(e) { console.error(e); }
}
run();
