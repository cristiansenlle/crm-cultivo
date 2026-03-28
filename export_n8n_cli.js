const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function exportCli() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    console.log('--- Exporting via CLI ---');
    let res = await ssh.execCommand('n8n export:workflow --id=scpZdPe5Cp4MG98G --output=/root/wf_export.json');
    console.log(res.stdout, res.stderr);

    console.log('--- Reading Exported File ---');
    let res2 = await ssh.execCommand('cat /root/wf_export.json');
    console.log("Length:", res2.stdout.length);
    if (res2.stdout.includes('LOTE-A01')) {
        console.log("LOTE-A01 IS IN THE EXPORT!");
    } else {
        console.log("LOTE-A01 NOT FOUND IN THE EXPORT!");
    }

    ssh.dispose();
}

exportCli().catch(console.error);
