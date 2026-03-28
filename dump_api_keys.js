const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function getKeys() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    console.log('--- Checking user_api_keys schema ---');
    let res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite ".schema user_api_keys"');
    console.log(res.stdout);

    console.log('--- Fetching Keys ---');
    let res2 = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT label, apiKey FROM user_api_keys;"');
    console.log("Keys found:");
    console.log(res2.stdout);

    ssh.dispose();
}

getKeys().catch(console.error);
