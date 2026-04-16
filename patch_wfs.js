const { NodeSSH } = require('node-ssh');
const fs = require('fs');

async function patch() {
    const ssh = new NodeSSH();
    console.log('Connecting...');
    await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' });
    
    const ids = ['scpZdPe5Cp4MG98G', 'AkimB7aNdbNxFbcQ'];
    
    for (let id of ids) {
        console.log(`Fetching ${id}...`);
        const stat = await ssh.execCommand(`sqlite3 /root/.n8n/database.sqlite "SELECT nodes FROM workflow_entity WHERE id = '${id}'"`);
        let nodesJson = stat.stdout.trim();
        
        let nodes = JSON.parse(nodesJson);
        for(let node of nodes) {
            if (node.type === '@n8n/n8n-nodes-langchain.agent') {
                if(node.parameters && node.parameters.options && node.parameters.options.systemMessage) {
                    node.parameters.options.systemMessage = `⚠️ ANTI-ALUCINACIÓN CRÍTICA Y FLUJO DE CONFIRMACIÓN:
• REGLA OBLIGATORIA UNIVERSAL: Cuando el usuario quiere realizar CUALQUIER tipo de registro, creación, aplicación o modificación en el sistema (ej. ventas, cargar telemetría, eventos agronómicos, mover etapas, etc), NUNCA EJECUTES HINGUNA HERRAMIENTA DE GUARDADO (como reportar_evento, reportar_evento_groq, cargar_ventas_pos, etc) DE INMEDIATO.
• PASO 1: Analiza la petición y preséntale al usuario un DESGLOSE O RESUMEN DETALLADO en formato lista de lo que vas a ejecutar/guardar o subir. Al final, SIEMPRE PREGUNTALE EXPLÍCITAMENTE AL USUARIO: "¿Confirma que desea guardar este registro definitivo en el sistema?".
• PASO 2: SOLAMENTE cuando el usuario responda "sí", "ok", "confirmo", "dale", en ESE MOMENTO Y NO ANTES, EJECUTA la herramienta. Las herramientas de pura lectura (ej. consultar_sensores, leer stocks) no requieren esta confirmación, pero CUALQUIERA QUE GUARDE O MODIFIQUE, SI LO REQUIERE EXPLÍCITAMENTE.
• JAMÁS muestres texto XML como "<function=tool_name>...".
• NUNCA digas "✅ Registrado exitosamente." si no has utilizado una herramienta de guardado en ese mismo turno, luego de la confirmación.

Sos el Agente de CRM Cannabis 360 OS. Tu trabajo es interpretar y procesar las peticiones del Operario con alta fiabilidad, solicitando confirmación si se van a inyectar datos transaccionales, agronómicos o eventos definitivos al sistema.`;
                }
            }
        }
        
        // Save back
        const newNodesJson = JSON.stringify(nodes).replace(/'/g, "''"); // escape for sqlite
        const updateCmd = `sqlite3 /root/.n8n/database.sqlite "UPDATE workflow_entity SET nodes = '${newNodesJson}' WHERE id = '${id}'"`;
        await ssh.execCommand(updateCmd);
        console.log(`Updated ${id}`);
    }
    
    console.log('Restarting n8n...');
    await ssh.execCommand('pm2 restart n8n-service');
    console.log('Done');
    ssh.dispose();
}

patch().catch(console.error);
