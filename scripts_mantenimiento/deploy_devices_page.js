const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
  try {
    console.log("Connecting to VPS...");
    await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' });
    
    console.log("Uploading page.tsx...");
    await ssh.putFile('next-app/src/app/iot/devices/page.tsx', '/opt/crm-cannabis-next/src/app/iot/devices/page.tsx');
    
    console.log("Building Next.js app (this may take a few minutes)...");
    const res = await ssh.execCommand('npm run build', { cwd: '/opt/crm-cannabis-next' });
    console.log(res.stdout);
    if(res.stderr) console.error("BUILD STDERR:", res.stderr);
    
    console.log("Restarting PM2...");
    // Let's restart both potential pm2 names just in case
    await ssh.execCommand('pm2 restart crm-frontend', { cwd: '/opt/crm-cannabis-next' });
    await ssh.execCommand('pm2 restart next-hud', { cwd: '/opt/crm-cannabis-next' });
    
    console.log("Deployment complete!");
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
