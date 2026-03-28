const fs = require('fs');
const { execSync } = require('child_process');

try {
    const output = execSync('sqlite3 /root/.n8n/database.sqlite "SELECT id, name, active FROM workflow_entity"');
    console.log('WORKFLOWS IN DB:');
    console.log(output.toString());
} catch (err) {
    console.error('Query failed:', err.message);
}
