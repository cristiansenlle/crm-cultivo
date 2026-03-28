const fs = require('fs');
const f = 'C:/Users/Cristian/.gemini/antigravity/crm cannabis/n8n-crm-cannabis-workflow.json';
const wf = JSON.parse(fs.readFileSync(f, 'utf8'));

const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2dmZkc2FxdmN5ZnRhYXJvbmhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MDAzMzksImV4cCI6MjA4NzQ3NjMzOX0.u6LeadPF3nqYq3Rb09ykVN_9Gbf80VCcWc8nEYwmJgk';
const SUPABASE_URL = 'https://dvvfdsaqvcyftaaronhd.supabase.co/rest/v1/core_sales';

// Fix 1: Switch cargar_ventas_pos to JSON body mode (keypair was sending form-encoded)
['cargar_ventas_pos', 'cargar_ventas_pos_groq'].forEach(toolName => {
    const tool = wf.nodes.find(n => n.name === toolName);
    if (!tool) { console.log('NOT FOUND:', toolName); return; }

    tool.parameters.url = SUPABASE_URL;
    tool.parameters.method = 'POST';
    tool.parameters.sendBody = true;
    tool.parameters.specifyBody = 'json';
    // JSON body with placeholder substitution - tx_id auto-generated server-side via NOW()
    tool.parameters.jsonBody = '{ "item_id": "{item_id}", "qty_sold": {qty}, "revenue": {price}, "client": "{client}" }';
    // Remove old keypair body
    delete tool.parameters.parametersBody;

    // Ensure headers exist and are correct
    tool.parameters.sendHeaders = true;
    tool.parameters.parametersHeaders = {
        values: [
            { name: 'apikey', value: ANON_KEY, valueProvider: 'fieldValue' },
            { name: 'Authorization', value: 'Bearer ' + ANON_KEY, valueProvider: 'fieldValue' },
            { name: 'Content-Type', value: 'application/json', valueProvider: 'fieldValue' },
            { name: 'Prefer', value: 'return=representation', valueProvider: 'fieldValue' }
        ]
    };
    console.log('Fixed', toolName, '-> JSON body mode');
});

// Fix 2: Switch primary LLM from llama-3.1-8b-instant to llama-3.3-70b-versatile
// to fix persistent function call hallucination
const primaryLLM = wf.nodes.find(n => n.name === 'Groq (Llama 8B Instant)');
if (primaryLLM) {
    const old = primaryLLM.parameters.model;
    primaryLLM.parameters.model = 'llama-3.3-70b-versatile';
    primaryLLM.name = 'Groq (Llama 70B Versatile)';
    // Update connections to use new name
    if (wf.connections['Groq (Llama 8B Instant)']) {
        wf.connections['Groq (Llama 70B Versatile)'] = wf.connections['Groq (Llama 8B Instant)'];
        delete wf.connections['Groq (Llama 8B Instant)'];
    }
    console.log('Switched primary LLM:', old, '-> llama-3.3-70b-versatile');
}

fs.writeFileSync(f, JSON.stringify(wf, null, 2));
console.log('Done.');
