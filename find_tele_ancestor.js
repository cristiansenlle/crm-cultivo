const fs = require('fs');

try {
    const raw = fs.readFileSync('workflow_full.json', 'utf16le');
    // The format is nodes|connections
    const parts = raw.split('|');
    if (parts.length < 2) {
        console.log('Could not split nodes and connections');
        process.exit(1);
    }
    
    // Find the start of JSON for nodes and connections
    const nodesStr = parts[0].substring(parts[0].indexOf('['));
    const connectionsStr = parts[1].trim();

    const nodes = JSON.parse(nodesStr);
    const connections = JSON.parse(connectionsStr);

    const targetNodeName = "PG Insert WA TM";
    
    // Find who connects to this node
    let sourceNodeName = null;
    for (const [nodeName, nodeConns] of Object.entries(connections)) {
        for (const [main, outputs] of Object.entries(nodeConns)) {
            for (const output of outputs) {
                for (const dest of output) {
                    if (dest.node === targetNodeName) {
                        sourceNodeName = nodeName;
                        break;
                    }
                }
            }
        }
    }

    console.log(`Node feeding into "${targetNodeName}": ${sourceNodeName}`);
    
    const sourceNode = nodes.find(n => n.name === sourceNodeName);
    console.log('Source Node Definition:', JSON.stringify(sourceNode, null, 2));

} catch (e) {
    console.error(e);
}
