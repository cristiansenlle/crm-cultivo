const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const config = {
    host: '109.199.99.126',
    port: 22,
    username: 'root',
    password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
};

const filesToDeploy = [
    { local: 'main.js', remote: '/opt/crm-cannabis/main.js' },
    { local: 'agronomy.js', remote: '/opt/crm-cannabis/agronomy.js' },
    { local: 'cultivo.js', remote: '/opt/crm-cannabis/cultivo.js' },
    { local: 'analytics.js', remote: '/opt/crm-cannabis/analytics.js' },
    { local: 'pos.js', remote: '/opt/crm-cannabis/pos.js' },
    { local: 'index.html', remote: '/opt/crm-cannabis/index.html' },
    { local: 'agronomy.html', remote: '/opt/crm-cannabis/agronomy.html' },
    { local: 'cultivo.html', remote: '/opt/crm-cannabis/cultivo.html' },
    { local: 'analytics.html', remote: '/opt/crm-cannabis/analytics.html' },
    { local: 'pos.html', remote: '/opt/crm-cannabis/pos.html' }
];

const conn = new Client();
conn.on('ready', () => {
    console.log('Client :: ready');
    let completed = 0;

    filesToDeploy.forEach(file => {
        conn.sftp((err, sftp) => {
            if (err) throw err;
            const localPath = path.join(__dirname, file.local);
            const readStream = fs.createReadStream(localPath);
            const writeStream = sftp.createWriteStream(file.remote);

            writeStream.on('close', () => {
                console.log(`Uploaded: ${file.local} -> ${file.remote}`);
                completed++;
                if (completed === filesToDeploy.length) {
                    console.log('All files deployed successfully.');
                    conn.end();
                }
            });

            readStream.pipe(writeStream);
        });
    });
}).connect(config);
