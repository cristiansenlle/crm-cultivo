const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function extractKeys() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    const jwtSearch = await ssh.execCommand('grep -rn "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" /opt/crm-cannabis/ /root/ 2>/dev/null | head -20');
    console.log('JWT keys found:', jwtSearch.stdout);
    
    // Also try to find SUPABASE or VITE inside .js files
    const envSearch = await ssh.execCommand('grep -rn "SUPABASE" /opt/crm-cannabis/ 2>/dev/null | head -20');
    console.log('SUPABASE keys found:', envSearch.stdout);

    ssh.dispose();
}

extractKeys().catch(console.error);
