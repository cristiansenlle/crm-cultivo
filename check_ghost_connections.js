const fs = require('fs');

const wfArray = JSON.parse(fs.readFileSync('downloaded_wf_latest.json', 'utf8'));
const wf = wfArray[0] || wfArray;

// Build a Set of all valid node names
const validNodeNames = new Set(wf.nodes.map(n => n.name));

console.log('\\n--- Checking for Ghost Connections ---');

let ghostConnectionsFound = 0;

for (const [sourceNode, connectionData] of Object.entries(wf.connections)) {
    if (!validNodeNames.has(sourceNode)) {
        console.log(`❌ Source node missing from nodes list: ${sourceNode}`);
        ghostConnectionsFound++;
    }

    for (const [outputLabel, outputs] of Object.entries(connectionData)) {
        for (let i = 0; i < outputs.length; i++) {
            const outConn = outputs[i];
            for (let j = 0; j < outConn.length; j++) {
                const targetEntry = outConn[j];
                if (!validNodeNames.has(targetEntry.node)) {
                    console.log(`❌ Target node missing from nodes list: ${targetEntry.node} (linked from ${sourceNode})`);
                    ghostConnectionsFound++;

                    // Remove the ghost connection
                    outConn.splice(j, 1);
                    j--;
                }
            }
        }
    }
}

if (ghostConnectionsFound > 0) {
    console.log(`\\nFixed ${ghostConnectionsFound} ghost connections. Saving to fixed_ghosts.json...`);
    fs.writeFileSync('fixed_ghosts.json', JSON.stringify([wf], null, 2));
} else {
    console.log('No ghost connections found! Looking for something else...');
    // Let's check Memory nodes and Agent properties.
    const agents = wf.nodes.filter(n => n.type.includes('Agent'));
    agents.forEach(a => console.log('Agent:', a.name, 'parameters:', Object.keys(a.parameters)));
}

