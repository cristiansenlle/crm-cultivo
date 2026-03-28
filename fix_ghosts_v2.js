const fs = require('fs');

const data = JSON.parse(fs.readFileSync('C:\\\\Users\\\\Cristian\\\\Desktop\\\\n8n-crm-cannabis-workflow-CLEAN.json', 'utf8'));
const wf = data.nodes ? data : data[0]; // just in case

const validNodeNames = new Set(wf.nodes.map(n => n.name));

let ghostConnectionsFound = 0;

for (const sourceNode of Object.keys(wf.connections)) {
    if (!validNodeNames.has(sourceNode)) {
        console.log(`❌ Deleting ghost source node: ${sourceNode}`);
        delete wf.connections[sourceNode]; // THIS was missing in the previous script!
        ghostConnectionsFound++;
        continue;
    }

    // Also check targets just in case
    for (const [outputLabel, outputs] of Object.entries(wf.connections[sourceNode])) {
        for (let i = 0; i < outputs.length; i++) {
            const outConn = outputs[i];
            for (let j = 0; j < outConn.length; j++) {
                const targetEntry = outConn[j];
                if (!validNodeNames.has(targetEntry.node)) {
                    console.log(`❌ Target node missing from nodes list: ${targetEntry.node} (linked from ${sourceNode})`);
                    ghostConnectionsFound++;
                    outConn.splice(j, 1);
                    j--;
                }
            }
        }
    }
}

if (ghostConnectionsFound > 0) {
    fs.writeFileSync('C:\\\\Users\\\\Cristian\\\\Desktop\\\\n8n-crm-cannabis-workflow-FINAL.json', JSON.stringify(wf, null, 2));
    console.log(`Successfully removed ${ghostConnectionsFound} ghost connection references.`);
    console.log('Saved perfect file to: n8n-crm-cannabis-workflow-FINAL.json');
} else {
    console.log('No more ghost connections found. Something else is wrong.');
}
