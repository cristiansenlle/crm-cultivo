const fs = require('fs');

async function buildV13() {
    console.log('Building V13 JSON Export for GUI Import...');
    
    const d = new Date();
    const strDate = d.toISOString().split('T')[0];
    // Start from V12 Lite which is extremely optimized
    const sourceFile = 'n8n-crm-cannabis-FINAL-V12-IMPORT.json';
    
    let data;
    try {
        data = fs.readFileSync(sourceFile, 'utf8');
    } catch(e) {
        console.error('Cannot find V12 file:', sourceFile);
        return;
    }
    
    let wf = JSON.parse(data);

    wf.nodes.forEach(n => {
        // Upgrade explicitly to Mixtral, which has 14,400 TPM Limit 
        // AND is officially supported by older N8N clients.
        if (n.type === '@n8n/n8n-nodes-langchain.lmChatGroq') {
            n.parameters.model = 'mixtral-8x7b-32768';
        }

        // Clip OpenRouter max Tokens to 100 just to avoid the "134" error,
        // although OpenRouter is basically exhausted.
        if (n.type === '@n8n/n8n-nodes-langchain.lmChatOpenAi') {
            n.parameters.options = n.parameters.options || {};
            n.parameters.options.maxTokens = 100;
        }
    });

    wf.name = wf.name.split('(')[0].trim() + " (V13 Mixtral)";
    
    const fileOut = "n8n-crm-cannabis-FINAL-V13.json";
    fs.writeFileSync(fileOut, JSON.stringify(wf, null, 2));
    
    console.log(`✅ V13 Built Successfully: ${fileOut}`);
}

buildV13();
