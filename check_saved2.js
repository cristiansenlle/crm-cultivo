const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function checkSaved() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    let res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT nodes FROM workflow_entity WHERE id = \'scpZdPe5Cp4MG98G\';"');

    if (res.stdout.includes('LOTE-123')) {
        console.log("SUCCESS! LOTE-123 EXISTS in SQLite.");
    } else {
        console.log("FAIL! SQLite was NOT updated.");
    }

    if (res.stdout.includes('LOTE-A01')) {
        console.log("FAIL! LOTE-A01 STILL EXISTS in SQLite.");
    } else {
        console.log("SUCCESS! LOTE-A01 is GONE from SQLite.");
    }

    ssh.dispose();
}

checkSaved().catch(console.error);
