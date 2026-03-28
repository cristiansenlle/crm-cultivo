const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function run() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    const script = `
const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('/root/export2.json', 'utf8'));
console.log(Object.keys(wf));
if (wf.nodes) { console.log(Array.isArray(wf.nodes)); }
`;

    fs.writeFileSync('vps_temp.js', script);
    await ssh.putFile('vps_temp.js', '/root/vps_temp.js');
    let res = await ssh.execCommand('node /root/vps_temp.js');
    console.log(res.stdout, res.stderr);

    ssh.dispose();
}

run().catch(console.error);
