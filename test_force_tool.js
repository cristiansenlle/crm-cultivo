const axios = require('axios');

async function testBotForceTool() {
    try {
        console.log('Sending message to force tool execution...');
        const res = await axios.post('http://109.199.99.126:5678/webhook/wa-inbound', {
            sessionId: 'force-tool-' + Date.now(),
            phone: 'force-tool-' + Date.now(),
            body: 'IMPORTANTE: Ejecutá obligatoriamente el tool consultar_lotes ahora mismo y decime exactamente cuántos items devolvió y cuáles son sus IDs. No inventes nada.',
            timestamp: Date.now() / 1000
        });
        console.log('Bot Response:\n', res.data);
    } catch (e) {
        console.error('Error:', e.message);
        if (e.response) console.error(e.response.data);
    }
}

testBotForceTool();
