const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
async function run() {
    await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' });
    console.log("Subiendo page.tsx corregido...");
    await ssh.putFile('c:/Users/Cristian/.gemini/antigravity/crm cannabis/page.tsx', '/opt/crm-cannabis-next/src/app/insumos/page.tsx');
    console.log("Reconstruyendo aplicacion Next (puede demorar 1 min)...");
    const res = await ssh.execCommand('cd /opt/crm-cannabis-next && npm run build && pm2 restart next-hud');
    console.log(res.stdout);
    if(res.stderr) console.error("Stderr:", res.stderr);
    console.log("Despliegue finalizado!");
    ssh.dispose();
}
run().catch(console.error);
