// CANNABIS-CORE 360 - Main Logic
// All room data loaded dynamically from Supabase core_rooms table

let tempChartInstance = null;
let humChartInstance = null;
let vpdChartInstance = null;

// roomsData is populated dynamically from Supabase
let roomsData = {};
let currentRoomId = null;

// Phase 4 - Intelligent Limits
const vpdLimits = {
    'Clones': { min: 0.4, max: 0.8 },
    'Vegetativo': { min: 0.8, max: 1.2 },
    'Floración': { min: 1.2, max: 1.6 },
    'Secado': { min: 0.8, max: 1.0 }
};

// Sidecar webhook URL (production)
const TELEMETRY_WEBHOOK_URL = "http://109.199.99.126:5680/telemetry";

function getCurrentData() {
    if (!currentRoomId || !roomsData[currentRoomId]) return null;
    return roomsData[currentRoomId];
}

// Configs for Charts
const commonChartOptions = {
    responsive: true, maintainAspectRatio: false,
    scales: {
        x: { grid: { display: false }, ticks: { color: '#AAA' } },
        y: { grid: { color: '#333' }, ticks: { color: '#AAA' } }
    },
    plugins: { legend: { display: false } },
    elements: { point: { radius: 3 } }
};

function createGradient(ctx, color) {
    let gradient = ctx.createLinearGradient(0, 0, 0, 250);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'transparent');
    return gradient;
}

// Initialize Charts with empty data
function initCharts() {
    // Temp Chart
    const ctxTemp = document.getElementById('tempChart').getContext('2d');
    tempChartInstance = new Chart(ctxTemp, {
        type: 'line',
        data: { labels: [], datasets: [{ label: 'Temp (°C)', data: [], borderColor: '#FF3D00', backgroundColor: createGradient(ctxTemp, 'rgba(255, 61, 0, 0.5)'), borderWidth: 2, fill: true, tension: 0.4, pointBackgroundColor: '#121212', pointBorderColor: '#FF3D00' }] },
        options: { ...commonChartOptions, scales: { ...commonChartOptions.scales, y: { ...commonChartOptions.scales.y, suggestedMin: 18, suggestedMax: 32 } } }
    });

    // Hum Chart
    const ctxHum = document.getElementById('humChart').getContext('2d');
    humChartInstance = new Chart(ctxHum, {
        type: 'line',
        data: { labels: [], datasets: [{ label: 'Hum (%)', data: [], borderColor: '#2979FF', backgroundColor: createGradient(ctxHum, 'rgba(41, 121, 255, 0.5)'), borderWidth: 2, fill: true, tension: 0.4, pointBackgroundColor: '#121212', pointBorderColor: '#2979FF' }] },
        options: { ...commonChartOptions, scales: { ...commonChartOptions.scales, y: { ...commonChartOptions.scales.y, suggestedMin: 30, suggestedMax: 80 } } }
    });

    // VPD Chart
    const ctxVpd = document.getElementById('vpdChart').getContext('2d');
    vpdChartInstance = new Chart(ctxVpd, {
        type: 'line',
        data: { labels: [], datasets: [{ label: 'VPD (kPa)', data: [], borderColor: '#00E676', backgroundColor: createGradient(ctxVpd, 'rgba(0, 230, 118, 0.5)'), borderWidth: 2, fill: true, tension: 0.4, pointBackgroundColor: '#121212', pointBorderColor: '#00E676' }] },
        options: { ...commonChartOptions, scales: { ...commonChartOptions.scales, y: { ...commonChartOptions.scales.y, suggestedMin: 0.5, suggestedMax: 1.8 } } }
    });
}

