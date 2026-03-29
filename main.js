// CANNABIS-CORE 360 - Main Logic
// Simulated data fetching (Normally handled via WebSockets from Node/n8n)

let tempChartInstance = null;
let humChartInstance = null;
let vpdChartInstance = null;

let roomsData = {}; // Loaded dynamically from Supabase core_rooms

// Phase 4 - Intelligent Limits
const vpdLimits = {
    'Clones': { min: 0.4, max: 0.8 },
    'Vegetativo': { min: 0.8, max: 1.2 },
    'Floración': { min: 1.2, max: 1.6 },
    'Floracion': { min: 1.2, max: 1.6 },
    'Secado': { min: 0.8, max: 1.0 }
};

// Helper: Calculate VPD from temperature (°C) and humidity (%)
function calcVpd(tempC, humPct) {
    if (tempC === undefined || humPct === undefined || isNaN(tempC) || isNaN(humPct)) return 0;
    const svpPa = 610.78 * Math.exp((17.27 * tempC) / (tempC + 237.3));
    const svpKpa = svpPa / 1000;
    const avpKpa = svpKpa * (humPct / 100);
    const vpd = svpKpa - avpKpa;
    return parseFloat(vpd.toFixed(2)); // kPa as number
}

let currentRoomId = null; // Set after rooms load from DB

function getCurrentData() {
    return roomsData[currentRoomId];
}

// Colors dynamically resolved against CSS variables
function getChartColors() {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    return {
        textColor: isLight ? '#4B5563' : '#8F97B3', // text-secondary
        gridColor: isLight ? '#E5E7EB' : '#333333',
        pointBg: isLight ? '#FFFFFF' : '#121212'
    };
}

function getCommonChartOptions() {
    const colors = getChartColors();
    return {
        responsive: true, maintainAspectRatio: false,
        scales: {
            x: { grid: { display: false }, ticks: { color: colors.textColor } },
            y: { grid: { color: colors.gridColor }, ticks: { color: colors.textColor } }
        },
        plugins: { legend: { display: false } },
        elements: { point: { radius: 3 } }
    };
}

window.updateChartsTheme = function() {
    if (!tempChartInstance || !humChartInstance || !vpdChartInstance) return;
    const colors = getChartColors();
    const instances = [tempChartInstance, humChartInstance, vpdChartInstance];
    instances.forEach(chart => {
        chart.options.scales.x.ticks.color = colors.textColor;
        chart.options.scales.y.ticks.color = colors.textColor;
        chart.options.scales.y.grid.color = colors.gridColor;
        chart.data.datasets.forEach(ds => ds.pointBackgroundColor = colors.pointBg);
        chart.update();
    });
};

function createGradient(ctx, color) {
    let gradient = ctx.createLinearGradient(0, 0, 0, 250);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'transparent');
    return gradient;
}

// Initialize Charts
function initCharts() {
    const data = getCurrentData();
    if (!data) {
        console.warn("[Init] No data available for charts yet.");
        return;
    }

    const opts = getCommonChartOptions();
    const colors = getChartColors();

    // Temp Chart
    const ctxTemp = document.getElementById('tempChart').getContext('2d');
    tempChartInstance = new Chart(ctxTemp, {
        type: 'line',
        data: {
            labels: [...data.labels],
            datasets: [{
                label: 'Temp (°C)', data: [...data.tempHistory],
                borderColor: '#FF3D00', backgroundColor: createGradient(ctxTemp, 'rgba(255, 61, 0, 0.5)'),
                borderWidth: 2, fill: true, tension: 0.4, pointBackgroundColor: colors.pointBg, pointBorderColor: '#FF3D00'
            }]
        },
        options: { ...opts, scales: { ...opts.scales, y: { ...opts.scales.y, suggestedMin: 18, suggestedMax: 32 } } }
    });

    // Hum Chart
    const ctxHum = document.getElementById('humChart').getContext('2d');
    humChartInstance = new Chart(ctxHum, {
        type: 'line',
        data: {
            labels: [...data.labels],
            datasets: [{
                label: 'Hum (%)', data: [...data.humHistory],
                borderColor: '#2979FF', backgroundColor: createGradient(ctxHum, 'rgba(41, 121, 255, 0.5)'),
                borderWidth: 2, fill: true, tension: 0.4, pointBackgroundColor: colors.pointBg, pointBorderColor: '#2979FF'
            }]
        },
        options: { ...opts, scales: { ...opts.scales, y: { ...opts.scales.y, suggestedMin: 30, suggestedMax: 80 } } }
    });

    // VPD Chart
    const ctxVpd = document.getElementById('vpdChart').getContext('2d');
    vpdChartInstance = new Chart(ctxVpd, {
        type: 'line',
        data: {
            labels: [...data.labels],
            datasets: [{
                label: 'VPD (kPa)', data: [...data.vpdHistory],
                borderColor: '#00E676', backgroundColor: createGradient(ctxVpd, 'rgba(0, 230, 118, 0.5)'),
                borderWidth: 2, fill: true, tension: 0.4, pointBackgroundColor: colors.pointBg, pointBorderColor: '#00E676'
            }]
        },
        options: { ...opts, scales: { ...opts.scales, y: { ...opts.scales.y, suggestedMin: 0.5, suggestedMax: 1.8 } } }
    });
}

