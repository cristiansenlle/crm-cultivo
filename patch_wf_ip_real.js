const execSync = require('child_process').execSync;
const fs = require('fs');

async function run() {
    console.log("1. Extrayendo Workflow AkimB7aNdbNxFbcQ...");
    const wfHex = execSync(`ssh root@144.126.216.51 "docker exec n8n sqlite3 /home/node/.n8n/database.sqlite \\"SELECT hex(nodes) FROM workflow_entity WHERE id='AkimB7aNdbNxFbcQ'\\""`).toString().trim();
    
    // Hex to string
    let nodesStr = '';
    for (let i = 0; i < wfHex.length; i += 2) {
        nodesStr += String.fromCharCode(parseInt(wfHex.substr(i, 2), 16));
    }
    
    console.log("2. Reemplazando IPs...");
    // Las IPs encontradas eran 109.199.99.126
    const patchedNodesStr = nodesStr.replace(/109\.199\.99\.126/g, '144.126.216.51');
    
    if(patchedNodesStr === nodesStr) {
        console.log("No se encontraron cambios en las IPs.");
    } else {
        console.log("Se actualizaron IPs correctamente. Procesando el update...");
    }
    
    fs.writeFileSync('patched_nodes.json', patchedNodesStr);
    
    console.log("3. Subiendo Workflow parcheado...");
    // SCP the patched string
    execSync(`scp patched_nodes.json root@144.126.216.51:/root/patched_nodes.json`);
    
    // Inject back via python/sqlite (safest way for large blobs with quotes)
    const pythonScript = `
import sqlite3
import json

with open('/root/patched_nodes.json', 'r') as f:
    nodes_str = f.read()

conn = sqlite3.connect('/home/node/.n8n/database.sqlite')
cursor = conn.cursor()
cursor.execute('UPDATE workflow_entity SET nodes = ? WHERE id = ?', (nodes_str, 'AkimB7aNdbNxFbcQ'))
conn.commit()
conn.close()
print("Workflow parcheado con éxito")
    `.trim();
    
    fs.writeFileSync('patch_db.py', pythonScript);
    execSync(`scp patch_db.py root@144.126.216.51:/root/patch_db.py`);
    
    console.log(execSync(`ssh root@144.126.216.51 "docker cp /root/patch_db.py n8n:/home/node/patch_db.py && docker cp /root/patched_nodes.json n8n:/home/node/patched_nodes.json && docker exec n8n python3 /home/node/patch_db.py"`).toString());
    
    console.log("4. Reiniciando el ecosistema N8N...");
    execSync(`ssh root@144.126.216.51 "docker restart n8n"`);
    console.log("Todo OK!");
}

run().catch(e => console.error(e));
