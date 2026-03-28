const axios = require('axios');

async function testBotFresh() {
    try {
        console.log('Sending message to N8N webhook with fresh session ID...');
        const res = await axios.post('http://109.199.99.126:5678/webhook/wa-inbound', {
            sessionId: 'fresh-session-' + Date.now(),
            phone: 'fresh-session-' + Date.now(),
            body: '¿Qué lotes tengo activos?',
            timestamp: Date.now() / 1000
        });
        console.log('Bot Response:\n', res.data);
    } catch (e) {
        console.error('Error:', e.message);
        if (e.response) console.error(e.response.data);
    }
}

testBotFresh();
