const fs = require('fs');
const f = 'C:/Users/Cristian/.gemini/antigravity/crm cannabis/n8n-crm-cannabis-workflow.json';
const wf = JSON.parse(fs.readFileSync(f, 'utf8'));

const MAIN_AGENT = 'AI Agent (Function Calling)';
const FALLBACK_AGENT = 'AI Agent (Groq Fallback)';

let fixedTools = 0;
let fixedLLMs = 0;
let fixedMemory = 0;

for (const [nodeName, conn] of Object.entries(wf.connections)) {
    // Fix orphaned ai_tool connections
    if (conn.ai_tool) {
        conn.ai_tool.forEach(outputs => {
            outputs.forEach(target => {
                // If a _groq tool points to wrong agent
                if (nodeName.endsWith('_groq') && target.node !== FALLBACK_AGENT) {
                    console.log('FIX tool ' + nodeName + ': ' + target.node + ' -> ' + FALLBACK_AGENT);
                    target.node = FALLBACK_AGENT;
                    fixedTools++;
                }
                // If a non-groq tool points to wrong agent
                if (!nodeName.endsWith('_groq') && target.node !== MAIN_AGENT) {
                    console.log('FIX tool ' + nodeName + ': ' + target.node + ' -> ' + MAIN_AGENT);
                    target.node = MAIN_AGENT;
                    fixedTools++;
                }
            });
        });
    }
}

console.log('Fixed ' + fixedTools + ' tool connections.');

// Also verify LLM connections are correct
for (const [nodeName, conn] of Object.entries(wf.connections)) {
    if (conn.ai_languageModel) {
        conn.ai_languageModel.forEach(outputs => {
            outputs.forEach(target => {
                console.log('LLM ' + nodeName + ' -> ' + target.node);
            });
        });
    }
    if (conn.ai_memory) {
        conn.ai_memory.forEach(outputs => {
            outputs.forEach(target => {
                console.log('Memory -> ' + target.node);
            });
        });
    }
}

fs.writeFileSync(f, JSON.stringify(wf, null, 2));
console.log('Done. Saved.');
