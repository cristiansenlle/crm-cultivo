const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' });
        console.log("Restaurando Workflows en N8N...");
        // Importar back-ups
        const res = await ssh.execCommand('n8n import:workflow --input=/root/n8n-crm-FINAL-MULTI-SENSOR.json');
        console.log("Import Sensor:", res.stdout, res.stderr);
        
        const res2 = await ssh.execCommand('n8n import:workflow --input=/root/n8n-crm-cannabis-workflow.json');
        console.log("Import Cannabis WF:", res2.stdout, res2.stderr);

        // Listar los id de workflows instalados
        const res3 = await ssh.execCommand('n8n export:workflow --all');
        console.log("Workflows Instalados ahora:", res3.stdout ? "Hay JSON data (success)" : "Vacio!");

        // Levantar credenciales pre-cargadas si hubiesen (opcional)
        // const resC = await ssh.execCommand('n8n import:credentials --all');
        
        ssh.dispose();
    } catch(e) {
        console.error(e);
    }
}
run();
