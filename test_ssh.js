const { Client } = require('ssh2');

const config = {
    host: '109.199.99.126',
    port: 22,
    username: 'root',
    password: 'M0nt3v1d30!()'
};

const conn = new Client();
conn.on('ready', () => {
    console.log('Client :: ready');
    conn.exec('ls /opt/crm-cannabis', (err, stream) => {
        if (err) throw err;
        stream.on('close', (code, signal) => {
            console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
            conn.end();
        }).on('data', (data) => {
            console.log('STDOUT: ' + data);
        }).stderr.on('data', (data) => {
            console.log('STDERR: ' + data);
        });
    });
}).on('error', (err) => {
    console.error('Connection Error:', err);
}).connect(config);
