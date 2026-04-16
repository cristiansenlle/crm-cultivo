const fs = require('fs');
const f = 'C:/Users/Cristian/.gemini/antigravity/crm cannabis/n8n-crm-cannabis-workflow.json';
const wf = JSON.parse(fs.readFileSync(f, 'utf8'));

const SUPABASE_URL = 'https://dvvfdsaqvcyftaaronhd.supabase.co/rest/v1/core_sales';
const ANON_KEY = 'HIDDEN_SECRET_BY_AI';

// 1. Fix cargar_ventas_pos: redirect from local n8n webhook to Supabase directly
['cargar_ventas_pos', 'cargar_ventas_pos_groq'].forEach(toolName => {
    const tool = wf.nodes.find(n => n.name === toolName);
    if (!tool) return;
    tool.parameters.url = SUPABASE_URL;
    tool.parameters.method = 'POST';
    tool.parameters.parametersBody = {
        values: [
            { name: 'tx_id', value: "={{ 'TX-AI-' + Date.now() }}", valueProvider: 'fieldValue' },
            { name: 'item_id', value: '{item_id}', valueProvider: 'fieldValue' },
            { name: 'qty_sold', value: '{qty}', valueProvider: 'fieldValue' },
            { name: 'revenue', value: '{price}', valueProvider: 'fieldValue' },
            { name: 'client', value: '{client}', valueProvider: 'fieldValue' }
        ]
    };
    tool.parameters.parametersHeaders = {
        values: [
            { name: 'apikey', value: ANON_KEY, valueProvider: 'fieldValue' },
            { name: 'Authorization', value: 'Bearer ' + ANON_KEY, valueProvider: 'fieldValue' },
            { name: 'Content-Type', value: 'application/json', valueProvider: 'fieldValue' },
            { name: 'Prefer', value: 'return=representation', valueProvider: 'fieldValue' }
        ]
    };
    // Remove the tx_id placeholder from definitions since it uses a fixed expression
    if (tool.parameters.placeholderDefinitions && tool.parameters.placeholderDefinitions.values) {
        tool.parameters.placeholderDefinitions.values = tool.parameters.placeholderDefinitions.values.filter(
            p => p.name !== 'tx_id'
        );
    }
    console.log('Fixed', toolName, '-> now posts directly to Supabase core_sales');
});

// 2. Harden AI prompt against outputting raw <function=...> syntax
wf.nodes.forEach(n => {
    if (n.type !== '@n8n/n8n-nodes-langchain.agent') return;
    let sm = n.parameters.options.systemMessage || '';
    // Replace the confirmation step rule with execute-first rule (less chat)
    if (!sm.includes('EJECUTA DIRECTAMENTE')) {
        const antiHallucination = `
⚠️ ANTI-ALUCINACIÓN CRÍTICA:
• Cuando el usuario dice "sí", "ok", "confirmo", "dale" o cualquier afirmación → EJECUTA el tool INMEDIATAMENTE en segundo plano sin mostrar ningún JSON.
• JAMÁS muestres texto como "<function=tool_name>..." o "cargar_ventas_pos {...}". Eso es una alucinación grave.
• Si el tool se ejecutó bien → respondé simplemente: "✅ Registrado exitosamente."
• Si el tool falló → explicá el error en lenguaje natural.
`;
        sm = antiHallucination + '\n' + sm;
    }
    n.parameters.options.systemMessage = sm;
});

fs.writeFileSync(f, JSON.stringify(wf, null, 2));
console.log('Done. cargar_ventas_pos now writes directly to Supabase and prompt hardened.');
