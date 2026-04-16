const execSync = require('child_process').execSync;

try {
    const out = execSync('ssh root@144.126.216.51 "pm2 restart bot_agro"').toString();
    console.log(out);
} catch (e) {
    console.error("Error", e.message);
}
