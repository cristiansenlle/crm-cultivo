const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
async function run() {
    await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' });
    await ssh.execCommand('pm2 stop n8n-service');
    
    // N8N desactivó el anterior. Borramos el ID anterior y activamos el nuevo.
    // Aunque si solo queremos tener asegurado que ESTE quede prendido:
    let act = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"UPDATE workflow_entity SET active=1 WHERE name LIKE 'CRM Cannabis (V16 OpenRouter Paid)'\"");
    console.log(act.stdout, act.stderr);
    
    await ssh.execCommand('pm2 start n8n-service');
    ssh.dispose();
}
run().catch(console.error);
