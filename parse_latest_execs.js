const fs = require('fs');
const txt = fs.readFileSync('latest_execs.txt', 'utf8');

// The file format is likely `EXEC_ID|{"data":...}` 
const lines = txt.split('\\n').filter(x => x.includes('|{'));

lines.forEach(line => {
    try {
        const parts = line.split('|');
        const id = parts[0];
        const jsonStr = parts.slice(1).join('|');
        const data = JSON.parse(jsonStr);
        
        console.log(`\n========= EXECUTION ${id} =========`);
        
        // Find the AI node
        const aiNodes = [];
        for (const [nodeName, nodeData] of Object.entries(data.resultData.runData)) {
            if (nodeName.includes('AI Agent')) {
                 aiNodes.push(nodeData);
            }
        }
        
        if (aiNodes.length === 0) {
            console.log("No AI Agent node in this execution.");
        } else {
            aiNodes.forEach(nodeData => {
                const lastRun = nodeData[nodeData.length - 1]; // get latest attempt
                if(lastRun.data && lastRun.data.main && lastRun.data.main[0] && lastRun.data.main[0][0]) {
                     console.log("AI OUTPUT:", lastRun.data.main[0][0].json.output);
                }
                
                // Print the tools used if available in hints/execution data
                // N8N often stores sub-node executions in another property
                
            });
        }
        
        // Let's also find the tools that were run
        for (const [nodeName, nodeData] of Object.entries(data.resultData.runData)) {
            if (nodeName.includes('consultar_')) {
                 console.log(`\nTOOL CALLED: ${nodeName}`);
                 const lastRun = nodeData[nodeData.length - 1];
                 if(lastRun.data && lastRun.data.main && lastRun.data.main[0] && lastRun.data.main[0][0]) {
                     // print the first item returned
                     console.log("FIRST RETURNED ITEM:", JSON.stringify(lastRun.data.main[0][0].json, null, 2));
                 }
            }
        }
        
    } catch(e) {
        console.log("Error parsing a line:", e.message);
    }
});
