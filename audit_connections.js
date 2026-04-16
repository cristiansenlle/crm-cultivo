const fs = require('fs');

const data = JSON.parse(fs.readFileSync('wf_inspect.json', 'utf8'))[0];

function parseN8nField(field) {
    if (field && field.data && Array.isArray(field.data)) {
        return JSON.parse(Buffer.from(field.data).toString());
    }
    return field;
}

const connections = parseN8nField(data.connections);
const nodes = parseN8nField(data.nodes);

const fallbackAgent = "AI Agent (Groq Fallback)";
const respondNode = "Format WA Response";

console.log(`Checking connections for ${fallbackAgent}...`);
console.log(JSON.stringify(connections[fallbackAgent], null, 2));

console.log(`Checking if ${respondNode} is connected to ${fallbackAgent} or its children...`);
// Walk the connections from fallbackAgent
function findTarget(sourceName, depth = 0) {
    if (depth > 5) return false;
    const conns = connections[sourceName];
    if (!conns || !conns.main) return false;
    
    for (const group of conns.main) {
        for (const target of group) {
            console.log(`  -> ${target.node}`);
            if (target.node === respondNode) return true;
            if (findTarget(target.node, depth + 1)) return true;
        }
    }
    return false;
}

const isConnected = findTarget(fallbackAgent);
console.log(`\nIs Fallback Agent connected to ${respondNode}? ${isConnected}`);
