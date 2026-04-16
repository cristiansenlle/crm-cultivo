const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('n8n-crm-cannabis-workflow.json', 'utf8'));
const nodes = wf.nodes || [];

const SALES_INSTRUCTION = `
VENTAS - REGLAS CRÍTICAS PARA cargar_ventas_pos:
• El tool necesita: item_id (ej: LOTE-A01), qty (gramos), revenue (TOTAL = qty × precio_por_gramo), client (walk_in | vip_1 | wholesale_1), date (fecha ISO actual)
• SIEMPRE calculá revenue = qty × precio_por_g ANTES de llamar al tool
• El campo date SIEMPRE debe ser la fecha/hora actual en formato ISO: usa "{{new Date().toISOString()}}" si el sistema lo permite, o preguntale al usuario la fecha solo si no podés generarla.
• Ejemplo: 30g × $7500/g → revenue = 225000
`;

let updated = 0;
nodes.forEach(n => {
    if (n.type === '@n8n/n8n-nodes-langchain.agent' && n.parameters && n.parameters.options && n.parameters.options.systemMessage) {
        const msg = n.parameters.options.systemMessage;
        if (!msg.includes('revenue = qty')) {
            // Find DATOS REQUERIDOS POR TOOL section and add sales info
            const target = '• crear_lote → Lote (batch_id)';
            if (msg.includes(target)) {
                n.parameters.options.systemMessage = msg.replace(
                    'DATOS REQUERIDOS POR TOOL:',
                    'DATOS REQUERIDOS POR TOOL:' + SALES_INSTRUCTION
                );
                console.log('Updated agent:', n.name);
                updated++;
            }
        }
    }
});

console.log('Updated agents:', updated);
if (updated > 0) {
    fs.writeFileSync('n8n-crm-cannabis-workflow.json', JSON.stringify(wf, null, 2));
    console.log('Saved!');
}
