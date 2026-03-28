const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkSystemMessage() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    let res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT nodes FROM workflow_published_version WHERE workflowId = \'scpZdPe5Cp4MG98G\';"');

    try {
        const nodes = JSON.parse(res.stdout);
        const agentNode = nodes.find(n => n.type === '@n8n/n8n-nodes-langchain.agent');
        if (agentNode && agentNode.parameters && agentNode.parameters.options) {
            console.log("System Message Length:", agentNode.parameters.options.systemMessage.length);
            console.log("Does the System Message contain LOTE-TEST-ID? ", agentNode.parameters.options.systemMessage.includes('LOTE-TEST-ID'));
            console.log("Does the System Message contain 11111111? ", agentNode.parameters.options.systemMessage.includes('11111111'));
            console.log("Snippet from end of System Message:");
            console.log(agentNode.parameters.options.systemMessage.substring(agentNode.parameters.options.systemMessage.length - 1000));
        }
    } catch (e) {
        console.error(e.message);
    }

    ssh.dispose();
}

checkSystemMessage().catch(console.error);
