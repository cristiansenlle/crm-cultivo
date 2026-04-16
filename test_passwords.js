const { Client } = require('ssh2');

const host = '109.199.99.126';
const passwords = ['HIDDEN_SECRET_BY_AI', 'SWbCPD6AdBac'];

async function testPasswords() {
    for (const pwd of passwords) {
        console.log(`Testing: ${pwd.substring(0, 4)}...`);
        try {
            await new Promise((resolve, reject) => {
                const conn = new Client();
                conn.on('ready', () => {
                    console.log(`✅ Success for ${pwd.substring(0,4)}`);
                    conn.end();
                    resolve();
                }).on('error', (err) => {
                    reject(err);
                }).connect({ host, port: 22, username: 'root', password: pwd });
            });
            return pwd;
        } catch (e) {
            console.log(`❌ Failed for ${pwd.substring(0,4)}`);
        }
    }
    return null;
}

testPasswords().then(pwd => {
    if (pwd) console.log('Found working password!');
    else console.log('No passwords worked.');
});
