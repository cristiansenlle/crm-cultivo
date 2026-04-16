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
const agentNode = wf.nodes.find(n => n.type === '@n8n/n8n-nodes-langchain.agent');
const msg = agentNode.parameters.options.systemMessage || '';
console.log("Includes 11111111?", msg.includes('11111111'));
console.log("Length:", msg.length);
console.log("End snippet:");
console.log(msg.substring(Math.max(0, msg.length - 500)));
`;

    fs.writeFileSync('vps_temp.js', script);
    await ssh.putFile('vps_temp.js', '/root/vps_temp.js');
    let res = await ssh.execCommand('node /root/vps_temp.js');
    console.log(res.stdout, res.stderr);

    ssh.dispose();
}

run().catch(console.error);
