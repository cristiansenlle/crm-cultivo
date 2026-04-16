const axios = require('axios');

const WebhookURL = 'http://localhost:5678/webhook/wa-inbound';

async function testHarvestMsg() {
    console.log(`🚀 Simulando mensaje de WhatsApp: "Anotá que el Lote A01 nos rindió 320 gramos en total"`);
    try {
        const response = await axios.post(WebhookURL, {
            phone: "5491156548820@c.us",
            body: "Anotame limpiar los reservorios del Lote B para este jueves",
            timestamp: Date.now() / 1000
        });

        console.log(`\n✅ HTTP Status: ${response.status}`);
        console.log(`📦 Respuesta de n8n:`, response.data);
    } catch (e) {
        console.error("❌ Error conectando a n8n:", e.message);
    }
}

testHarvestMsg();
