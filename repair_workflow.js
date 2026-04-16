const fs = require('fs');

function repairWorkflow() {
    const filePath = 'n8n-crm-cannabis-workflow.json';
    const wf = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    const nodeNames = new Set(wf.nodes.map(n => n.name));
    console.log(`Original nodes: ${wf.nodes.length}`);
    console.log(`Original connection sources: ${Object.keys(wf.connections).length}`);

    // 1. Remove connections from non-existent nodes
    for (const sourceNode in wf.connections) {
        if (!nodeNames.has(sourceNode)) {
            console.log(`Removing ghost connection source: ${sourceNode}`);
            delete wf.connections[sourceNode];
        }
    }

    // 2. Remove connections to non-existent nodes
    for (const sourceNode in wf.connections) {
        for (const type in wf.connections[sourceNode]) {
            wf.connections[sourceNode][type] = wf.connections[sourceNode][type].map(pipeGroup => {
                return pipeGroup.filter(conn => {
                    if (!nodeNames.has(conn.node)) {
                        console.log(`Removing ghost link: ${sourceNode} -> ${conn.node}`);
                        return false;
                    }
                    return true;
                });
            });
        }
    }

    // 3. One more check: are there any nodes with unrecognized types?
    // (We already replaced executeCommand with httpRequest in previous steps, 
    // but let's check if any survived or have invalid type strings)
    wf.nodes.forEach(node => {
        if (node.type === 'n8n-nodes-base.executeCommand') {
            console.log(`WARNING: Node ${node.name} still has type n8n-nodes-base.executeCommand. Fixing...`);
            node.type = 'n8n-nodes-base.httpRequest';
            node.parameters = node.parameters || {};
            node.parameters.httpMethod = 'GET';
            node.parameters.url = 'https://google.com'; // Placeholder
        }
    });

    fs.writeFileSync(filePath, JSON.stringify(wf, null, 2));
    console.log('Workflow repaired and saved.');
}

repairWorkflow();
