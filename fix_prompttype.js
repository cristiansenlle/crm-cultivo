const fs = require('fs');
const f = 'C:/Users/Cristian/.gemini/antigravity/crm cannabis/n8n-crm-cannabis-workflow.json';
const wf = JSON.parse(fs.readFileSync(f, 'utf8'));

wf.nodes.forEach(n => {
    if (n.type === '@n8n/n8n-nodes-langchain.agent') {
        // CRITICAL: promptType must be 'define' so n8n reads from the 'text' field
        if (!n.parameters.options) n.parameters.options = {};
        n.parameters.options.promptType = 'define';

        // Make sure the text expression is correct: 
        // The Webhook sends body as { body: { body: "message text", sessionId: "...", hasMedia: false } }
        // The n8n AI Agent 'text' param is NOT inside 'options', it's a top-level parameter
        n.parameters.text = "={{ $json?.body?.body || $json?.body?.text || $json?.text || '' }}";

        console.log('Fixed promptType + text for:', n.name);
    }
});

fs.writeFileSync(f, JSON.stringify(wf, null, 2));
console.log('Done. IMPORTANT: promptType was undefined before, AI Agent was not reading the user message!');
