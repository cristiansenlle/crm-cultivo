const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('/root/.n8n/database.sqlite');
const fs = require('fs');

db.all("SELECT id, name, active, nodes FROM workflow_entity", [], (err, rows) => {
    if (err) {
        console.error(err);
        return;
    }
    const results = rows.map(row => {
        let nodes = row.nodes;
        if (Buffer.isBuffer(nodes)) {
            nodes = JSON.parse(nodes.toString('utf8'));
        }
        return {
            id: row.id,
            name: row.name,
            active: row.active,
            nodeCount: nodes.length
        };
    });
    console.log(JSON.stringify(results, null, 2));
    db.close();
});
