const fs = require('fs');
const txt = fs.readFileSync('latest_execs.txt', 'utf8');

const lines = txt.split('\\n').filter(x => x.includes('|{'));

lines.forEach(line => {
    try {
        const parts = line.split('|');
        const id = parts[0];
        const jsonStr = parts.slice(1).join('|');
        const data = JSON.parse(jsonStr);
        
        console.log(`\n========= EXECUTION ${id} =========`);
        
        const nodesExecuted = Object.keys(data.resultData.runData);
        console.log("NODES EXECUTED:");
        nodesExecuted.forEach(n => console.log(" -", n));
        
    } catch(e) {
        console.log("Error line:", e.message);
    }
});
