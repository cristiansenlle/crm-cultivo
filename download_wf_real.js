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
    const result = await ssh.execCommand(`n8n export:workflow --id=${wfId} --output=/tmp/wf_export.json`);
    console.log(result.stdout);
    if (result.stderr) console.error(result.stderr);

    console.log('Downloading workflow file...');
    await ssh.getFile('downloaded_wf.json', '/tmp/wf_export.json');
    console.log('✅ Workflow downloaded successfully');

    ssh.dispose();

    // Analyze the downloaded workflow for tools missing names
    const wf = JSON.parse(fs.readFileSync('downloaded_wf.json', 'utf8'));

    console.log('\\n--- Analyzing Agent and Tool connections ---');
    const agentNodes = wf.nodes.filter(n => n.type.includes('agent') || n.type.includes('Agent'));
    console.log('Agent nodes found:', agentNodes.map(n => n.name));

    const toolNodes = wf.nodes.filter(n => n.type.includes('tool') || n.type.includes('Tool'));
    console.log('Total tool nodes:', toolNodes.length);

    let malformedCount = 0;
    for (const tool of toolNodes) {
        if (!tool.parameters || !tool.parameters.name) {
            console.log(`❌ Tool node "${tool.name}" is missing parameters.name`);
            malformedCount++;
        }
    }

    for (const node of wf.nodes) {
        if (!node.name) {
            console.log('❌ Node found with no name property:', node.id, node.type);
            malformedCount++;
        }
    }

    if (malformedCount === 0) {
        console.log('All nodes seem to have names. Testing Langchain Call Tools specifically.');
        const httpTools = wf.nodes.filter(n => n.type === '@n8n/n8n-nodes-langchain.toolHttpRequest');
        console.log('Found HTTP Call Tools:', httpTools.map(n => n.name));
        for (const t of httpTools) {
            if (!t.parameters.name) {
                console.log(`❌ Tool HTTP Request "${t.name}" missing parameters.name`);
            }
        }

        const customTools = wf.nodes.filter(n => n.type === '@n8n/n8n-nodes-langchain.toolCustom');
        console.log('Found Custom Tools:', customTools.length ? customTools.map(n => n.name) : 'None');
        for (const t of customTools) {
            if (!t.parameters.name) {
                console.log(`❌ Custom Tool "${t.name}" missing parameters.name`);
            }
        }
    }
}

run().catch(console.error);
