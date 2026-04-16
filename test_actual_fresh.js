const axios = require('axios');

async function testBotActualFresh() {
    try {
        const freshId = 'ACTUAL-FRESH-' + Date.now();
        console.log('Sending message to N8N webhook with ACTUAL fresh session ID:', freshId);
        const res = await axios.post('http://109.199.99.126:5678/webhook/wa-inbound', {
            sessionId: freshId,
            phone: freshId,
            body: "¿Qué salas y lotes tengo cargados actualmente?"
        });
        console.log('Bot Response:\n', res.data);
    } catch (e) {
        console.error('Error:', e.message);
        if (e.response) console.error(e.response.data);
    }
}

testBotActualFresh();