// Update Active Room UI
function changeRoom() {
    currentRoomId = document.getElementById('roomSelect').value;
    updateChartsVisuals();
    updateUI();
    // Actualizar campos manuales
    const data = getCurrentData();
    document.getElementById('manual-temp').value = data.temp;
    document.getElementById('manual-hum').value = data.hum;
}

function updateChartsVisuals() {
    const data = getCurrentData();
    if (!data || !tempChartInstance || !humChartInstance || !vpdChartInstance) return;

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
    let status = 'optimal'; // optimal, warning, critical

    // Phase 4: Dynamic VPD Limits based on Room Phase
    const phaseLimits = vpdLimits[data.phase] || { min: 0.4, max: 1.6 }; // Fallback generic limits

    // Temp & Hum fallback statics, but VPD is now dynamic
    if (data.temp > 30 || data.temp < 18 || data.vpd < phaseLimits.min || data.vpd > phaseLimits.max) {
        status = 'critical';
    } else if (data.temp > 28 || data.hum > 60 ||
        (data.vpd >= (phaseLimits.max - 0.1) && data.vpd <= phaseLimits.max) ||
        (data.vpd <= (phaseLimits.min + 0.1) && data.vpd >= phaseLimits.min)) {
        // Warning if Temperature is High, Hum is High, or VPD is near limits
        status = 'warning';
    }

    // Apply Glow and Text based on Status
    updateWidgetState('temp', data.temp.toFixed(1), status);
    updateWidgetState('hum', data.hum.toFixed(1), status);
    updateWidgetState('vpd', data.vpd.toFixed(2), status);

    // Global Status Update
    const globalDot = document.getElementById('globalStatusDot');
    const globalText = document.getElementById('globalStatusText');
    const alertRoomName = document.getElementById('alertRoomName');

    globalDot.className = 'status-indicator'; // reset
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
    document.getElementById(`val-${id}`).innerText = value;

    const widget = document.getElementById(`widget-${id}`);
    const badge = document.getElementById(`badge-${id}`);

    // Reset Classes
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

// Simulators for demo purposes
function pushChartData(dataRef, newTemp, newHum, newVpd) {
    const timeNow = new Date().toLocaleTimeString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit' });
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
    data.temp = 32.5; // Critical High
    data.vpd = 1.9;   // Critical High

    pushChartData(data, data.temp, data.hum, data.vpd);
    updateChartsVisuals();
    updateUI();
}

function dismissAlert() {
    document.getElementById('emergencyOverlay').classList.remove('active');
    // En producción, esconder la alerta visual no debe sobrescribir 
    // forzosamente los datos reales del gráfico por datos controlados
}

// Update from Manual Inputs
async function updateManualTelemetry(silentUpdate = false) {
    const tempInput = parseFloat(document.getElementById('manual-temp').value);
    const humInput = parseFloat(document.getElementById('manual-hum').value);

    if (isNaN(tempInput) || isNaN(humInput)) {
        alert("Por favor ingrese valores válidos.");
        return;
    }

    // Calcula VPD (Magnus formula: VPD = SVP - AVP)
    const calculatedVpd = calcVpd(tempInput, humInput);

    // Actualiza Variables
    const data = getCurrentData();
    data.temp = tempInput;
    data.hum = humInput;
    data.vpd = calculatedVpd;

    // Actualiza Chart
    pushChartData(data, data.temp, data.hum, data.vpd);
    updateChartsVisuals();

    // Actualiza Contenido Visual
    updateUI();

    // Re-evaluar estatus localmente para sincronizar a backend post-input
    let status = 'optimal';
    const phaseLimits = vpdLimits[data.phase] || { min: 0.4, max: 1.6 };

    if (data.temp > 30 || data.temp < 18 || data.vpd < phaseLimits.min || data.vpd > phaseLimits.max) {
        status = 'critical';
    } else if (data.temp > 28 || data.hum > 60 ||
        (data.vpd >= (phaseLimits.max - 0.1) && data.vpd <= phaseLimits.max) ||
        (data.vpd <= (phaseLimits.min + 0.1) && data.vpd >= phaseLimits.min)) {
        status = 'warning';
    }

    // SI LA ACTUALIZACION VINO DEL POLLING (WHATSAPP), NO LO REENVIAMOS AL BACKEND
    if (silentUpdate) return;

    // Enviar a Webhook de n8n para Historial (Solo si es input humano web)
    const payload = {
        batch_id: currentRoomId,
        phase: data.phase,
        temp: data.temp,
        humidity: data.hum,
        vpd: data.vpd,
        status: status,
        timestamp: new Date().toISOString()
    };

    try {
        const webhookUrl = "http://109.199.99.126.sslip.io:5678/webhook/telemetry";
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            console.error("n8n Webhook Error al guardar telemetría:", response.status);
        } else {
            console.log("Telemetría Web enviada a n8n correctamente.");
        }
    } catch (error) {
        console.error("Error contactando Webhook de telemetría en n8n:", error);
    }
}

