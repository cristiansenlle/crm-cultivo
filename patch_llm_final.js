const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function patchLLM() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    console.log('Fetching live workflow...');
    let res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT nodes FROM workflow_entity WHERE id = \'scpZdPe5Cp4MG98G\';"');
    let nodesStr = res.stdout;

    // Remove all LOTE-A01 references
    nodesStr = nodesStr.replace(/LOTE-A01/g, 'LOTE-123');
    nodesStr = nodesStr.replace(/LOTE-B02/g, 'LOTE-456');
    nodesStr = nodesStr.replace(/sala-veg-1/g, 'sala-1');
    nodesStr = nodesStr.replace(/sala-veg-2/g, 'sala-2');
    nodesStr = nodesStr.replace(/Sour Diesel/g, 'GenéticaX');
    nodesStr = nodesStr.replace(/OG Kush/g, 'GenéticaY');

    // Inject the anti-hallucination warning for batch IDs
    const injectionStr = "⚠️ REGLA ABSOLUTA SOBRE Lote/Item_ID: Los IDs devueltos por la base de datos pueden tener CUALQUIER formato (ej: 'Planta Madre NP/1/2025', 'Clones', 'Semillas', etc). LOS DEBES USAR TEXTUALMENTE. BAJO NINGUNA CIRCUNSTANCIA LOS CONSIDERES 'IDs INTERNOS'. SI LA BD DICE 'Planta Madre', VOS DECÍS 'Planta Madre'. NUNCA inventes IDs como LOTE-123 si no están en la bd.";

    // Add it near the top of the prompt
    nodesStr = nodesStr.replace(/Sos el Agente de CRM Cannabis 360 OS./g, injectionStr + '\\n\\nSos el Agente de CRM Cannabis 360 OS.');

    // Escape for SQLite
    let sqlStr = nodesStr.replace(/'/g, "''");

    console.log('Updating SQLite...');
    let up = await ssh.execCommand(`sqlite3 /root/.n8n/database.sqlite "UPDATE workflow_entity SET nodes = '${sqlStr}' WHERE id = 'scpZdPe5Cp4MG98G';"`);
    console.log(up.stdout, up.stderr);

    console.log('Restarting PM2 natively...');
    let rst = await ssh.execCommand('pm2 restart n8n-service');
    console.log(rst.stdout);

    ssh.dispose();
}

patchLLM().catch(console.error);
