const axios = require('axios');

async function testOtherWebhook() {
    try {
        console.log('Testing /webhook/entities ...');
        const res = await axios.post('http://109.199.99.126:5678/webhook/entities', {
            test: "ping"
        });
        console.log('Response:\n', res.data);
    } catch (e) {
        console.error('Error:', e.message);
        if (e.response) console.error(e.response.data);
    }
}

testOtherWebhook();