// 2. Simulate n8n Sales webhook trigger
function simulateSale() {
    // Disabled functionality removed from dashboard
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

    // Phase 5: Recurrence
    if (recurrenceDays && parseInt(recurrenceDays) > 0) {
        payload.recurrence = [`RRULE:FREQ=DAILY;INTERVAL=${parseInt(recurrenceDays)}`];
    }

    const webhookUrl = "http://109.199.99.126.sslip.io:5678/webhook/tareas-calendar";

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
        console.error("Error contactando Webhook Google Calendar:", error);
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

// Init
window.addEventListener('DOMContentLoaded', () => {
    initCharts();
    updateUI();

    const taskForm = document.getElementById('taskForm');
    if (taskForm) {
        taskForm.addEventListener('submit', handleNewTask);
    }

    // Lógica para Formulario de Alta de Sala de Cultivo
    const addRoomForm = document.getElementById('addRoomForm');
    if (addRoomForm) {
        addRoomForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const newRoomName = document.getElementById('newRoomName').value;
            const newRoomPhase = document.getElementById('newRoomPhase').value;
            const newRoomId = 'room' + Date.now();

            // Generate Data Model for new room
            roomsData[newRoomId] = {
                name: newRoomName + ' (' + newRoomPhase + ')',
                phase: newRoomPhase,
                temp: 25.0, hum: 55.0, vpd: 1.0,
                tempHistory: [25, 25, 25, 25, 25, 25, 25],
                humHistory: [55, 55, 55, 55, 55, 55, 55],
                vpdHistory: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
                labels: ['10:00', '10:05', '10:10', '10:15', '10:20', '10:25', '10:30']
            };

            // Inject in generic Select
            const select = document.getElementById('roomSelect');
            const option = document.createElement('option');
            option.value = newRoomId;
            option.text = roomsData[newRoomId].name;
            select.appendChild(option);

            // Auto Select new room
            select.value = newRoomId;
            changeRoom(); // Switch context globally

            // Clean & Close modal
            closeAddRoomModal();
        });
    }

    // Load rooms from Supabase on startup
    loadRoomsFromDB();

    // Phase 6: Polling Telemetría Inbound (WhatsApp -> n8n)
    // Inicializado cada 3 Segundos para Demostración en vivo
    const POLLING_INTERVAL_MS = 3000; // 3 Segundos

    setInterval(() => {
        pollLatestTelemetry(currentRoomId);
    }, POLLING_INTERVAL_MS);

    // Primer poll con demora para dar tiempo a loadRoomsFromDB
    setTimeout(() => pollLatestTelemetry(currentRoomId), 2000);

});

