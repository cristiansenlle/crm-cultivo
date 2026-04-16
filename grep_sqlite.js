const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkExe() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    console.log('Grepping whole DB...');
    let res = await ssh.execCommand('grep -a "Sour Diesel" /root/.n8n/database.sqlite');
    console.log("Matches:", res.stdout.substring(0, 1000));

    console.log('Grepping whole DB for 11111111...');
    let res2 = await ssh.execCommand('grep -a "11111111" /root/.n8n/database.sqlite');
    console.log("Matches:", res2.stdout.substring(0, 1000));

    ssh.dispose();
}

checkExe().catch(console.error);
