const fs = require('fs');

async function buildV16() {
    console.log('Building V16 JSON Export: OpenRouter + Groq Lite');
    
    // We base it on V12 Import which has the highly-optimized Small Tool Descriptions
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
        // Groq Fallback: Restore to llama-3.1-8b-instant. 
        // This is 100% supported by n8n UI, and will not throw rate limits because 
        // V12 stripped the 1500 tokens of tool schemas!
        if (n.type === '@n8n/n8n-nodes-langchain.lmChatGroq') {
            n.parameters.model = 'llama-3.1-8b-instant';
            n.parameters.options = n.parameters.options || {};
            n.parameters.options.maxTokens = 500;
        }

        // OpenRouter Primary node
        // Convert to OpenRouter directly
        if (n.type === '@n8n/n8n-nodes-langchain.lmChatOpenAi') {
            n.name = "OpenRouter (Gemini Flash)";
            n.parameters.model = "google/gemini-2.5-flash"; // Valid in OpenRouter
            n.parameters.options = n.parameters.options || {};
            n.parameters.options.baseURL = "https://openrouter.ai/api/v1";
            
            // Remove the 100 max token clamp we added in V13, let it answer fully since user paid.
            if (n.parameters.options.maxTokens) {
                delete n.parameters.options.maxTokens; 
            }
            if (n.credentials) n.credentials = {};
        }
    });

    wf.name = wf.name.split('(')[0].trim() + " (V16 OpenRouter Paid)";
    
    const fileOut = "n8n-crm-cannabis-FINAL-V16-OPENROUTER.json";
    fs.writeFileSync(fileOut, JSON.stringify(wf, null, 2));
    
    console.log(`✅ V16 Built Successfully: ${fileOut}`);
}

buildV16();
