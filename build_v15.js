const fs = require('fs');

async function buildV15() {
    console.log('Building V15 Expression-Bypass JSON Export...');
    
    // Read the mixed Gemini/OpenAI file
    const sourceFile = 'n8n-crm-cannabis-GEMINI-OPENAI.json';
    
    let data;
    try {
        data = fs.readFileSync(sourceFile, 'utf8');
    } catch(e) {
        console.error('Cannot find V14 file:', sourceFile);
        return;
    }
    
    let wf = JSON.parse(data);

    wf.nodes.forEach(n => {
        // Force the Gemini model string to an N8N Expression to bypass the frontend validation list!
        if (n.type === '@n8n/n8n-nodes-langchain.lmChatGoogleGemini') {
            n.parameters.model = "={{ 'models/gemini-1.5-flash' }}";
        }

        // Just to ensure OpenAI expression doesn't trigger formatting issues
        if (n.type === '@n8n/n8n-nodes-langchain.lmChatOpenAi') {
            n.parameters.model = "={{ 'gpt-4o-mini' }}";
        }
    });

    wf.name = wf.name.split('(')[0].trim() + " (V15 Model Override)";
    
    const fileOut = "n8n-crm-cannabis-FINAL-V15-EXPRESSIONS.json";
    fs.writeFileSync(fileOut, JSON.stringify(wf, null, 2));
    
    console.log(`✅ V15 Built Successfully: ${fileOut}`);
}

buildV15();
