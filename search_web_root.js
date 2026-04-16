const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

(async () => {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        console.log('Connected. Running systematic search...');
        
        // Search for index.html as a proxy for the web root
        const res = await ssh.execCommand('find / -maxdepth 4 -name index.html 2>/dev/null');
        console.log('Search results (index.html):');
        console.log(res.stdout);

        // Also check common web paths
        const resVar = await ssh.execCommand('ls -F /var/www');
        console.log('Contents of /var/www:');
        console.log(resVar.stdout);

        const resRoot = await ssh.execCommand('ls -F /root');
        console.log('Contents of /root:');
        console.log(resRoot.stdout);

        process.exit(0);

    } catch (err) {
        console.error('Search ERROR:', err);
        process.exit(1);
    }
})();
