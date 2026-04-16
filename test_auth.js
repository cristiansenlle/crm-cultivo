const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    // Test auth endpoint directly from the server
    const curlCmd = `curl -s -X POST 'https://opnjrzixsrizdnphbjnq.supabase.co/auth/v1/token?grant_type=password' \
    -H "apikey: HIDDEN_SECRET_BY_AI" \
    -H "Content-Type: application/json" \
    -d '{"email":"cristiansenlle@gmail.com","password":"Fn@calderon6193"}'`;

    const result = await ssh.execCommand(curlCmd);
    console.log('Auth response:', result.stdout);
    console.log('Errors:', result.stderr);

    ssh.dispose();
}
run();
