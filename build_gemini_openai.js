const fs = require('fs');

async function buildV14() {
    console.log('Building Hybrid Gemini & OpenAI GPT-5.4 JSON Export...');
    
    const sourceFile = 'n8n-crm-cannabis-FINAL-V12-IMPORT.json';
    
    let data;
    try {
        data = fs.readFileSync(sourceFile, 'utf8');
    } catch(e) {
        console.error('Cannot find V12 file:', sourceFile);
        return;
    }
    
    let wf = JSON.parse(data);

    // Track old names to patch connections map
    const oldGroq = "Groq (Llama 70B Versatile)";
    const newGemini = "Google Gemini (Gratis)";
    
    const oldOR = "OpenRouter (GPT-OSS 120B)";
    const newOpenAI = "OpenAI (GPT-5.4 Nano)";

    // 1. Modificar Nodos
    wf.nodes.forEach(n => {
        // Swap Groq to Google Gemini
        if (n.type === '@n8n/n8n-nodes-langchain.lmChatGroq') {
            n.type = '@n8n/n8n-nodes-langchain.lmChatGoogleGemini';
            n.name = newGemini;
            n.parameters = { 
                model: "gemini-1.5-flash",
                options: {} 
            };
            if(n.credentials) n.credentials = {}; // force asking for credentials
        }

        // Swap OpenRouter to native OpenAI GPT-5.4 Nano
        if (n.type === '@n8n/n8n-nodes-langchain.lmChatOpenAi' && n.name === oldOR) {
            n.name = newOpenAI;
            // Use expression to bypass GUI strict-value checks for new GPT-5.x names
            n.parameters = { 
                model: "={{ 'gpt-5.4-nano' }}",
                options: {} 
            };
            if(n.credentials) n.credentials = {};
        }
    });

    // 2. Modificar Conexiones Visuales de n8n
    // Connection routing depends heavily on node names.
    let connStr = JSON.stringify(wf.connections);
    connStr = connStr.split(oldGroq).join(newGemini);
    connStr = connStr.split(oldOR).join(newOpenAI);
    wf.connections = JSON.parse(connStr);

    wf.name = wf.name.split('(')[0].trim() + " (Gemini + GPT-5.4)";
    
    const fileOut = "n8n-crm-cannabis-GEMINI-OPENAI.json";
    fs.writeFileSync(fileOut, JSON.stringify(wf, null, 2));
    
    console.log(`✅ Hybrid Workflow Built Successfully: ${fileOut}`);
}

buildV14();
