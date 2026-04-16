const fs = require('fs');

function analyzeTools(txt) {
    if (!txt) return;
    const lines = txt.split('\\n');
    for (const line of lines) {
        if (!line.includes('|[')) continue;
        const id = line.split('|')[0];
        const jsonStr = line.substring(id.length + 1);
        try {
            const arr = JSON.parse(jsonStr);
            if (!Array.isArray(arr)) continue;
            
            console.log(`\n========= EXECUTION ${id} =========`);
            
            // Search for "tool" or "name" in the flatted array to see what tools were called
            const toolCalls = [];
            for (let i = 0; i < arr.length; i++) {
                const item = arr[i];
                if (item && typeof item === 'object') {
                    if (item.lc === 1 && item.id && item.id[item.id.length - 1] === 'ToolMessage') {
                         console.log("TOOL MESSAGE FIRED:", item.kwargs.name);
                    }
                    if (item.type === 'tool_calls' || (item.kwargs && item.kwargs.tool_calls)) {
                        const tc = item.tool_calls || item.kwargs.tool_calls;
                        if (Array.isArray(tc)) {
                            tc.forEach(t => console.log("AI REQUESTED TOOL:", t.name));
                        }
                    }
                }
            }
        } catch(e) {}
    }
}

analyzeTools(fs.readFileSync('latest_execs.txt', 'utf8'));
