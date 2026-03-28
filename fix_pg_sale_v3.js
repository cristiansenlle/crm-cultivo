const fs = require('fs');
const f = 'C:/Users/Cristian/.gemini/antigravity/crm cannabis/n8n-crm-cannabis-workflow.json';
const wf = JSON.parse(fs.readFileSync(f, 'utf8'));

const pgNode = wf.nodes.find(n => n.name === 'PG Sale Insert Record');
if (pgNode) {
    // Use raw SQL with n8n expressions interpolated BEFORE the query is sent to Postgres
    // n8n expressions in executeQuery are evaluated first, then the resulting string is sent as SQL
    pgNode.parameters = {
        operation: 'executeQuery',
        query: "={{ \"INSERT INTO core_sales (tx_id, item_id, qty_sold, revenue, client, date) VALUES ('TX-AI-\" + Date.now() + \"', '\" + $json.body.item_id + \"', \" + $json.body.qty + \", \" + $json.body.price + \", '\" + $json.body.client + \"', NOW()) RETURNING id;\" }}",
        options: {}
    };
    console.log('Fixed PG Sale Insert Record with n8n expression in query');
}

fs.writeFileSync(f, JSON.stringify(wf, null, 2));
console.log('Done.');
