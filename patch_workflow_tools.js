const fs = require('fs');

const OLD_URL = "https://dvvfdsaqvcyftaaronhd.supabase.co/rest/v1/";
const NEW_URL = "https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/";
const NEW_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wbmpyeml4c3JpemRucGhiam5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1Nzc2NTAsImV4cCI6MjA4ODE1MzY1MH0.Hx6t3ZFZj6TGei8c99bfdwUfJ1ce5XaGM4IuUBJUeC8";

const workflowFile = 'n8n-crm-cannabis-workflow.json';
const wf = JSON.parse(fs.readFileSync(workflowFile, 'utf8'));

wf.nodes.forEach(node => {
    if (node.type === '@n8n/n8n-nodes-langchain.toolHttpRequest') {
        const params = node.parameters;
        
        // 1. Update URL
        if (params.url && params.url.startsWith(OLD_URL)) {
            params.url = params.url.replace(OLD_URL, NEW_URL);
            console.log(`Updated URL for node: ${node.name}`);
        }

        // 2. Update Headers
        if (params.parametersHeaders && params.parametersHeaders.values) {
            params.parametersHeaders.values.forEach(h => {
                if (h.name === 'apikey' || h.name === 'Authorization') {
                    if (h.name === 'Authorization') {
                        h.value = `Bearer ${NEW_KEY}`;
                    } else {
                        h.value = NEW_KEY;
                    }
                    console.log(`Updated ${h.name} for node: ${node.name}`);
                }
            });
        }

        // 3. Update Body (Add room_id for cargar_telemetria)
        if (node.name.includes('cargar_telemetria')) {
            if (params.parametersBody && params.parametersBody.values) {
                const hasRoomId = params.parametersBody.values.some(v => v.name === 'room_id');
                if (!hasRoomId) {
                    params.parametersBody.values.push({
                        name: "room_id",
                        value: "{sala_o_lote}",
                        valueProvider: "fieldValue"
                    });
                    console.log(`Added room_id to node: ${node.name}`);
                }
            }
        }
    }
});

fs.writeFileSync('n8n-patched-tools.json', JSON.stringify(wf, null, 2));
console.log('Workflow tools patched and saved to n8n-patched-tools.json');
