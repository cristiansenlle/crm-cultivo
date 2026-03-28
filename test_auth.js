const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    // Test auth endpoint directly from the server
    const curlCmd = `curl -s -X POST 'https://opnjrzixsrizdnphbjnq.supabase.co/auth/v1/token?grant_type=password' \
    -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wbmpyeml4c3JpemRucGhiam5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1Nzc2NTAsImV4cCI6MjA4ODE1MzY1MH0.Hx6t3ZFZj6TGei8c99bfdwUfJ1ce5XaGM4IuUBJUeC8" \
    -H "Content-Type: application/json" \
    -d '{"email":"cristiansenlle@gmail.com","password":"Fn@calderon6193"}'`;

    const result = await ssh.execCommand(curlCmd);
    console.log('Auth response:', result.stdout);
    console.log('Errors:', result.stderr);

    ssh.dispose();
}
run();
