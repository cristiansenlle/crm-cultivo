const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

(async () => {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        // Search for the project ID string everywhere
        const res = await ssh.execCommand('grep -r "wzajpibwhtrtxddqejnj" /root /home /var/www /opt || echo "Not found"');
        console.log('--- Deep Server Search Results ---');
        console.log(res.stdout);
        
        // Also look for ANY Supabase key (JWT format) in the last modified files
        const resRecent = await ssh.execCommand('find /root /home -mtime -30 -type f -exec grep -l "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" {} + | xargs grep -l "supabase"');
        console.log('--- Recent Files with Supabase Keys ---');
        console.log(resRecent.stdout);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        ssh.dispose();
    }
})();
