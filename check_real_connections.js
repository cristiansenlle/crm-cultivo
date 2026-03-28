const fs = require('fs');
const file = 'C:/Users/Cristian/.gemini/antigravity/crm cannabis/active_wf_patched.json';
const wf = JSON.parse(fs.readFileSync(file, 'utf8'));

console.log("Looking for connections that point to 'AI Agent (Function Calling)'...");
for (const [sourceNode, connectionData] of Object.entries(wf.connections)) {
    if (connectionData.main) {
        for (const port in connectionData.main) {
            const targets = connectionData.main[port];
            if (targets && targets.length > 0) {
                for (const target of targets) {
                    if (target.node && target.node.includes('Agent')) {
                        console.log(`Source: '${sourceNode}' -> Target: '${target.node}' (type: ${target.type}, index: ${target.index}) via main[${port}]`);
                    }
                }
            }
        }
    }
    
    // Check if there are other keys besides 'main'
    const otherKeys = Object.keys(connectionData).filter(k => k !== 'main');
    if (otherKeys.length > 0) {
        for (const key of otherKeys) {
            const ports = connectionData[key];
            for (const port in ports) {
                 const targets = ports[port];
                 if (targets && targets.length > 0) {
                     for (const target of targets) {
                         if (target.node && target.node.includes('Agent')) {
                             console.log(`Source: '${sourceNode}' -> Target: '${target.node}' (type: ${target.type}, index: ${target.index}) via ${key}[${port}]`);
                         }
                     }
                 }
            }
        }
    }
}
