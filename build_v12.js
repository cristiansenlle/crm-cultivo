const fs = require('fs');

async function buildV12() {
    console.log('Building V12 Lite JSON Export for GUI Import...');
    
    // Read the stable V11 file which already has K=0 and MicroPrompt
    const d = new Date();
    const strDate = d.toISOString().split('T')[0];
    const sourceFile = 'n8n-crm-cannabis-FINAL-V11-' + strDate + '.json';
    
    let data;
    try {
        data = fs.readFileSync(sourceFile, 'utf8');
    } catch(e) {
        console.error('Cannot find V11 file:', sourceFile);
        return;
    }
    
    let wf = JSON.parse(data);
    let totalDescriptionsShortened = 0;

    wf.nodes.forEach(n => {
        // Ensure Llama 3.1 8B so the N8N UI accepts the import
        if (n.type === '@n8n/n8n-nodes-langchain.lmChatGroq') {
            n.parameters.model = 'llama-3.1-8b-instant';
        }
        
        // Attack the hidden schema bloat inside Tool Nodes
        if (n.type === '@n8n/n8n-nodes-langchain.toolHttpRequest') {
            if (n.parameters && n.parameters.placeholderDefinitions && n.parameters.placeholderDefinitions.values) {
                n.parameters.placeholderDefinitions.values.forEach(v => {
                    if (v.description) {
                        // Keep only the first sentence or up to 40 chars to obliterate token usage
                        let shortDesc = v.description.split('.')[0].substring(0, 40) + '.';
                        v.description = shortDesc;
                        totalDescriptionsShortened++;
                    }
                });
            }
        }
    });

    wf.name = wf.name.split('(')[0].trim() + " (V12 Lite Import)";
    
    const fileOut = "n8n-crm-cannabis-FINAL-V12-IMPORT.json";
    fs.writeFileSync(fileOut, JSON.stringify(wf, null, 2));
    
    console.log(`✅ V12 Built Successfully: ${fileOut}`);
    console.log(`🔪 Stripped ${totalDescriptionsShortened} hidden API parameter descriptions to save ~1500 tokens.`);
}

buildV12();
