const fs = require('fs');
const f = 'C:/Users/Cristian/.gemini/antigravity/crm cannabis/n8n-crm-cannabis-workflow.json';
const wf = JSON.parse(fs.readFileSync(f, 'utf8'));

const pgNode = wf.nodes.find(n => n.name === 'PG Sale Insert Record');
if (pgNode) {
    // n8n Postgres insert node correct format: flat key-value in columns.value
    pgNode.parameters = {
        operation: 'insert',
        schema: { __rl: true, mode: 'value', value: 'public' },
        table: { __rl: true, mode: 'value', value: 'core_sales' },
        columns: {
            mappingMode: 'defineBelow',
            value: {
                tx_id: "={{ 'TX-AI-' + Date.now() }}",
                item_id: '={{ $json.body.item_id }}',
                qty_sold: '={{ $json.body.qty }}',
                revenue: '={{ $json.body.price }}',
                client: '={{ $json.body.client }}'
            },
            matchingColumns: [],
            schema: []
        },
        options: {}
    };
    console.log('Fixed PG Sale Insert Record with correct flat column mapping');
}

fs.writeFileSync(f, JSON.stringify(wf, null, 2));
console.log('Done.');
