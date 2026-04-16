const fs = require('fs');
const execSync = require('child_process').execSync;

try {
    const rawData = execSync('ssh root@144.126.216.51 "docker exec n8n sqlite3 /home/node/.n8n/database.sqlite \'SELECT id, startedAt, stoppedAt, status, data FROM execution_entity ORDER BY id DESC LIMIT 5;\'"').toString();
    console.log(rawData.substring(0, 500));
} catch (err) {
    console.log("Error:", err.message);
}
