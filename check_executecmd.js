const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkEx() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        console.log("Checking draft nodes...");
        let res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT nodes FROM workflow_entity;" | grep -i executeCommand');
        console.log("Draft DB check:", res.stdout.length > 0 ? "STILL EXISTS IN DRAFT" : "NOT IN DRAFT");

        console.log("Checking shared_workflow (if exists)...");
        let res3 = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT * FROM sqlite_master WHERE type=\'table\';"');
        if (res3.stdout.includes('workflow_published_version')) {
            console.log("Checking workflow_published_version nodes...");
            let res4 = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "UPDATE workflow_published_version SET nodes = REPLACE(nodes, \'n8n-nodes-base.executeCommand\', \'n8n-nodes-base.noOp\');"');
            console.log("Publish DB update:", res4.stdout);

            let res5 = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT nodes FROM workflow_published_version;" | grep -i executeCommand');
            console.log("Publish DB check:", res5.stdout.length > 0 ? "STILL EXISTS IN PUBLISHED" : "NOT IN PUBLISHED");
        }

        ssh.dispose();
    } catch (e) {
        console.error("Error:", e);
        ssh.dispose();
    }
}

checkEx();
