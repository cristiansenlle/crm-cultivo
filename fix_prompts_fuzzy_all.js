const fs = require('fs');
const f = 'C:/Users/Cristian/.gemini/antigravity/crm cannabis/n8n-crm-cannabis-workflow.json';
const wf = JSON.parse(fs.readFileSync(f, 'utf8'));

const agent = wf.nodes.find(n => n.name === 'AI Agent' || n.type === '@n8n/n8n-nodes-langchain.agent');
let sm = agent.parameters.options.systemMessage;

const newRule = `
━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ REGLAS DE FORMATO Y AUTOCORRECCIÓN (¡MUY IMPORTANTE PARA TODOS LOS TOOLS!)
━━━━━━━━━━━━━━━━━━━━━━━━
• ESTA REGLA APLICA A **TODAS** LAS HERRAMIENTAS (Consultas y Cargas). Ya sea para telemetría, ventas, insumos, lotes, o eventos: el usuario suele escribir rápido, incompleto o con errores (ej: "sala 1", "lote 1", "lote veg 2", "telemetria de sala 1", "vendi del lote a").
• Tarea obligatoria: Hacé "fuzzy matching" o autocompletado en tu mente SIEMPRE. Si la base de datos dice "LOTE-A01" (en sala-veg-1) y el usuario dice "Trips en lote 1", vos usás inteligentemente "LOTE-A01". Si el usuario dice "sala veg 1", vos lo transformás a "sala-veg-1".
• ANTES de ejecutar un tool de Carga (POST) que requiera un ID exacto (como batch_id, room_id, o item_id), DEBÉS ejecutar el tool de consulta correspondiente (ej: consultar_lotes, consultar_insumos, consultar_stock_cosechas) silenciosamente para ver la lista real de IDs y mapear la intención del usuario al ID real.
• NUNCA asumas un ID o sala. Si tenés mínima duda, la búsqueda no coincide, o el usuario menciona un número que no existe, listale al usuario las opciones verdaderas de la base de datos y preguntale cuál quiso decir ("¿Te referís a LOTE-A01 o LOTE-B02?").
`;

// Replace the old rule with the universal rule
sm = sm.replace(/━━━━━━━━━━━━━━━━━━━━━━━━\n⚠️ REGLAS DE FORMATO Y AUTOCORRECCIÓN[\s\S]*?(?=$)/, newRule.trim() + '\n');
agent.parameters.options.systemMessage = sm;

fs.writeFileSync(f, JSON.stringify(wf, null, 2));
console.log('Saved repair.');
