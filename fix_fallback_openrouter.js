const fs = require('fs');
const f = 'C:/Users/Cristian/.gemini/antigravity/crm cannabis/n8n-crm-cannabis-workflow.json';
const wf = JSON.parse(fs.readFileSync(f, 'utf8'));

// Update the fallback LLM node to use OpenRouter with gpt-oss-120b
const fallbackLLM = wf.nodes.find(n => n.name === 'Groq (Gemma Fallback)');
if (fallbackLLM) {
    const oldType = fallbackLLM.type;
    const oldName = fallbackLLM.name;

    // Change type to OpenRouter LangChain node
    fallbackLLM.type = '@n8n/n8n-nodes-langchain.lmChatOpenRouter';
    fallbackLLM.typeVersion = 1;
    fallbackLLM.name = 'OpenRouter (GPT-OSS 120B)';
    fallbackLLM.parameters = {
        model: 'openai/gpt-oss-120b'
    };
    // Remove Groq credential, use OpenRouter credential
    fallbackLLM.credentials = {
        openRouterApi: {
            id: '',
            name: 'OpenRouter'
        }
    };

    // Update connections from old name to new name
    if (wf.connections[oldName]) {
        wf.connections[fallbackLLM.name] = wf.connections[oldName];
        delete wf.connections[oldName];
    }

    console.log('Updated fallback LLM:', oldName, '->', fallbackLLM.name);
    console.log('Old type:', oldType, '-> New type:', fallbackLLM.type);
} else {
    console.log('Fallback LLM node not found. Available LLM nodes:');
    wf.nodes.filter(n => n.type && n.type.includes('ChatModel') || n.type && n.type.includes('OpenRouter')).forEach(n => {
        console.log(' -', n.name, n.type);
    });
}

fs.writeFileSync(f, JSON.stringify(wf, null, 2));
console.log('Done. Reimportá en n8n y configurá la credential OpenRouter en el nodo Fallback.');
