const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const fs = require('fs');
async function run() {
  try {
    await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' });
    
    await ssh.putFile('next-app/src/context/RoomContext.tsx', '/opt/crm-cannabis-next/src/context/RoomContext.tsx');
    await ssh.putFile('next-app/src/app/agronomy/page.tsx', '/opt/crm-cannabis-next/src/app/agronomy/page.tsx');
    
    console.log("Files uploaded. Rebuilding next app...");
    const res = await ssh.execCommand('npm run build', { cwd: '/opt/crm-cannabis-next' });
    console.log(res.stdout);
    if(res.stderr) console.error(res.stderr);
    
    await ssh.execCommand('pm2 restart next-hud', { cwd: '/opt/crm-cannabis-next' });
    console.log("Deployed next-hud!");
    
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
