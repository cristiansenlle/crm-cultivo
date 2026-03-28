const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

ssh.connect({
    host: '109.199.99.126',
    username: 'root',
    password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
}).then(async () => {
    const r = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"SELECT nodes FROM workflow_entity WHERE id='scpZdPe5Cp4MG98G';\"");
    
    if (r.stdout) {
        const nodes = JSON.parse(r.stdout);
        const agent = nodes.find(n => n.name === 'AI Agent (Function Calling)');
        const msg = agent?.parameters?.options?.systemMessage || '';
        console.log('LIVE DB contains MIDDLEWARE block:', msg.includes('MIDDLEWARE'));
        console.log('LIVE DB contains batches instructions:', msg.includes('batches'));
        console.log('LIVE DB contains inputs array instructions:', msg.includes('inputs'));
        console.log('Prompt length:', msg.length);
    } else {
        console.error('No stdout:', r.stderr);
    }
    ssh.dispose();
}).catch(e => console.error(e));
