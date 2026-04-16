const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

const MIDDLEWARE_INSTRUCTIONS = `

━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ REGLAS DE APLICACIÓN DE INSUMOS (MIDDLEWARE AGRONÓMICO)
━━━━━━━━━━━━━━━━━━━━━━━━
Cuando el usuario diga que aplicó un producto/insumo (nutrición, fertilización, prevención de plagas, IPM):
1. PRIMERO ejecutá consultar_lotes (o consultar_lotes_groq) para obtener los batch_id exactos.
2. LUEGO llamá a reportar_evento (o reportar_evento_groq) con TODOS estos campos obligatorios:
   • batches: Array JSON con los IDs exactos de lotes. Ejemplo: ["Planta Madre NP/1/2025","Planta madre NP/2/2025","Planta Madre RHC/1/2026"]
   • inputs: Array JSON de insumos con nombre comercial y cantidad. Ejemplo: [{"name":"Top Veg","qty":5},{"name":"Barrier","qty":1}]
   • water_liters: Número decimal de litros de agua totales usados. Ejemplo: 2
   • event_type: "Nutricion" o "Prevencion" o "Aplicacion" según corresponda
   • raw_description: Texto libre describiendo la aplicación completa
3. El middleware automáticamente:
   • Descuenta el stock del inventario
   • Calcula el costo (precio unitario × cantidad)
   • Divide el costo equitativamente entre la cantidad de lotes
   • Registra los eventos con total_cost y water_liters

EJEMPLO: Si el usuario dice "apliqué 6ml de alga a mic en los 3 lotes con 2 litros de agua":
→ Llamar reportar_evento con:
  batches: ["Planta Madre NP/1/2025","Planta madre NP/2/2025","Planta Madre RHC/1/2026"]
  inputs: [{"name":"Alga a Mic","qty":6}]
  water_liters: 2
  event_type: "Nutricion"
  raw_description: "Aplicación de 6ml de Alga a Mic en 2 litros de agua"

⚠️ NUNCA envíes batch_id como string suelto. SIEMPRE envía "batches" como array JSON.
⚠️ NUNCA envíes el nombre del insumo como string suelto. SIEMPRE envía "inputs" como array JSON de objetos con "name" y "qty".
`;

ssh.connect({
    host: '109.199.99.126',
    username: 'root',
    password: 'HIDDEN_SECRET_BY_AI'
}).then(async () => {
    // Read the current workflow nodes
    const r = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"SELECT nodes FROM workflow_entity WHERE id='scpZdPe5Cp4MG98G';\"");
    
    if (!r.stdout || r.stdout.length < 100) {
        console.error('Failed to read nodes');
        ssh.dispose();
        return;
    }
    
    const nodes = JSON.parse(r.stdout);
    
    // Patch the system prompts of both agent nodes
    let patchCount = 0;
    nodes.forEach((n, i) => {
        if (n.type === '@n8n/n8n-nodes-langchain.agent') {
            const currentPrompt = n.parameters?.options?.systemMessage || '';
            
            // Only patch if not already patched
            if (!currentPrompt.includes('MIDDLEWARE AGRONÓMICO')) {
                n.parameters.options.systemMessage = currentPrompt + MIDDLEWARE_INSTRUCTIONS;
                patchCount++;
                console.log(`Patched agent: ${n.name} (index ${i})`);
            } else {
                console.log(`Already patched: ${n.name}`);
            }
        }
    });
    
    if (patchCount === 0) {
        console.log('No agents needed patching.');
        ssh.dispose();
        return;
    }
    
    // Save the patched nodes locally
    const patchedNodesJson = JSON.stringify(nodes);
    fs.writeFileSync('patched_nodes_middleware.json', patchedNodesJson);
    console.log('Saved patched nodes locally. Size:', patchedNodesJson.length);
    
    // Write to SQLite via escaped SQL
    const escaped = patchedNodesJson.replace(/'/g, "''");
    const sqlFile = '/tmp/patch_prompt.sql';
    
    // Upload the nodes JSON as a file
    await ssh.putFile('patched_nodes_middleware.json', '/tmp/patched_nodes.json');
    console.log('Uploaded patched nodes to server.');
    
    // Use a Python script on the server to safely update SQLite
    const pyScript = `
import sqlite3, json
with open('/tmp/patched_nodes.json','r') as f:
    nodes = f.read()
conn = sqlite3.connect('/root/.n8n/database.sqlite')
conn.execute("UPDATE workflow_entity SET nodes=? WHERE id='scpZdPe5Cp4MG98G'", [nodes])
conn.commit()
print('Updated', conn.total_changes, 'row(s)')
conn.close()
`;
    
    await ssh.execCommand(`echo '${pyScript.replace(/'/g, "'\\''")}' > /tmp/patch_prompt.py`);
    const pyResult = await ssh.execCommand('python3 /tmp/patch_prompt.py');
    console.log('Python update result:', pyResult.stdout, pyResult.stderr);
    
    // Restart n8n to pick up changes
    const restartResult = await ssh.execCommand('pm2 restart n8n-service');
    console.log('n8n restarted:', restartResult.stdout?.substring(0, 200));
    
    ssh.dispose();
}).catch(e => console.error(e));
