const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function patchDashboard() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        console.log('Fetching index.html...');
        let htmlContent = (await ssh.execCommand('cat /opt/crm-cannabis/index.html')).stdout;

        // Fix room selector wrapping by adding min-width and flex-shrink
        htmlContent = htmlContent.replace(
            'class="room-selector"\\n                        style="display: flex; align-items: center; gap: 10px; background: var(--panel-dark); padding: 8px 15px; border-radius: 8px; border: 1px solid #333;"',
            'class="room-selector"\\n                        style="display: flex; align-items: center; gap: 10px; background: var(--panel-dark); padding: 8px 15px; border-radius: 8px; border: 1px solid #333; flex-shrink: 0; min-width: 280px;"'
        );
        // Also inject a small CSS tweak in <head> to force the select element to not wrap
        htmlContent = htmlContent.replace(
            '</head>',
            '    <style>#roomSelect { white-space: normal; width: auto; max-width: 100%; overflow: visible; text-overflow: unset; }</style>\\n</head>'
        );

        console.log('Uploading patched index.html...');
        fs.writeFileSync('temp_index.html', htmlContent);
        await ssh.putFile('temp_index.html', '/opt/crm-cannabis/index.html');

        console.log('Fetching main.js...');
        let mainContent = (await ssh.execCommand('cat /opt/crm-cannabis/main.js')).stdout;

        // We need to inject a new function to fetch historical data, and substitute the dummy data
        const historyFunction = `
async function fetchHistoricalTelemetry(roomId) {
    try {
        if (!window.sbClient) return;
        const supabaseRoomId = ROOM_ID_MAP[roomId] || roomId;
        const { data, error } = await window.sbClient
            .from('daily_telemetry')
            .select('temperature_c, humidity_percent, created_at')
            .eq('batch_id', supabaseRoomId)
            .order('created_at', { ascending: false })
            .limit(10);
            
        if (error) throw error;
        
        if (data && data.length > 0) {
            // Sort ascending for chart (oldest to newest)
            data.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            
            const room = roomsData[roomId];
            room.labels = [];
            room.tempHistory = [];
            room.humHistory = [];
            room.vpdHistory = [];
            
            data.forEach(row => {
                const numTemp = parseFloat(row.temperature_c);
                const numHum = parseFloat(row.humidity_percent);
                if(isNaN(numTemp) || isNaN(numHum)) return;
                
                const timeStr = new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const svpPa = 610.78 * Math.exp((17.27 * numTemp) / (numTemp + 237.3));
                const calculatedVpd = (svpPa / 1000) * (1 - numHum / 100);
                
                room.labels.push(timeStr);
                room.tempHistory.push(numTemp);
                room.humHistory.push(numHum);
                room.vpdHistory.push(calculatedVpd);
                
                // Keep the current values updated to the last fetched record
                room.temp = numTemp;
                room.hum = numHum;
                room.vpd = calculatedVpd;
                lastTelemetryTime[roomId] = row.created_at;
            });
            
            // Pad arrays to 10 if we have less data
            while(room.labels.length < 10) {
                room.labels.unshift('--:--');
                room.tempHistory.unshift(0);
                room.humHistory.unshift(0);
                room.vpdHistory.unshift(0);
            }
            
            if(roomId === currentRoomId) {
                updateChartsVisuals();
                updateUI();
                
                document.getElementById('manual-temp').value = room.temp;
                document.getElementById('manual-hum').value = room.hum;
                const pollingStatus = document.getElementById('polling-status');
                if (pollingStatus) pollingStatus.innerHTML = \`<i class="ph ph-check-circle"></i> Historial cargado (\${data.length} registros)\`;
            }
        }
    } catch (err) {
        console.error('Error fetching history:', err);
    }
}
`;
        // Insert the function before the DOMContentLoaded logic
        mainContent = mainContent.replace("// Init\\nwindow.addEventListener('DOMContentLoaded', () => {", historyFunction + "\\n\\n// Init\\nwindow.addEventListener('DOMContentLoaded', () => {");


        // Make sure we call this function on DOMContentLoaded
        mainContent = mainContent.replace(
            '    setTimeout(() => pollLatestTelemetry(currentRoomId), 1000);',
            '    setTimeout(() => { fetchHistoricalTelemetry("sala1"); fetchHistoricalTelemetry("sala2"); pollLatestTelemetry(currentRoomId); }, 1000);'
        );

        // Also fetch context history when we switch rooms
        mainContent = mainContent.replace(
            '    updateUI();\\n    // Actualizar campos manuales',
            '    updateUI();\\n    fetchHistoricalTelemetry(currentRoomId);\\n    // Actualizar campos manuales'
        );

        console.log('Uploading patched main.js...');
        fs.writeFileSync('temp_main.js', mainContent);
        await ssh.putFile('temp_main.js', '/opt/crm-cannabis/main.js');

        console.log('✅ Fixes applied.');
        ssh.dispose();
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

patchDashboard();
