const fs = require('fs');

try {
    const raw = fs.readFileSync('latest_export.json', 'utf8');
    const data = JSON.parse(raw);

    // The export has an object with key '0'
    const wf = data['0'] || data;

    if (!wf || !wf.nodes) {
        console.error("Could not find nodes array. Keys:", Object.keys(wf));
        process.exit(1);
    }

    console.log("Analyzing Tools in workflow:", wf.name);
    console.log("Total nodes:", wf.nodes.length);

    const tools = wf.nodes.filter(n =>
        n.type.includes('tool') ||
        n.type.includes('function') ||
        n.name.toLowerCase().includes('tool') ||
        n.type.toLowerCase().includes('http') ||
        n.type.includes('langchain')
    );

    for (const tool of tools) {
        let str = JSON.stringify(tool).toLowerCase();
        if (str.includes('sala 1') || str.includes('sala-veg') || str.includes('2500') || str.includes('11111') || str.includes('carpa') || str.includes('test')) {
            console.log('\n--- FOUND SUSPICIOUS STRING IN NODE:', tool.name, '---');
            console.log('Type:', tool.type);

            // Try to find where it is
            if (tool.parameters) {
                if (tool.parameters.description && tool.parameters.description.toLowerCase().includes('sala')) {
                    console.log('In Description:', tool.parameters.description);
                }
                if (tool.parameters.options && tool.parameters.options.systemMessage && tool.parameters.options.systemMessage.toLowerCase().includes('sala')) {
                    console.log('In System Message:', tool.parameters.options.systemMessage.substring(0, 200) + '...');
                }
            }
            console.log('Full JSON Dump (Truncated):', JSON.stringify(tool, null, 2).substring(0, 1000));
        }
    }

} catch (e) {
    console.error("Error:", e.message);
}
