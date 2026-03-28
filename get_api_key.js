const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function getApiKey() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    console.log('--- Checking user table schema ---');
    let res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite ".schema user"');
    console.log(res.stdout);

    console.log('--- Checking api_key table schema ---');
    let res2 = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite ".schema api_key"');
    console.log(res2.stdout || "No api_key table");

    console.log('--- Checking user_api_key ---');
    let res3 = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite ".tables" | grep api');
    console.log(res3.stdout || "No API related tables");

    ssh.dispose();
}

getApiKey().catch(console.error);
