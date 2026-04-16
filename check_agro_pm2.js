const execSync = require('child_process').execSync;

try {
    const rawData = execSync('ssh root@144.126.216.51 "pm2 logs bot_agronomy_server --lines 100 --nostream"').toString();
    console.log(rawData);
} catch (err) {
    console.log("Error checking agronomy server:", err.message);
    try {
        const d2 = execSync('ssh root@144.126.216.51 "pm2 logs --lines 100 --nostream"').toString();
        console.log(d2);
    } catch(e) {}
}
