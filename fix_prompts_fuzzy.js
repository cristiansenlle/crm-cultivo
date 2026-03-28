const fs = require('fs');
const f = 'C:/Users/Cristian/.gemini/antigravity/crm cannabis/n8n-crm-cannabis-workflow.json';
const wf = JSON.parse(fs.readFileSync(f, 'utf8'));

const agent = wf.nodes.find(n => n.name === 'AI Agent' || n.type === '@n8n/n8n-nodes-langchain.agent');
let sm = agent.parameters.options.systemMessage;

const newRule = `
━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ REGLAS DE FORMATO Y AUTOCORRECCIÓN (¡MUY IMPORTANTE!)
━━━━━━━━━━━━━━━━━━━━━━━━
• El usuario suele escribir rápido o incompleto (ej: "sala 1", "lote 1", "lote veg 2").
• ANTES de ejecutar un tool de Carga (POST) que requiera un ID exacto de lote (batch_id) o sala (room_id), DEBÉS ejecutar el tool de consulta correspondiente (ej: consultar_lotes) silenciosamente para ver la lista real de IDs.
• Hacé "fuzzy matching" o autocompletado en tu mente: si la base de datos dice "LOTE-A01" (en sala-veg-1) y el usuario dice "Trips en lote 1" o "lote a1", vos usás inteligentemente "LOTE-A01".
• Si el usuario dice "sala veg 1", vos lo transformás a "sala-veg-1".
• Nunca asumas un ID o sala. Si tenés mínima duda o la base está vacía de ese dato, listale al usuario las opciones reales y preguntale cuál quiso decir.
`;

sm = sm.replace(/━━━━━━━━━━━━━━━━━━━━━━━━\n⚠️ REGLAS DE FORMATO\n━━━━━━━━━━━━━━━━━━━━━━━━[\s\S]*?(?=$)/, newRule.trim() + '\n');
agent.parameters.options.systemMessage = sm;

fs.writeFileSync(f, JSON.stringify(wf, null, 2));
console.log('Saved repair.');
