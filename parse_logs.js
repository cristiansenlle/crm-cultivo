const fs = require('fs');
['exec_78.json', 'exec_82.json'].forEach(file => {
    try {
        const data = fs.readFileSync(file, 'utf8').trim();
        let parsed = JSON.parse(data);
        console.log("=== " + file + " ===");
        const steps = parsed.resultData.runData;
        Object.keys(steps).forEach(node => {
            const toolCalls = steps[node].filter(r => r.data && r.data.main && r.data.main[0]);
            if (toolCalls.length > 0) {
                console.log('Node:', node);
                toolCalls.forEach((run, i) => {
                    const itemData = run.data.main[0].map(item => item.json);
                    console.log(`  Run ${i}:`, JSON.stringify(itemData, null, 2));
                });
            }
        });
    } catch(e) {
        console.error("Error parsing " + file, e.message);
    }
});
