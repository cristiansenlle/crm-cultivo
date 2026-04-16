const execSync = require('child_process').execSync;

const curlCmd = `ssh root@144.126.216.51 "curl -s -X POST http://127.0.0.1:5006/bot-agronomico -H 'Content-Type: application/json' -d '{\\\"batches\\\":[\\\"Planta Madre NP/1/2025\\\", \\\"Planta Madre NP/2/2025\\\"],\\\"inputs\\\":[{\\\"name\\\":\\\"Top Vege\\\",\\\"qty\\\":6}],\\\"water_liters\\\":2,\\\"event_type\\\":\\\"Nutricion\\\",\\\"raw_description\\\":\\\"curl payload\\\"}'"`;

try {
    const res = execSync(curlCmd).toString();
    console.log("CURL OUTPUT:", res);
} catch(e) {
    console.error("CURL ERR:", e.stderr ? e.stderr.toString() : e.message);
}
