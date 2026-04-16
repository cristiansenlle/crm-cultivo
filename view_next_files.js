const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
async function run() {
    await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' });
    const res = await ssh.execCommand('ls -la /opt/crm-cannabis-next/src/app');
    console.log("App root:", res.stdout);
    const res2 = await ssh.execCommand('cat /opt/crm-cannabis-next/src/app/layout.tsx');
    console.log("Layout:", res2.stdout);
    ssh.dispose();
}
run().catch(console.error);
