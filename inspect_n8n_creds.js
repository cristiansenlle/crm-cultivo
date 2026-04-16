const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

const GEMINI_API_KEY = 'AIzaSyCrglBECK5uuTxh-Mlw7_z76AwrnUc4lac';

ssh.connect({
    host: '109.199.99.126',
    username: 'root',
    password: 'HIDDEN_SECRET_BY_AI'
}).then(async () => {
    // 1. Get existing credential IDs to understand the schema
    const r1 = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"SELECT id, name, type FROM credentials_entity LIMIT 10;\"");
    console.log('=== Existing Credentials ===');
    console.log(r1.stdout);

    // 2. Check credential_entity table schema
    const r2 = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"PRAGMA table_info(credentials_entity);\"");
    console.log('\n=== Credentials Table Schema ===');
    console.log(r2.stdout);

    // 3. Get the OpenRouter node from the workflow to understand its structure
    const r3 = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"SELECT nodes FROM workflow_entity WHERE id='scpZdPe5Cp4MG98G';\"");
    const nodes = JSON.parse(r3.stdout);
    
    const openrouterNode = nodes.find(n => n.name && n.name.includes('OpenRouter'));
    console.log('\n=== OpenRouter Node ===');
    console.log(JSON.stringify(openrouterNode, null, 2));
    
    // Also find Groq node to understand credential structure
    const groqNode = nodes.find(n => n.name && n.name.includes('Groq'));
    console.log('\n=== Groq Node ===');
    console.log(JSON.stringify(groqNode, null, 2));

    ssh.dispose();
}).catch(e => console.error(e));