// Load rooms from Supabase core_rooms table
async function loadRoomsFromSupabase() {
    if (!window.sbClient) {
        console.warn('[Rooms] sbClient not ready yet.');
        return;
    }
    try {
        const { data, error } = await window.sbClient
            .from('core_rooms')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) throw error;

        const rooms = data || [];
        const select = document.getElementById('roomSelect');
        // Clear existing options
        select.innerHTML = '';

        if (rooms.length === 0) {
            const opt = document.createElement('option');
            opt.value = '';
            opt.text = 'No hay salas. Crea una sala primero.';
            select.appendChild(opt);
            currentRoomId = null;
            console.warn('[Rooms] No rooms found in core_rooms.');
            return;
        }

        rooms.forEach(room => {
            // Initialize roomsData entry for this room
            roomsData[room.id] = {
                name: room.name + (room.phase ? ` (${room.phase})` : ''),
                phase: room.phase || 'Floración',
                supabaseId: room.id,
                temp: 0, hum: 0, vpd: 0,
                tempHistory: [],
                humHistory: [],
                vpdHistory: [],
                labels: []
            };
            const opt = document.createElement('option');
            opt.value = room.id;
            opt.text = room.name + (room.phase ? ` (${room.phase})` : '');
            select.appendChild(opt);
        });

        // Set default room to first one
        currentRoomId = rooms[0].id;
        select.value = currentRoomId;

        // Load historical telemetry for first room
        await fetchHistoricalTelemetry(currentRoomId);

        console.log(`[Rooms] Loaded ${rooms.length} rooms from Supabase.`);
    } catch (e) {
        console.error('[Rooms] Error loading rooms:', e);
    }
}

// Update Active Room UI
async function changeRoom() {
    const newRoomId = document.getElementById('roomSelect').value;
    if (!newRoomId) return;
    currentRoomId = newRoomId;

    // Fetch history for the selected room
    await fetchHistoricalTelemetry(currentRoomId);
    updateChartsVisuals();
    updateUI();

    const data = getCurrentData();
    if (data) {
        document.getElementById('manual-temp').value = data.temp || '';
        document.getElementById('manual-hum').value = data.hum || '';
    }
}

function updateChartsVisuals() {
    const data = getCurrentData();
    if (!data || !tempChartInstance) return;

    tempChartInstance.data.labels = [...data.labels];
    tempChartInstance.data.datasets[0].data = [...data.tempHistory];
    tempChartInstance.update();

    humChartInstance.data.labels = [...data.labels];
    humChartInstance.data.datasets[0].data = [...data.humHistory];
    humChartInstance.update();

    vpdChartInstance.data.labels = [...data.labels];
    vpdChartInstance.data.datasets[0].data = [...data.vpdHistory];
    vpdChartInstance.update();
}

// Modal functions for adding rooms
function openAddRoomModal() {
    document.getElementById('addRoomModal').classList.add('active');
}

function closeAddRoomModal() {
    document.getElementById('addRoomModal').classList.remove('active');
    document.getElementById('addRoomForm').reset();
}

// Update UI Values
function updateUI() {
    const data = getCurrentData();
    if (!data) return;

    let status = 'optimal';
    const phaseLimits = vpdLimits[data.phase] || { min: 0.4, max: 1.6 };

    if (data.temp > 30 || data.temp < 18 || data.vpd < phaseLimits.min || data.vpd > phaseLimits.max) {
        status = 'critical';
    } else if (data.temp > 28 || data.hum > 60 ||
        (data.vpd >= (phaseLimits.max - 0.1) && data.vpd <= phaseLimits.max) ||
        (data.vpd <= (phaseLimits.min + 0.1) && data.vpd >= phaseLimits.min)) {
        status = 'warning';
    }

    if (data.temp > 0) {
        updateWidgetState('temp', data.temp.toFixed(1), status);
        updateWidgetState('hum', data.hum.toFixed(1), status);
        updateWidgetState('vpd', data.vpd.toFixed(2), status);
    }

    const globalDot = document.getElementById('globalStatusDot');
    const globalText = document.getElementById('globalStatusText');

    globalDot.className = 'status-indicator';
    if (status === 'optimal') {
        globalDot.classList.add('status-green');
        globalText.innerText = `Sistema Normal (${data.name})`;
    } else if (status === 'warning') {
        globalDot.classList.add('status-yellow');
        globalText.innerText = `Alerta en ${data.name}`;
    } else {
        globalDot.classList.add('status-red');
        globalText.innerText = `⚠️ Revisar ${data.name}`;
    }
}

