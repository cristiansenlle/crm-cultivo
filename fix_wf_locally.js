const fs = require('fs');

const data = JSON.parse(fs.readFileSync('downloaded_wf.json', 'utf8'));
const wf = Array.isArray(data) ? data[0] : data;

console.log('\\n--- Analyzing Agent and Tool connections ---');

const agentNodes = wf.nodes.filter(n => n.type.includes('agent') || n.type.includes('Agent'));
console.log('Agent nodes found:', agentNodes.map(n => n.name));

const toolNodes = wf.nodes.filter(n => n.type.includes('tool') || n.type.includes('Tool'));
console.log(`Total tool nodes: ${toolNodes.length}`);

let malformedCount = 0;
for (const tool of toolNodes) {
    if (!tool.parameters || !tool.parameters.name) {
        console.log(`❌ Tool node "${tool.name}" is missing parameters.name`);
        malformedCount++;

        // Fix it
        if (!tool.parameters) tool.parameters = {};
        tool.parameters.name = tool.name.replace(/[^a-zA-Z0-9_-]/g, '_');
        console.log(`✅ Fixed tool name to: ${tool.parameters.name}`);
    }
}

// Write the fixed workflow back
if (malformedCount > 0) {
    fs.writeFileSync('fixed_wf.json', JSON.stringify([wf], null, 2));
    console.log('Fixed workflow saved to fixed_wf.json');
} else {
    console.log('No tool nodes missing parameters.name found. Looking deeper.');

    // In LangChain n8n, sometimes it's the `name` property inside the tool's parameters that is literally undefined
    for (const tool of toolNodes) {
        if (tool.parameters && tool.parameters.name === '') {
            console.log(`❌ Tool node "${tool.name}" has an empty name`);
            tool.parameters.name = tool.name.replace(/[^a-zA-Z0-9_-]/g, '_');
        }
    }

    fs.writeFileSync('fixed_wf.json', JSON.stringify([wf], null, 2));
}

