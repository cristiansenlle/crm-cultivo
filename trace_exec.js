const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function traceError() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        console.log("Fetching last execution data from SQLite...");
        let res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT data FROM execution_entity ORDER BY startedAt DESC LIMIT 1;"');

        let trace = res.stdout;
        if (trace.length > 2000) {
            console.log("Extracting error snippet:");
            const errMatch = trace.match(/.{0,200}error.{0,500}/i);
            if (errMatch) console.log(errMatch[0]);
            else console.log("Too large, no 'error' text found near start.", trace.substring(0, 500));
        } else {
            console.log(trace);
        }

        ssh.dispose();
    } catch (e) {
        console.error("Error:", e);
        ssh.dispose();
    }
}

traceError();
