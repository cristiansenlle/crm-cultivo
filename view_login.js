const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
async function run() {
    await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' });
    const res = await ssh.execCommand('ls -la /opt/crm-cannabis-next/src/app/login || echo "no dir"');
    console.log("Login root:", res.stdout);
    
    // Create login directory if not exists
    await ssh.execCommand('mkdir -p /opt/crm-cannabis-next/src/app/login');
    
    // Download topbar to check the current logic or any auth middleware
    await ssh.getFile('components_Topbar.tsx', '/opt/crm-cannabis-next/src/components/layout/Topbar.tsx');
    console.log("Topbar downloaded.");
    
    ssh.dispose();
}
run().catch(console.error);
