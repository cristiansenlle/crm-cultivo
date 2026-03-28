const fetch = require('node-fetch');

async function testSync() {
    const webhookUrl = "http://109.199.99.126.sslip.io:5678/webhook/tareas-calendar";
    const payload = {
        action: "CREATE_CALENDAR_EVENT",
        title: "Antigravity Verification Success",
        datetime: new Date(Date.now() + 3600000).toISOString().slice(0, 19), // 1 hour from now, yyyy-mm-ddThh:mm:ss
        timestamp: new Date().toISOString()
    };

    console.log(`Sending test payload to ${webhookUrl}...`);
    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.text();
        console.log(`Response Status: ${response.status}`);
        console.log(`Response Body: ${result}`);
        if (response.status === 200) {
            console.log("✅ Sync test successful!");
        } else {
            console.log("❌ Sync test failed.");
        }
    } catch (err) {
        console.error("error during test:", err);
    }
}

testSync();
