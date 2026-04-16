const fs = require('fs');

const wf = JSON.parse(fs.readFileSync('pulled_wf.json', 'utf8'));

wf.nodes.forEach(n => {
    if (n.type.includes('OpenAi') && n.parameters) {
        if(n.parameters.tools) console.log(JSON.stringify(n.parameters.tools, null, 2));
    }
    if (n.type.includes('Groq') && n.parameters) {
         if(n.parameters.systemMessage) console.log("System Prompt: ", n.parameters.systemMessage);
    }
    // Also look for HTTP nodes
    if (n.type.includes('HttpRequest')) {
        console.log("HTTP REQUEST NODO:", n.name, n.parameters.url, n.parameters.options);
    }
});
