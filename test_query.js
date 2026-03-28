const fs = require('fs');
let j = JSON.parse(fs.readFileSync('n8n-crm-cannabis-workflow.json', 'utf8'));
let pgInsert = j.nodes.find(n => n.name === 'PG Insert WA TM');
console.log('Query a Supabase:');
console.log(pgInsert.parameters.query);
