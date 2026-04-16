const fs = require('fs');
const f = 'C:/Users/Cristian/.gemini/antigravity/crm cannabis/n8n-crm-cannabis-workflow.json';
const wf = JSON.parse(fs.readFileSync(f, 'utf8'));

// With continueErrorOutput, an Agent node has TWO outputs:
//   output[0] = success   -> goes to Format WA Response
//   output[1] = error     -> goes to AI Agent (Groq Fallback)
// 
// We need to rewire this. The current approach uses "If Gemini Error?" which
// is not needed anymore. We'll keep it simple: wire 
//   Main Agent success (0)  -> Format WA Response
//   Main Agent error   (1)  -> AI Agent (Groq Fallback)

const mainAgentName = 'AI Agent (Function Calling)';
const fallbackAgentName = 'AI Agent (Groq Fallback)';
const formatNodeName = 'Format WA Response';

// Fix connections for main agent
wf.connections[mainAgentName] = {
    main: [
        // output 0 (success): goes directly to Format WA Response
        [{ node: formatNodeName, type: 'main', index: 0 }],
        // output 1 (error): goes to Groq Fallback
        [{ node: fallbackAgentName, type: 'main', index: 0 }]
    ]
};

console.log('Rewired Main AI Agent connections:');
console.log('  Success (0) ->', formatNodeName);
console.log('  Error   (1) ->', fallbackAgentName);

// Verify the Groq Fallback still connects to Format WA Response
const fallbackConns = wf.connections[fallbackAgentName];
console.log('Fallback connections:', JSON.stringify(fallbackConns));

fs.writeFileSync(f, JSON.stringify(wf, null, 2));
console.log('Done.');
