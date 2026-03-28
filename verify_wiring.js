const fs = require('fs');
const f = 'C:/Users/Cristian/.gemini/antigravity/crm cannabis/n8n-crm-cannabis-workflow.json';
const wf = JSON.parse(fs.readFileSync(f, 'utf8'));

console.log('--- VERIFICACIÓN DE TOOLS ---');
let tools = wf.nodes.filter(n => n.type === '@n8n/n8n-nodes-langchain.toolHttpRequest');
console.log(`Tools HTTP Encontrados: ${tools.length}`);

const agentNode1 = 'AI Agent (Function Calling)';
const agentNode2 = 'AI Agent (Groq Fallback)';

tools.forEach(t => {
    const conns = wf.connections[t.name] || {};
    const ai_tool = conns.ai_tool || [];
    let isConnectedTo1 = false;
    let isConnectedTo2 = false;

    ai_tool.forEach(routes => {
        routes.forEach(dest => {
            if (dest.node === agentNode1) isConnectedTo1 = true;
            if (dest.node === agentNode2) isConnectedTo2 = true;
        });
    });

    if (isConnectedTo1 && isConnectedTo2) {
        console.log(`✅ ${t.name} (Conectado a ambos agentes)`);
    } else {
        console.log(`❌ ${t.name} (Conectado a: ${isConnectedTo1 ? 'Agent1' : ''} ${isConnectedTo2 ? 'Agent2' : ''})`);
    }
});

console.log('\n--- VERIFICACIÓN DE MODELOS LLM ---');
const llm1 = wf.nodes.find(n => n.name === 'OpenRouter (Llama 3.3)');
const llm2 = wf.nodes.find(n => n.name === 'OpenRouter (Gemini Flash)');

console.log(`LLM Principal: ${llm1 ? '✅ OpenRouter Llama 3.3 (meta-llama/llama-3.3-70b-instruct:free)' : '❌ Faltante'}`);
console.log(`LLM Respaldo:  ${llm2 ? '✅ OpenRouter Gemini Flash (google/gemini-2.5-flash:free)' : '❌ Faltante'}`);

console.log('\n--- VERIFICACIÓN DE FALLBACK ---');
const agent1Conns = wf.connections[agentNode1] || {};
const ifNodeOutputs = wf.connections['If Gemini Error?'] || {};
let fallbackRouteExists = false;

if (agent1Conns.main && agent1Conns.main.length > 0) {
    if (agent1Conns.main[0].some(c => c.node === 'If Gemini Error?')) {
        const errorRoutes = ifNodeOutputs.main ? ifNodeOutputs.main[0] : [];
        if (errorRoutes.some(c => c.node === agentNode2)) {
            fallbackRouteExists = true;
        }
    }
}
console.log(`Ruta de Fallback Agent1 -> IF -> Agent2: ${fallbackRouteExists ? '✅' : '❌'}`);

// Let's make sure BOTH AI Agents are connected to their LLMs.
const lm1Conns = wf.connections['OpenRouter (Llama 3.3)'] || {};
const lm2Conns = wf.connections['OpenRouter (Gemini Flash)'] || {};

const connectsToAgent1 = lm1Conns.ai_languageModel?.some(routes => routes.some(c => c.node === agentNode1));
const connectsToAgent2 = lm2Conns.ai_languageModel?.some(routes => routes.some(c => c.node === agentNode2));

console.log(`LLM1 -> Agent1: ${connectsToAgent1 ? '✅' : '❌'}`);
console.log(`LLM2 -> Agent2: ${connectsToAgent2 ? '✅' : '❌'}`);
