const fs = require('fs');
const f = 'C:/Users/Cristian/.gemini/antigravity/crm cannabis/n8n-crm-cannabis-workflow.json';
const wf = JSON.parse(fs.readFileSync(f, 'utf8'));

// Fix IF node condition - n8n evaluates {{ $json.error }} to string "undefined"
// which isNotEmpty treats as truthy, always routing to Groq even when Gemini succeeds.
// Fix: use a proper JavaScript boolean expression instead.
const ifNode = wf.nodes.find(n => n.name === 'If Gemini Error?');
if (ifNode) {
    // Replace with a JS expression condition that properly checks for error existence
    ifNode.parameters = {
        conditions: {
            boolean: [
                {
                    value1: '={{ typeof $json.error !== "undefined" && $json.error !== null && $json.error !== "" }}',
                    value2: true
                }
            ]
        }
    };
    console.log('Fixed IF node: now uses strict JS boolean check for error');
}

// Also ensure continueOnFail is on Gemini agent
const geminiAgent = wf.nodes.find(n => n.name === 'AI Agent (Function Calling)');
if (geminiAgent) {
    geminiAgent.continueOnFail = true;
    console.log('Confirmed: Gemini agent continueOnFail = true');
}

// Make sure Groq agent also has continueOnFail to prevent crashes if Groq also fails
const groqAgent = wf.nodes.find(n => n.name === 'AI Agent (Groq Fallback)');
if (groqAgent) {
    groqAgent.continueOnFail = true;
    console.log('Added: Groq agent continueOnFail = true (safety net)');
}

fs.writeFileSync(f, JSON.stringify(wf, null, 2));
console.log('Done. IF node condition fixed.');
