const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function run() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    const script = `
const fs = require('fs');
const workflows = JSON.parse(fs.readFileSync('/root/export2.json', 'utf8'));
const wf = Array.isArray(workflows) ? workflows[0] : workflows;
let found = false;
for (const n of wf.nodes) {
    const str = JSON.stringify(n);
    if (str.includes('11111111')) {
        console.log("FOUND IN NODE:", n.name, n.type);
        found = true;
    }
}
if (!found) {
    console.log("Not found in any node in export2.json!");
}
`;

    fs.writeFileSync('vps_temp.js', script);
    await ssh.putFile('vps_temp.js', '/root/vps_temp.js');
    let res = await ssh.execCommand('node /root/vps_temp.js');
    console.log(res.stdout, res.stderr);

    ssh.dispose();
}

run().catch(console.error);
