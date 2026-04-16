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
const wf = JSON.parse(fs.readFileSync('/root/export2.json', 'utf8'));
console.log('Array?', Array.isArray(wf), 'typeof?', typeof wf);
if (Array.isArray(wf)) {
   console.log('wf[0] Keys:', Object.keys(wf[0] || {}));
} else if (wf) {
   console.log('wf Keys:', Object.keys(wf));
}
`;

    fs.writeFileSync('vps_temp.js', script);
    await ssh.putFile('vps_temp.js', '/root/vps_temp.js');
    let res = await ssh.execCommand('node /root/vps_temp.js');
    console.log(res.stdout, res.stderr);

    ssh.dispose();
}

run().catch(console.error);
