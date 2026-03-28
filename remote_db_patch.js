const fs = require('fs');
const { execSync } = require('child_process');

try {
    const nodesJson = fs.readFileSync('/opt/crm-cannabis/nodes_only.json', 'utf8');
    // Using a temporary file to hold the nodes string for sqlite3 to read via .read or similar
    // Actually, we'll use a simpler node-sqlite3 approach IF it's installed, or just write a temp SQL file.
    
    // Let's use a temp SQL file with hexadecimal content to avoid escaping issues in sqlite3 CLI
    const hexNodes = Buffer.from(nodesJson, 'utf8').toString('hex');
    const sql = `UPDATE workflow_entity SET nodes = x'${hexNodes}' WHERE id = 'scpZdPe5Cp4MG98G';`;
    
    fs.writeFileSync('/opt/crm-cannabis/patch.sql', sql);
    console.log('SQL patch file created.');
    
    const output = execSync('sqlite3 /root/.n8n/database.sqlite < /opt/crm-cannabis/patch.sql');
    console.log('SQL update executed:', output.toString());

} catch (err) {
    console.error('Patch failed:', err.message);
    process.exit(1);
}