function updateWidgetState(id, value, status) {
    const valEl = document.getElementById(`val-${id}`);
    if (valEl) valEl.innerText = value;

    const widget = document.getElementById(`widget-${id}`);
    const badge = document.getElementById(`badge-${id}`);
    if (!widget || !badge) return;

    widget.className = 'widget telemetry-widget';
    badge.className = 'badge';

    if (status === 'optimal') {
        widget.classList.add('glow-green');
        badge.classList.add('badge-optimal');
        badge.innerText = 'Óptimo';
    } else if (status === 'warning') {
        widget.classList.add('glow-yellow');
        badge.classList.add('badge-warning');
        badge.innerText = 'Alerta';
    } else {
        widget.classList.add('glow-red');
        badge.classList.add('badge-critical');
        badge.innerText = 'Crítico';
    }
}

function pushChartData(dataRef, newTemp, newHum, newVpd) {
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    dataRef.labels.push(timeNow);
    dataRef.tempHistory.push(newTemp);
    dataRef.humHistory.push(newHum);
    dataRef.vpdHistory.push(newVpd);

    if (dataRef.labels.length > 10) {
        dataRef.labels.shift();
        dataRef.tempHistory.shift();
        dataRef.humHistory.shift();
        dataRef.vpdHistory.shift();
    }
}

function simulateAnomaly() {
    const data = getCurrentData();
    if (!data) return;
    data.temp = 32.5;
    data.vpd = 1.9;
    pushChartData(data, data.temp, data.hum, data.vpd);
    updateChartsVisuals();
    updateUI();
}

function dismissAlert() {
    document.getElementById('emergencyOverlay').classList.remove('active');
}

// Update from Manual Inputs
async function updateManualTelemetry(silentUpdate = false) {
    const tempInput = parseFloat(document.getElementById('manual-temp').value);
    const humInput = parseFloat(document.getElementById('manual-hum').value);

    if (isNaN(tempInput) || isNaN(humInput)) {
        alert("Por favor ingrese valores válidos.");
        return;
    }

    const svpPa = 610.78 * Math.exp((17.27 * tempInput) / (tempInput + 237.3));
    const svpKpa = svpPa / 1000;
    const calculatedVpd = svpKpa * (1 - humInput / 100);

    const data = getCurrentData();
    if (!data) { alert("Seleccioná una sala primero."); return; }

    data.temp = tempInput;
    data.hum = humInput;
    data.vpd = calculatedVpd;

    pushChartData(data, data.temp, data.hum, data.vpd);
    updateChartsVisuals();
    updateUI();

    if (silentUpdate) return;

    let status = 'optimal';
    const phaseLimits = vpdLimits[data.phase] || { min: 0.4, max: 1.6 };
    if (data.temp > 30 || data.temp < 18 || data.vpd < phaseLimits.min || data.vpd > phaseLimits.max) {
        status = 'critical';
    } else if (data.temp > 28 || data.hum > 60) {
        status = 'warning';
    }

    // Use the room's Supabase UUID as batch_id
    const supabaseRoomId = data.supabaseId || currentRoomId;

    const payload = {
        batch_id: supabaseRoomId,
        room_id: supabaseRoomId,
        phase: data.phase,
        temp: data.temp,
        humidity: data.hum,
        vpd: calculatedVpd,
        status: status,
        timestamp: new Date().toISOString()
    };

    try {
        const response = await fetch(TELEMETRY_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            console.error("Sidecar Webhook Error:", response.status);
        } else {
            console.log("✅ Telemetría guardada en Supabase.");
        }
    } catch (error) {
        console.error("Error contactando sidecar de telemetría:", error);
    }
}

