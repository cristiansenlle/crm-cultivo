const axios = require('axios');
const cron = require('node-cron');

const ADMIN_PHONE = '5491156548820@c.us';
const BOT_WEBHOOK = 'http://localhost:5007/send-message';

// Wilde, Buenos Aires
const LAT = -34.6973;
const LON = -58.3114;

// Thresholds
const MAX_TEMP = 30;
const MIN_TEMP = 10;
const MAX_HUM = 80;
const MIN_HUM = 30;

async function checkWeatherAndAlert() {
    try {
        console.log(`[Weather Cron] Fetching forecast for Wilde...`);
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&hourly=relative_humidity_2m&forecast_days=3&timezone=America%2FArgentina%2FBuenos_Aires`;
        
        const res = await axios.get(url);
        const data = res.data;

        if (!data || !data.daily || !data.hourly) {
            console.error('[Weather Cron] Invalid response from Open-Meteo');
            return;
        }

        let alerts = [];

        // Check Daily Extremes (Temp)
        for (let i = 0; i < data.daily.time.length; i++) {
            const date = data.daily.time[i];
            const maxT = data.daily.temperature_2m_max[i];
            const minT = data.daily.temperature_2m_min[i];

            if (maxT > MAX_TEMP) {
                alerts.push(`⚠️ Alerta de Calor: El día ${date} se espera una máxima de ${maxT}°C (por encima del umbral de ${MAX_TEMP}°C).`);
            }
            if (minT < MIN_TEMP) {
                alerts.push(`❄️ Alerta de Frío: El día ${date} se espera una mínima de ${minT}°C (por debajo del umbral de ${MIN_TEMP}°C).`);
            }
        }

        // Check Hourly Extremes (Humidity) for the next 24-48 hours
        // We will just find the max and min humidity in the forecast window to avoid spam
        let maxH = -1;
        let minH = 101;
        for (let h of data.hourly.relative_humidity_2m) {
            if (h > maxH) maxH = h;
            if (h < minH) minH = h;
        }

        if (maxH > MAX_HUM) {
            alerts.push(`💧 Alerta de Humedad Alta: Se esperan picos de hasta ${maxH}% de humedad en los próximos días (límite: ${MAX_HUM}%).`);
        }
        if (minH < MIN_HUM) {
            alerts.push(`🌵 Alerta de Humedad Baja: Se esperan caídas de hasta ${minH}% de humedad (límite: ${MIN_HUM}%).`);
        }

        if (alerts.length > 0) {
            const message = `*🌿 CRM Cannabis - Alerta Climática (Wilde)*\n\n` + alerts.join('\n\n') + `\n\n_Considera encender el aire acondicionado, extractor o deshumidificador preventivamente._`;
            console.log('[Weather Cron] Sending alert via WhatsApp');
            
            try {
                await axios.post(BOT_WEBHOOK, {
                    phone: ADMIN_PHONE,
                    message: message
                });
                console.log('[Weather Cron] Alert sent successfully.');
            } catch (botErr) {
                console.error('[Weather Cron] Failed to send message via bot-wa:', botErr.message);
            }
        } else {
            console.log('[Weather Cron] No extreme conditions detected. All good.');
        }

    } catch (e) {
        console.error('[Weather Cron] Error checking weather:', e.message);
    }
}

// Run the check every morning at 08:00 AM
cron.schedule('0 8 * * *', () => {
    checkWeatherAndAlert();
});

console.log('☁️ Weather Alert Cron started! Checking every day at 08:00 AM.');
// Run once immediately on startup
checkWeatherAndAlert();