// Función central de Polling
let lastTelemetryTime = {};

// Load rooms dynamically from Supabase core_rooms
async function loadRoomsFromDB() {
    if (!window.sbClient) { setTimeout(loadRoomsFromDB, 500); return; }
    try {
        const { data, error } = await window.sbClient
            .from('core_rooms')
            .select('id, name, phase')
            .order('name', { ascending: true });

        if (error || !data || data.length === 0) {
            console.warn('[Rooms] No rooms found in DB, using fallback.');
            return;
        }

        const select = document.getElementById('roomSelect');
        if (select) select.innerHTML = ''; // clear static options

        data.forEach((room, idx) => {
            // Create roomsData entry using the UUID as the key
            roomsData[room.id] = {
                name: `${room.name} (${room.phase})`,
                displayName: room.name,
                phase: room.phase,
                temp: 25.0, hum: 55.0, vpd: calcVpd(25.0, 55.0),
                tempHistory: [25, 25, 25, 25, 25, 25, 25],
                humHistory: [55, 55, 55, 55, 55, 55, 55],
                vpdHistory: Array(7).fill(calcVpd(25.0, 55.0)),
                labels: ['--:--', '--:--', '--:--', '--:--', '--:--', '--:--', '--:--']
            };

            if (select) {
                const opt = document.createElement('option');
                opt.value = room.id;
                opt.text = `${room.name} (${room.phase})`;
                select.appendChild(opt);
            }

            if (idx === 0) currentRoomId = room.id;
        });

        if (currentRoomId) {
            if (select) select.value = currentRoomId;
            updateChartsVisuals();
            updateUI();
        }
        console.log(`[Rooms] Loaded ${data.length} room(s) from Supabase.`);
    } catch (e) {
        console.error('[Rooms] Error loading rooms:', e);
    }
}

async function pollLatestTelemetry(roomId) {
    try {
        if (!window.sbClient) {
            console.warn('[Polling] sbClient not ready yet.');
            return;
        }
        if (!roomId) return; // Not loaded yet

        // Fetch the last 10 points to populate history on load/change
        const { data, error } = await window.sbClient
            .from('daily_telemetry')
            .select('temperature_c, humidity_percent, created_at')
            .eq('batch_id', roomId)
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) {
            console.error('[Polling] Supabase error:', error.message);
            return;
        }
        if (!data || data.length === 0) {
            // If no data, reset history to avoid showing old room data
            const rData = roomsData[roomId];
            if (rData) {
                rData.tempHistory = [];
                rData.humHistory = [];
                rData.vpdHistory = [];
                rData.labels = [];
                updateChartsVisuals();
                updateUI();
            }
            return;
        }

        const dataRev = [...data].reverse();
        const latest = dataRev[dataRev.length - 1];
        
        const roomIdData = roomsData[roomId];
        if (roomIdData) {
            // Populate histories
            roomIdData.labels = dataRev.map(row => new Date(row.created_at).toLocaleTimeString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit' }));
            roomIdData.tempHistory = dataRev.map(row => parseFloat(row.temperature_c));
            roomIdData.humHistory = dataRev.map(row => parseFloat(row.humidity_percent));
            roomIdData.vpdHistory = dataRev.map(row => calcVpd(parseFloat(row.temperature_c), parseFloat(row.humidity_percent)));
            
            roomIdData.temp = parseFloat(latest.temperature_c);
            roomIdData.hum = parseFloat(latest.humidity_percent);
            roomIdData.vpd = calcVpd(roomIdData.temp, roomIdData.hum);

            if (latest.created_at !== lastTelemetryTime[roomId]) {
                lastTelemetryTime[roomId] = latest.created_at;
                const timeStr = new Date(latest.created_at).toLocaleTimeString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit' });
                const pollingStatus = document.getElementById('polling-status');
                if (pollingStatus) pollingStatus.innerHTML = `<i class="ph ph-check-circle"></i> Última sync: ${timeStr}`;
                
                document.getElementById('manual-temp').value = roomIdData.temp;
                document.getElementById('manual-hum').value = roomIdData.hum;
            }

            if (!tempChartInstance) {
                initCharts();
            } else {
                updateChartsVisuals();
            }
            updateUI();
        }
    } catch (error) {
        console.error('[Polling] Error consultando Supabase:', error);
    }
}