// --- Tareas y Google Calendar ---
async function handleNewTask(e) {
    e.preventDefault();

    const title = document.getElementById('taskTitle').value;
    const date = document.getElementById('taskDate').value;
    const time = document.getElementById('taskTime').value;
    const recurrenceDays = document.getElementById('taskRecurrence').value;

    let payload = {
        action: 'CREATE_CALENDAR_EVENT',
        title: title,
        datetime: `${date}T${time}:00`,
        timestamp: new Date().toISOString()
    };

    if (recurrenceDays && parseInt(recurrenceDays) > 0) {
        payload.recurrence = [`RRULE:FREQ=DAILY;INTERVAL=${parseInt(recurrenceDays)}`];
    }

    const webhookUrl = "http://109.199.99.126:5678/webhook/tareas-calendar";

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const feedback = document.getElementById('taskFeedback');
        if (response.ok) {
            feedback.style.display = 'block';
            feedback.style.color = 'var(--color-green)';
            feedback.style.borderColor = 'var(--color-green)';
            feedback.style.backgroundColor = 'rgba(0, 230, 118, 0.1)';
            feedback.innerText = 'Evento enviado a Google Calendar con éxito.';
            e.target.reset();
        } else {
            feedback.style.display = 'block';
            feedback.style.color = 'var(--color-yellow)';
            feedback.style.borderColor = 'var(--color-yellow)';
            feedback.style.backgroundColor = 'rgba(255, 193, 7, 0.1)';
            feedback.innerText = 'Error de n8n. Se agendó localmente por defecto.';
        }
    } catch (error) {
        const feedback = document.getElementById('taskFeedback');
        feedback.style.display = 'block';
        feedback.style.color = 'var(--color-red)';
        feedback.style.borderColor = 'var(--color-red)';
        feedback.style.backgroundColor = 'rgba(255, 82, 82, 0.1)';
        feedback.innerText = 'No hay conexión (n8n apagado).';
    }

    setTimeout(() => {
        document.getElementById('taskFeedback').style.display = 'none';
    }, 4000);
}

// Fetch historical telemetry for a room from Supabase
async function fetchHistoricalTelemetry(roomId) {
    try {
        if (!window.sbClient) return;

        const data = roomsData[roomId];
        if (!data) return;

        const supabaseRoomId = data.supabaseId || roomId;

        const { data: rows, error } = await window.sbClient
            .from('daily_telemetry')
            .select('temperature_c, humidity_percent, vpd_kpa, created_at')
            .eq('batch_id', supabaseRoomId)
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) {
            console.error('[Historical] Supabase error:', error.message);
            return;
        }

        if (rows && rows.length > 0) {
            const reversed = [...rows].reverse();

            data.tempHistory = reversed.map(r => parseFloat(r.temperature_c));
            data.humHistory = reversed.map(r => parseFloat(r.humidity_percent));
            data.vpdHistory = reversed.map(r => parseFloat(r.vpd_kpa) || 0);
            data.labels = reversed.map(r => new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

            const latest = reversed[reversed.length - 1];
            data.temp = parseFloat(latest.temperature_c);
            data.hum = parseFloat(latest.humidity_percent);
            data.vpd = parseFloat(latest.vpd_kpa) || 0;

            if (roomId === currentRoomId) {
                document.getElementById('manual-temp').value = data.temp;
                document.getElementById('manual-hum').value = data.hum;
            }
            console.log(`[Historical] ✅ Loaded ${rows.length} records for room ${roomId}`);
        } else {
            // No historical data — clear chart
            data.tempHistory = [];
            data.humHistory = [];
            data.vpdHistory = [];
            data.labels = [];
            data.temp = 0;
            data.hum = 0;
            data.vpd = 0;
            if (roomId === currentRoomId) {
                document.getElementById('manual-temp').value = '';
                document.getElementById('manual-hum').value = '';
            }
        }
    } catch (err) {
        console.error('[Historical] Error fetching:', err);
    }
}

// Polling: check Supabase for latest telemetry every 30s
let lastTelemetryTime = {};

