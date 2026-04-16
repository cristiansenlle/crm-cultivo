const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\Cristian\\.gemini\\antigravity\\crm cannabis\\full-workflow.json', 'utf8');
const [nodesStr, connsStr] = content.split('|');
const nodes = JSON.parse(nodesStr);
const conns = JSON.parse(connsStr);

console.log('--- Webhook Nodes ---');
nodes.filter(n => n.type === 'n8n-nodes-base.webhook').forEach(n => {
    console.log(`Name: ${n.name}, ID: ${n.id}, Path: ${n.parameters.path}, ResponseMode: ${n.parameters.responseMode || 'onReceived'}`);
    const next = conns[n.name];
    if (next && next.main && next.main[0]) {
        console.log(` -> Connected to: ${next.main[0].map(c => c.node).join(', ')}`);
    } else {
        console.log(' -> NOT CONNECTED');
    }
});
