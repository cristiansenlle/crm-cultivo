const axios = require('axios');

const N8N_URL = "https://n8n.agronicatandil.com.ar/webhook/wa-inbound";

async function testWebhook() {
    console.log('Sending mock WhatsApp telemetry report...');
    const payload = {
        body: {
            body: "TM 28.5 65 sala-veg-1", // Format: TM <temp> <hum> <room/batch>
            phone: "5491112345678"
        }
    };

    try {
        const response = await axios.post(N8N_URL, payload);
        console.log('Response status:', response.status);
        console.log('Response data:', response.data);

        console.log('\nVerifying record in Supabase in 2 seconds...');
        setTimeout(async () => {
            const SUPABASE_URL = "https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1";
            const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wbmpyeml4c3JpemRucGhiam5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1Nzc2NTAsImV4cCI6MjA4ODE1MzY1MH0.Hx6t3ZFZj6TGei8c99bfdwUfJ1ce5XaGM4IuUBJUeC8";
            
            const res = await axios.get(`${SUPABASE_URL}/daily_telemetry?order=created_at.desc&limit=1`, {
                headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
            });
            console.log('Latest record:', JSON.stringify(res.data[0], null, 2));
            if (res.data[0].room_id === 'sala-veg-1' && res.data[0].temperature_c == 28.5) {
                console.log('\nSUCCESS: Data mapped correctly with room_id!');
            } else {
                console.log('\nFAILURE: room_id missing or incorrect.');
            }
        }, 2000);

    } catch (e) {
        console.error('Error:', e.response ? e.response.data : e.message);
    }
}

testWebhook();