async function pollLatestTelemetry(roomId) {
    try {
        if (!window.sbClient || !roomId || !roomsData[roomId]) return;

        const supabaseRoomId = roomsData[roomId].supabaseId || roomId;

        const { data, error } = await window.sbClient
            .from('daily_telemetry')
            .select('temperature_c, humidity_percent, vpd_kpa, created_at')
            .eq('batch_id', supabaseRoomId)
            .order('created_at', { ascending: false })
            .limit(1);

        if (error || !data || data.length === 0) return;

        const row = data[0];
        if (row.created_at !== lastTelemetryTime[roomId]) {
            lastTelemetryTime[roomId] = row.created_at;

            const numTemp = parseFloat(row.temperature_c);
            const numHum = parseFloat(row.humidity_percent);
            const numVpd = parseFloat(row.vpd_kpa) || 0;

            if (isNaN(numTemp) || isNaN(numHum)) return;

            const timeStr = new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const pollingStatus = document.getElementById('polling-status');
            if (pollingStatus) pollingStatus.innerHTML = `<i class="ph ph-check-circle"></i> Última sync: ${timeStr}`;

            const rData = roomsData[roomId];
            if (rData) {
                rData.temp = numTemp;
                rData.hum = numHum;
                rData.vpd = numVpd;
                pushChartData(rData, numTemp, numHum, numVpd);
                if (roomId === currentRoomId) {
                    updateChartsVisuals();
                    updateUI();
                }
            }
        }
    } catch (error) {
        console.error('[Polling] Error:', error);
    }
}

// Init
window.addEventListener('DOMContentLoaded', async () => {
    initCharts();

    const taskForm = document.getElementById('taskForm');
    if (taskForm) {
        taskForm.addEventListener('submit', handleNewTask);
    }

    // Room creation form - saves to Supabase core_rooms
    const addRoomForm = document.getElementById('addRoomForm');
    if (addRoomForm) {
        addRoomForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const newRoomName = document.getElementById('newRoomName').value;
            const newRoomPhase = document.getElementById('newRoomPhase').value;

            if (!window.sbClient) {
                alert('Error: Conexión a base de datos no disponible.');
                return;
            }

            try {
                const { data, error } = await window.sbClient
                    .from('core_rooms')
                    .insert([{ name: newRoomName, phase: newRoomPhase }])
                    .select();

                if (error) throw error;

                const newRoom = data[0];
                const newRoomId = newRoom.id;

                // Add to local roomsData
                roomsData[newRoomId] = {
                    name: newRoomName + ` (${newRoomPhase})`,
                    phase: newRoomPhase,
                    supabaseId: newRoomId,
                    temp: 0, hum: 0, vpd: 0,
                    tempHistory: [],
                    humHistory: [],
                    vpdHistory: [],
                    labels: []
                };

                // Add to select
                const select = document.getElementById('roomSelect');
                const option = document.createElement('option');
                option.value = newRoomId;
                option.text = newRoomName + ` (${newRoomPhase})`;
                select.appendChild(option);

                select.value = newRoomId;
                currentRoomId = newRoomId;
                updateChartsVisuals();
                updateUI();

                closeAddRoomModal();
                console.log('✅ Room created:', newRoomName);
            } catch (err) {
                console.error('Error creating room:', err);
                alert('Error al crear la sala: ' + err.message);
            }
        });
    }

    // Wait for sbClient to be ready, then load rooms
    const waitForClient = () => new Promise(resolve => {
        if (window.sbClient) return resolve();
        let tries = 0;
        const interval = setInterval(() => {
            tries++;
            if (window.sbClient || tries > 20) { clearInterval(interval); resolve(); }
        }, 100);
    });

    await waitForClient();
    await loadRoomsFromSupabase();
    updateUI();

    // Poll every 30 seconds
    setInterval(() => {
        if (currentRoomId) pollLatestTelemetry(currentRoomId);
    }, 30000);
});
