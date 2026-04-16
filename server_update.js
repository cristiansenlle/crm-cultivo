
const fs = require('fs');
const { execSync } = require('child_process');

const wfArray = JSON.parse(fs.readFileSync('/tmp/fixed_wf.json', 'utf8'));
const wf = wfArray[0] || wfArray;

// We only need to update the 'nodes' and 'connections' column.
const nodesJson = JSON.stringify(wf.nodes).replace(/'/g, "''");
const connectionsJson = JSON.stringify(wf.connections).replace(/'/g, "''");

const sql = "UPDATE workflow_entity SET nodes='" + nodesJson + "', connections='" + connectionsJson + "' WHERE id='scpZdPe5Cp4MG98G';";
fs.writeFileSync('/tmp/update.sql', sql);

console.log('Executing SQL update...');
execSync('sqlite3 /root/.n8n/database.sqlite < /tmp/update.sql');
console.log('Database updated.');

console.log('Restarting N8N...');
execSync('pm2 restart n8n-service');
