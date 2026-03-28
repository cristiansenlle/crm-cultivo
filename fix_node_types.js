const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'n8n-crm-cannabis-workflow.json');
const workflow = JSON.parse(fs.readFileSync(filePath, 'utf8'));

let count = 0;
workflow.nodes = workflow.nodes.map(node => {
  if (node.type === 'n8n-nodes-base.executeCommand') {
    count++;
    console.log(`Replacing node: ${node.name} (${node.id})`);
    
    // We replace it with an httpRequest node that does the same thing
    return {
      parameters: {
        method: "POST",
        url: "https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/daily_telemetry",
        sendHeaders: true,
        headerParameters: {
          parameters: [
            {
              name: "apikey",
              value: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wbmpyeml4c3JpemRucGhiam5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1Nzc2NTAsImV4cCI6MjA4ODE1MzY1MH0.Hx6t3ZFZj6TGei8c99bfdwUfJ1ce5XaGM4IuUBJUeC8"
            },
            {
              name: "Authorization",
              value: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wbmpyeml4c3JpemRucGhiam5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1Nzc2NTAsImV4cCI6MjA4NzQ3NjMzOX0.Hx6t3ZFZj6TGei8c99bfdwUfJ1ce5XaGM4IuUBJUeC8"
            },
            {
              name: "Content-Type",
              value: "application/json"
            }
          ]
        },
        sendBody: true,
        specifyBody: "json",
        jsonBody: "={\n  \"batch_id\": \"{{$json.body.batch_id}}\",\n  \"room_id\": \"{{$json.body.batch_id}}\",\n  \"temperature_c\": {{$json.body.temp}},\n  \"humidity_percent\": {{$json.body.humidity}},\n  \"vpd_kpa\": {{$json.body.vpd}},\n  \"created_at\": \"{{$json.body.timestamp}}\"\n}",
        options: {}
      },
      id: node.id,
      name: node.name,
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.1,
      position: node.position
    };
  }
  return node;
});

fs.writeFileSync(filePath, JSON.stringify(workflow, null, 2), 'utf8');
console.log(`Workflow fixed. Replaced ${count} nodes.`);
