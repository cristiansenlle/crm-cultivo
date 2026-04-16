const execSync = require('child_process').execSync;

try {
    execSync('ssh root@144.126.216.51 "pm2 flush && pm2 logs bot_agronomy_server --lines 150 --nostream > /root/agro_logs.txt"');
    const rawData = execSync('ssh root@144.126.216.51 "cat /root/agro_logs.txt"').toString();
    console.log(rawData);
} catch (err) {
    console.log("Error:", err.message);
}
