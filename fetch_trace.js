const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function getTrace() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        const res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT data FROM execution_entity ORDER BY startedAt DESC LIMIT 5;"');
        console.log("STDOUT LENGTH:", res.stdout.length);
        console.log("STDERR:", res.stderr);

        if (res.stdout) {
            const rows = res.stdout.split('\n');
            for (let i = 0; i < rows.length; i++) {
                if (!rows[i].trim()) continue;
                try {
                    const data = JSON.parse(rows[i]);
                    if (data.resultData && data.resultData.error) {
                        console.log("FOUND ERROR IN ROW", i, ":", data.resultData.error.message);
                    } else {
                        console.log("Row", i, "executed fine.");
                    }
                } catch (e) {
                    console.log("Row", i, "not json:", rows[i].substring(0, 100));
                }
            }
        }
        ssh.dispose();
    } catch (e) {
        console.error(e);
        ssh.dispose();
    }
}
getTrace();
