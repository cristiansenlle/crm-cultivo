const fs = require('fs');
try {
    const data = fs.readFileSync('last_execution.json', 'utf8').trim();
    let parsed = JSON.parse(data);
    const steps = parsed.resultData.runData;
    
    // Check if AI Agent run data exists
    if(steps['AI Agent (Function Calling)']) {
         console.log('AI AGENT DATA:');
         console.log(JSON.stringify(steps['AI Agent (Function Calling)'][0].data.main[0], null, 2).substring(0, 3000));
    }
    
    Object.keys(steps).forEach(node => {
        const toolCalls = steps[node].filter(r => r.data && r.data.main && r.data.main[0]);
        if (toolCalls.length > 0) {
            console.log('Node:', node);
            toolCalls.forEach((run, i) => {
                const itemData = run.data.main[0].map(item => item.json);
                console.log(`  Run ${i}:`, JSON.stringify(itemData).substring(0, 300));
            });
        }
    });
} catch(e) {
    console.error('Error parsing', e.message);
}
