const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function run() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    const wfId = 'scpZdPe5Cp4MG98G';
    console.log(`Exporting workflow ${wfId} from server...`);
    const result = await ssh.execCommand(`n8n export:workflow --id=${wfId} --output=/tmp/wf_export_latest.json`);
    console.log(result.stdout);
    if (result.stderr) console.error(result.stderr);

    console.log('Downloading workflow file...');
    await ssh.getFile('downloaded_wf_latest.json', '/tmp/wf_export_latest.json');
    console.log('✅ Workflow downloaded successfully');

    ssh.dispose();

    // Analyze the downloaded workflow
    const wfArray = JSON.parse(fs.readFileSync('downloaded_wf_latest.json', 'utf8'));
    const wf = wfArray[0] || wfArray;

    console.log('\\n--- Analyzing Agent and Tool connections ---');
    const toolNodes = wf.nodes.filter(n => n.type.includes('tool') || n.type.includes('Tool'));
    console.log(`Total tool nodes: ${toolNodes.length}`);

    let malformedCount = 0;
    for (const tool of toolNodes) {
        if (!tool.parameters || !tool.parameters.name || tool.parameters.name.trim() === '') {
            console.log(`❌ Tool node "${tool.name}" is missing or has empty parameters.name:`, tool.parameters?.name);
            malformedCount++;
        }
    }

    console.log(`Found ${malformedCount} malformed tools in the live workflow.`);
}

run().catch(console.error);
