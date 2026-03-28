const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkNodesFixed() {
    try {
        await ssh.connect({ 
            host: '109.199.99.126', 
            username: 'root', 
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod' 
        });

        const execId = 283;
        
        console.log(`--- Checking nodes for execution: ${execId} ---`);
        const res = await ssh.execCommand(`sqlite3 -json /root/.n8n/database.sqlite "SELECT data FROM execution_entity WHERE id = ${execId};"`);
        
        if (!res.stdout) {
            console.log('No data found in database for ID', execId);
            return;
        }

        const rows = JSON.parse(res.stdout);
        const rawData = rows[0].data;
        const data = JSON.parse(rawData);
        
        const nodes = Object.keys(data.resultData.runData);
        console.log('Executed nodes:', nodes.join(', '));

        // Check if "Format WA Response" or "WhatsApp" nodes are in the list
        const responseNodes = nodes.filter(n => n.toLowerCase().includes('whatsapp') || n.toLowerCase().includes('format'));
        if (responseNodes.length > 0) {
            console.log('Response-related nodes found. Checking if they have output data...');
            responseNodes.forEach(nodeName => {
                const nodeRun = data.resultData.runData[nodeName][0];
                console.log(`Node ${nodeName} output presence:`, nodeRun.data ? 'YES' : 'NO');
                if (nodeRun.error) {
                    console.log(`Node ${nodeName} ERROR:`, nodeRun.error);
                }
            });
        } else {
            console.log('WARNING: No response nodes were ever reached.');
        }

        ssh.dispose();
    } catch (err) {
        console.error('Check failed:', err.message);
    }
}

checkNodesFixed();
