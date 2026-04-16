const fs = require('fs');
const { NodeSSH } = require('node-ssh');

const ssh = new NodeSSH();

async function run() {
    try {
        console.log('Connecting...');
        await ssh.connect({host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI'});
        
        console.log('Fetching workflow...');
        const fetchCmd = `sqlite3 /root/.n8n/database.sqlite "SELECT hex(nodes) FROM workflow_entity WHERE id='scpZdPe5Cp4MG98G';"`;
        const res = await ssh.execCommand(fetchCmd);
        if(!res.stdout) throw new Error('No data received from DB');
        
        const nodesStr = Buffer.from(res.stdout.replace(/\\s/g, ''), 'hex').toString('utf8');
        let nodesArray = JSON.parse(nodesStr);
        
        // Find Agent Node
        let patchedCount = 0;
        nodesArray.forEach(n => {
            if (n.type.includes('agent') || n.name.toLowerCase().includes('agent')) {
                if (n.parameters && n.parameters.options && n.parameters.options.systemMessage) {
                    let msg = n.parameters.options.systemMessage;
                    
                    const protocolReq = `
━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ PROTOCOLO DE CONFIRMACIÓN OBLIGATORIO (CRÍTICO)
━━━━━━━━━━━━━━━━━━━━━━━━
ANTES de registrar y utilizar la herramienta 'reportar_evento_agronomico', DEBES SIEMPRE mostrarle al usuario un resumen en lenguaje natural detallando:
1. Qué producto va a cargar.
2. En qué dosis.
3. En qué lotes EXACTOS se aplicará.
Y LUEGO PREGUNTARLE EXPLÍCITAMENTE AL USUARIO: "¿Me confirmas que deseas guardar este registro?". 
SOLO CUANDO el usuario diga "Sí", "Confirmo", o similar, TIENES PERMISO para ejecutar la herramienta reportar_evento_agronomico. NUNCA ejecutes la herramienta de reporte/aplicación si no has pedido y recibido confirmación explícita del usuario previamente basada en ese resumen.
`;                  
                    if (!msg.includes("PROTOCOLO DE CONFIRMACIÓN OBLIGATORIO")) {
                        msg = msg + '\\n' + protocolReq;
                        n.parameters.options.systemMessage = msg;
                        patchedCount++;
                    }
                }
            }
        });
        
        if (patchedCount > 0) {
            console.log('Prompt patched successfully. Uploading back to DB...');
            const hexNodes = Buffer.from(JSON.stringify(nodesArray)).toString('hex');
            const sql = `UPDATE workflow_entity SET nodes = X'${hexNodes}' WHERE id = 'scpZdPe5Cp4MG98G';`;
            fs.writeFileSync('./temp_patch.sql', sql);
            
            await ssh.putFile('./temp_patch.sql', '/root/temp_patch.sql');
            let upd = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite < /root/temp_patch.sql');
            if (upd.stderr && !upd.stderr.includes('already exists')) {
                 console.log('SQL Warning/Error:', upd.stderr);
            }
            console.log('DB Updated.');
            
            console.log('Restarting n8n...');
            await ssh.execCommand('pm2 restart n8n-service');
            fs.unlinkSync('./temp_patch.sql');
            console.log('ALL DONE! System Prompt updated.');
        } else {
            console.log('No patching needed or Agent not found/already patched.');
        }
        
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        ssh.dispose();
    }
}
run();
