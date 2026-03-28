const fs = require('fs');
const { NodeSSH } = require('node-ssh');

async function patchMainJs() {
    let code = fs.readFileSync('remote_main.js', 'utf8');

    // 1. Fix ROOM_ID_MAP
    code = code.replace(/const ROOM_ID_MAP = \{[\s\S]*?\};/, `const ROOM_ID_MAP = {
    'sala1': 'fc9d96c3-1811-47cb-b003-81b498f3b0ab',
    'sala2': '22222222-2222-2222-2222-222222222222',
    'sala3': '33333333-3333-3333-3333-333333333333'
};`);

    // 2. Add fetchHistoricalTelemetry right before pollLatestTelemetry
    const histFunc = `async function fetchHistoricalTelemetry(roomId) {
    try {
        if (!window.sbClient) {
            console.warn('[Historical] sbClient not ready yet.');
            return;
        }

        const supabaseRoomId = ROOM_ID_MAP[roomId] || roomId;

        const { data, error } = await window.sbClient
            .from('daily_telemetry')
            .select('temperature_c, humidity_percent, vpd_kpa, created_at')
            .eq('batch_id', supabaseRoomId)
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) {
            console.error('[Historical] Supabase error:', error.message);
            return;
        }

        const rData = roomsData[roomId];
        if (!rData) return;

        if (data && data.length > 0) {
            data.reverse(); // Chronological order (oldest first, newest last)
            
            rData.tempHistory = [];
            rData.humHistory = [];
            rData.vpdHistory = [];
            rData.labels = [];

            data.forEach(row => {
               rData.tempHistory.push(parseFloat(row.temperature_c));
               rData.humHistory.push(parseFloat(row.humidity_percent));
               rData.vpdHistory.push(parseFloat(row.vpd_kpa) || 1.1); // Fallback for VPD if somehow empty
               
               const ts = new Date(row.created_at);
               rData.labels.push(ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
            });

            // Set current data to the latest point
            const latest = data[data.length - 1];
            rData.temp = parseFloat(latest.temperature_c);
            rData.hum = parseFloat(latest.humidity_percent);
            rData.vpd = parseFloat(latest.vpd_kpa) || 1.1;

            if (roomId === currentRoomId) {
                document.getElementById('manual-temp').value = rData.temp;
                document.getElementById('manual-hum').value = rData.hum;
                updateChartsVisuals();
                updateUI();
            }
        } else {
             // Clear out the hardcoded dummy data if DB is legitimately empty
             console.log('[Historical] Base de datos vacía para', roomId, 'Limpiando dummies.');
             rData.tempHistory = [];
             rData.humHistory = [];
             rData.vpdHistory = [];
             rData.labels = [];
             rData.temp = 0; rData.hum = 0; rData.vpd = 0;
             if(roomId === currentRoomId) {
                 document.getElementById('manual-temp').value = '';
                 document.getElementById('manual-hum').value = '';
                 updateChartsVisuals();
             }
        }
    } catch (err) {
        console.error('[Historical] Error fetching:', err);
    }
}

async function pollLatestTelemetry(roomId) {`;

    code = code.replace(/async function pollLatestTelemetry\(roomId\) \{/, histFunc);

    // 3. Fix webhook payload to use mapped ID instead of raw 'sala1'
    code = code.replace(/batch_id: currentRoomId,/, "batch_id: ROOM_ID_MAP[currentRoomId] || currentRoomId,");

    fs.writeFileSync('remote_main_patched.js', code);

    // Upload
    const ssh = new NodeSSH();
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });
        console.log('Uploading patched main.js...');
        await ssh.putFile('remote_main_patched.js', '/opt/crm-cannabis/main.js');
        console.log('Patch successfully deployed.');
        ssh.dispose();
    } catch (err) {
        console.error(err);
    }
}

patchMainJs();
