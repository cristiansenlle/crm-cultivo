const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'n8n-crm-cannabis-workflow.json');
const workflow = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// The logic is in the connections object
const connections = workflow.connections;

console.log('Original connections for models:');
console.log('Groq (Llama 70B Versatile):', JSON.stringify(connections['Groq (Llama 70B Versatile)'], null, 2));
console.log('OpenRouter (GPT-OSS 120B):', JSON.stringify(connections['OpenRouter (GPT-OSS 120B)'], null, 2));

// Swap them
// 1. OpenRouter should go to "AI Agent (Function Calling)"
if (connections['OpenRouter (GPT-OSS 120B)']) {
    connections['OpenRouter (GPT-OSS 120B)'].ai_languageModel[0][0].node = 'AI Agent (Function Calling)';
}

// 2. Groq should go to "AI Agent (Groq Fallback)"
if (connections['Groq (Llama 70B Versatile)']) {
    connections['Groq (Llama 70B Versatile)'].ai_languageModel[0][0].node = 'AI Agent (Groq Fallback)';
}

console.log('\nNew connections for models:');
console.log('Groq (Llama 70B Versatile):', JSON.stringify(connections['Groq (Llama 70B Versatile)'], null, 2));
console.log('OpenRouter (GPT-OSS 120B):', JSON.stringify(connections['OpenRouter (GPT-OSS 120B)'], null, 2));

fs.writeFileSync(filePath, JSON.stringify(workflow, null, 2), 'utf8');
console.log('\nWorkflow connections swapped successfully.');
