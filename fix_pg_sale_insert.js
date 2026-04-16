const fs = require('fs');
const f = 'C:/Users/Cristian/.gemini/antigravity/crm cannabis/n8n-crm-cannabis-workflow.json';
const wf = JSON.parse(fs.readFileSync(f, 'utf8'));

// Fix PG Sale Insert Record - convert from broken template literals to n8n Insert operation
const pgNode = wf.nodes.find(n => n.name === 'PG Sale Insert Record');
if (pgNode) {
    // Switch from raw executeQuery mode to insertRow mode for proper expression support
    pgNode.parameters = {
        operation: 'insert',
        schema: { __rl: true, mode: 'value', value: 'public' },
        table: { __rl: true, mode: 'value', value: 'core_sales' },
        columns: {
            mappingMode: 'defineBelow',
            value: {
                string: [
                    { name: 'tx_id', value: "={{ 'TX-AI-' + Date.now() }}" },
                    { name: 'item_id', value: '={{ $json.body.item_id }}' },
                    { name: 'qty_sold', value: '={{ $json.body.qty }}' },
                    { name: 'revenue', value: '={{ $json.body.price }}' },
                    { name: 'client', value: '={{ $json.body.client }}' }
                ]
            }
        },
        options: {}
    };
    console.log('Fixed PG Sale Insert Record - converted to insert operation mode');
}

fs.writeFileSync(f, JSON.stringify(wf, null, 2));
console.log('Done.');
