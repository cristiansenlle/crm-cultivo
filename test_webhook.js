const axios = require('axios');

async function testWebhook() {
    console.log('--- Testing Webhook ---');
    try {
        const res = await axios.post('http://109.199.99.126:5678/webhook/wa-inbound', {
            sessionId: '5491156548820@c.us',
            phone: '5491156548820@c.us',
            body: 'test_message',
            timestamp: Date.now(),
            fromMe: true
        });
        console.log('Success:', res.data);
    } catch(e) {
        console.error('Error:', e.response ? e.response.status : e.message);
        if (e.response && e.response.data) {
            console.error('Data:', e.response.data);
        }
    }
}

testWebhook().catch(console.error);
