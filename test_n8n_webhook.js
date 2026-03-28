const axios = require('axios');

async function testBot() {
    try {
        console.log('Sending message to N8N webhook...');
        const res = await axios.post('http://109.199.99.126:5678/webhook/wa-inbound', {
            sessionId: '5491156548820@c.us',
            phone: '5491156548820@c.us',
            body: '¿Qué lotes tengo activos?',
            timestamp: Date.now() / 1000
        });
        console.log('Bot Response:\n', res.data);
    } catch (e) {
        console.error('Error:', e.message);
        if (e.response) console.error(e.response.data);
    }
}

testBot();
