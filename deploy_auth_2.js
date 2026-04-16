const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
async function run() {
    await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' });
    
    // Upload the modified files
    await ssh.putFile('c:/Users/Cristian/.gemini/antigravity/crm cannabis/app_layout.tsx', '/opt/crm-cannabis-next/src/app/layout.tsx');
    await ssh.putFile('c:/Users/Cristian/.gemini/antigravity/crm cannabis/components_Topbar.tsx', '/opt/crm-cannabis-next/src/components/layout/Topbar.tsx');
    
    console.log("Reconstruyendo aplicacion Next (puede demorar 1 min)...");
    const res = await ssh.execCommand('cd /opt/crm-cannabis-next && npm run build && pm2 restart next-hud');
    console.log(res.stdout);
    if(res.stderr) console.error("Stderr:", res.stderr);
    
    // Use supersonic curl against Supabase admin API to create user
    // In production we usually use the admin dash. I'll execute via N8N's key or admin dashboard if we can't from node here.
    
    console.log("Despliegue finalizado!");
    ssh.dispose();
}
run().catch(console.error);
