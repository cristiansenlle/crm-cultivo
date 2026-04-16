const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();
const WORKFLOW_ID = 'scpZdPe5Cp4MG98G';

ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' }).then(async () => {
    console.log('Fetching V9 workflow from VPS SQLite...');
    
    const r = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"SELECT * FROM workflow_entity WHERE id='" + WORKFLOW_ID + "';\" -json");
    try {
        const rows = JSON.parse(r.stdout);
        const wf = rows[0];
        
        let parsedNodes = JSON.parse(wf.nodes);
        
        const microPrompt = `Eres AgronomyBot 360. Manejas lotes, salas, inventario y ventas llamando SIEMPRE a las herramientas sin inventar IDs.
Reglas Críticas:
1. Haz fuzzy match de los lotes/salas reportados por el usuario utilizando los tools (consultar_lotes, consultar_salas) antes de aplicar.
2. NUNCA respondas con el formato JSON crudo de la herramienta, traduce la respuesta a un breve párrafo humano.
3. Para múltiples aplicaciones, ejecuta la herramienta 1 por 1 silenciosamente.
4. NUNCA asumas el fecha/hora, usa tools o tu fecha interna ISO.
5. El tool 'reportar_evento' exige un array JSON de IDs, asegúrate de pasarlo bien.`;

        parsedNodes.forEach(n => {
            if (n.type && n.type.includes('Agent')) {
                // Shorten System Message
                if (n.parameters && n.parameters.text) {
                    n.parameters.text = microPrompt;
                }
            }
            if (n.type === '@n8n/n8n-nodes-langchain.lmChatGroq') {
                n.parameters.model = 'mixtral-8x7b-32768';
            }
        });

        const exportFormat = {
            name: wf.name + " (Slim Mixtral V10)",
            nodes: parsedNodes,
            connections: JSON.parse(wf.connections),
            active: wf.active === 1,
            settings: wf.settings ? JSON.parse(wf.settings) : {},
            meta: wf.meta ? JSON.parse(wf.meta) : {},
            tags: []
        };
        
        const fileOut = "n8n-crm-cannabis-FINAL-V10.json";
        fs.writeFileSync(fileOut, JSON.stringify(exportFormat, null, 2));
        console.log("✅ Workflow exported successfully to " + fileOut);
        
    } catch(e) {
        console.error('Failed formatting JSON:', e.message);
    }
    ssh.dispose();
}).catch(console.error);
