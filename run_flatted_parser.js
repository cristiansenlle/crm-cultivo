const fs = require('fs');
const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function parseFlatted() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    // Write a tiny parser script on the VPS
    const script = `
const fs = require('fs');
const { parse, stringify } = require('/usr/lib/node_modules/n8n/node_modules/flatted');
const txt = fs.readFileSync('THE_NEWEST_exe_trace.json', 'utf8');
const exe = parse(txt);
for(const [name, runs] of Object.entries(exe.resultData.runData)) {
    if (name.includes('lote')) {
        console.log('--- NODE:', name);
        console.log(stringify(runs[0].data.main, null, 2).substring(0, 1500));
    }
}
    `;

    fs.writeFileSync('vps_parser.js', script);
    await ssh.putFile('vps_parser.js', '/root/vps_parser.js');

    let res = await ssh.execCommand('node /root/vps_parser.js');
    console.log(res.stdout, res.stderr);

    ssh.dispose();
}

parseFlatted().catch(console.error);
