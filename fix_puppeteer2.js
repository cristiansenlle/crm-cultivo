const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    const runCmd = async (cmd) => {
        console.log('\\n▶️ Running: ' + cmd);
        const result = await ssh.execCommand(cmd, {
            cwd: '/root',
            onStdout: chunk => process.stdout.write(chunk.toString('utf8')),
            onStderr: chunk => process.stderr.write(chunk.toString('utf8')),
        });
        return result;
    };

    const pkgs = 'libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2t64 libcairo2 libpango-1.0-0 libx11-xcb1 libxss1 libxshmfence1';
    await runCmd('apt-get update && apt-get install -y ' + pkgs);

    ssh.dispose();
}
run();
