const fs = require('fs');

const wf = JSON.parse(fs.readFileSync('active_workflow_final_patched.json', 'utf8'))[0];
let nodes;
if (wf.nodes && wf.nodes.type === 'Buffer') {
    nodes = JSON.parse(Buffer.from(wf.nodes.data).toString('utf8'));
} else {
    nodes = wf.nodes;
}

const webhook = nodes.find(n => n.name.includes('Webhook WhatsApp'));
if (webhook) {
    webhook.parameters.path = 'wa-inbound-patched';
    console.log('Webhook path updated to wa-inbound-patched');
}

const hex = Buffer.from(JSON.stringify(nodes), 'utf8').toString('hex');
const sql = `UPDATE workflow_entity SET nodes = x'${hex}', active = 1 WHERE id = 'scpZdPe5Cp4MG98G';`;

fs.writeFileSync('patch_v2.sql', sql);
console.log('SQL patch v2 (with path change) created.');
