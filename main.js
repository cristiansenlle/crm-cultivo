// CANNABIS-CORE 360 - Main Logic
// Simulated data fetching (Normally handled via WebSockets from Node/n8n)

let tempChartInstance = null;
let humChartInstance = null;
let vpdChartInstance = null;

let coreSensorsMap = {}; // id -> { name, room_id }
let selectedSensorView = 'default';

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

function getApexColors() {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    return {
        text: isLight ? '#4B5563' : '#8F97B3',
        grid: isLight ? '#E5E7EB' : '#333333',
        bg: 'transparent'
    };
}

function getApexOptions(id, group, yMin, yMax, yFormatter) {
    const colors = getApexColors();
    return {
        series: [],
        chart: {
            id: id,
            group: group,
            type: 'area',
            height: 220,
            background: colors.bg,
            toolbar: { show: false },
            animations: { enabled: true, easing: 'easeinout', speed: 800 },
            parentHeightOffset: 0
        },
        colors: ['#FF3D00', '#2979FF', '#00E676', '#E040FB', '#FFC107', '#00B0FF'],
        dataLabels: { enabled: false },
        markers: {
            size: 4,
            strokeWidth: 2,
            hover: { size: 6 }
        },
        stroke: { curve: 'smooth', width: 2 },
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.4,
                opacityTo: 0.05,
                stops: [0, 100]
            }
        },
        grid: { borderColor: colors.grid, strokeDashArray: 4, xaxis: { lines: { show: true } }, yaxis: { lines: { show: true } } },
        xaxis: {
            type: 'datetime',
            labels: { 
                show: true,
                style: { colors: colors.text },
                datetimeUTC: false,
                datetimeFormatter: {
                    year: 'yyyy',
                    month: 'MMM \'yy',
                    day: 'dd MMM',
                    hour: 'HH:mm',
                    minute: 'HH:mm'
                }
            },
            axisBorder: { show: false },
            axisTicks: { show: false },
            tooltip: { enabled: false }
        },
        yaxis: {
            min: yMin, max: yMax,
            labels: { style: { colors: colors.text }, formatter: yFormatter }
        },
        legend: { display: false, show: false },
        theme: { mode: document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark' },
        tooltip: {
            theme: document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark',
            x: { show: true, format: 'HH:mm' }
        }
    };
}

function initCharts() {
    if (tempChartInstance) tempChartInstance.destroy();
    if (humChartInstance) humChartInstance.destroy();
    if (vpdChartInstance) vpdChartInstance.destroy();

    const tempOpts = getApexOptions('temp', 'syncGroup', 18, 35, (val) => val.toFixed(1) + '°C');
    const humOpts = getApexOptions('hum', 'syncGroup', 30, 80, (val) => val.toFixed(1) + '%');
    const vpdOpts = getApexOptions('vpd', 'syncGroup', 0.5, 2.0, (val) => val.toFixed(2) + 'k');

    tempChartInstance = new ApexCharts(document.getElementById('tempChart'), tempOpts);
    humChartInstance = new ApexCharts(document.getElementById('humChart'), humOpts);
    vpdChartInstance = new ApexCharts(document.getElementById('vpdChart'), vpdOpts);

    tempChartInstance.render();
    humChartInstance.render();
    vpdChartInstance.render();
}

function updateChartsVisuals() {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const mode = isLight ? 'light' : 'dark';
    const c = getApexColors();
    if (tempChartInstance) {
        tempChartInstance.updateOptions({ theme: { mode }, grid: { borderColor: c.grid }, xaxis: { labels: { style: { colors: c.text } } }, yaxis: { labels: { style: { colors: c.text } } } });
        humChartInstance.updateOptions({ theme: { mode }, grid: { borderColor: c.grid }, xaxis: { labels: { style: { colors: c.text } } }, yaxis: { labels: { style: { colors: c.text } } } });
        vpdChartInstance.updateOptions({ theme: { mode }, grid: { borderColor: c.grid }, xaxis: { labels: { style: { colors: c.text } } }, yaxis: { labels: { style: { colors: c.text } } } });
    }
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
    const phaseLimits = vpdLimits[data.phase] || { min: 0.4, max: 1.6 };

    // Decidir visualización según sensor seleccionado
    let dispTemp = data.temp;
    let dispHum = data.hum;
    let dispVpd = data.vpd;

    if (selectedSensorView !== 'default' && data.sensors && data.sensors[selectedSensorView]) {
        // Mostrar valores exactos de el sensor seleccionado
        const sData = data.sensors[selectedSensorView];
        if (sData.temps.length > 0) {
            dispTemp = sData.temps[sData.temps.length - 1].y;
            dispHum = sData.hums[sData.hums.length - 1].y;
            dispVpd = sData.vpds[sData.vpds.length - 1].y;
        }
    }

    if (dispTemp > 30 || dispTemp < 18 || dispVpd < phaseLimits.min || dispVpd > phaseLimits.max) {
        status = 'critical';
    } else if (dispTemp > 28 || dispHum > 60 ||
        (dispVpd >= (phaseLimits.max - 0.1) && dispVpd <= phaseLimits.max) ||
        (dispVpd <= (phaseLimits.min + 0.1) && dispVpd >= phaseLimits.min)) {
        status = 'warning';
    }

    updateWidgetState('temp', dispTemp.toFixed(1), status);
    updateWidgetState('hum', dispHum.toFixed(1), status);
    updateWidgetState('vpd', dispVpd.toFixed(2), status);

    const globalDot = document.getElementById('globalStatusDot');
    const globalText = document.getElementById('globalStatusText');
    if (globalDot && globalText) {
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
}

function updateWidgetState(id, value, status) {
    document.getElementById(`val-${id}`).innerText = value;
    const widget = document.getElementById(`widget-${id}`);
    const badge = document.getElementById(`badge-${id}`);

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

// Update Active Room UI
function changeRoom() {
    currentRoomId = document.getElementById('roomSelect').value;
    loadSensorsForRoom();
    selectedSensorView = 'default';
    if(document.getElementById('manualSensorSelect')) document.getElementById('manualSensorSelect').value = 'default';
    
    // Reset inputs
    document.getElementById('manual-temp').value = '';
    document.getElementById('manual-hum').value = '';
    
    loadSensorsForRoom();
    pollLatestTelemetry(currentRoomId);
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

// --- SENSOR CRUD ---
async function loadSensorsForRoom() {
    if (!window.sbClient || !currentRoomId) return;
    try {
        const { data, error } = await window.sbClient.from('core_sensors')
            .select('id, name, room_id, created_at')
            .eq('room_id', currentRoomId)
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        
        const manualSelect = document.getElementById('manualSensorSelect');
        if (manualSelect) {
            manualSelect.innerHTML = '<option value="default">Promedio / Sala General</option>';
            data.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.id;
                opt.text = s.name;
                manualSelect.appendChild(opt);
                coreSensorsMap[s.id] = { name: s.name, room_id: s.room_id };
            });
            manualSelect.value = selectedSensorView; 
        }

        const list = document.getElementById('activeSensorsList');
        if (list) {
            list.innerHTML = '';
            if (!data || data.length === 0) {
                list.innerHTML = '<li style="color:#888; text-align:center; padding:10px;">Ningún sensor creado en esta sala.</li>';
            } else {
                data.forEach(s => {
                    const li = document.createElement('li');
                    li.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; margin-bottom: 8px; background-color: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);';
                    li.innerHTML = `
                        <div style="display: flex; flex-direction: column; gap: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            <h4 style="margin: 0; font-size: 0.95rem; display: flex; align-items: center; gap: 6px; color: var(--text-primary);">
                                <i class="ph ph-thermometer" style="color: var(--color-indigo); font-size: 1.1rem;"></i>
                                <span style="font-weight: 600;">${s.name}</span>
                            </h4>
                            <span class="badge badge-indigo" style="font-size: 0.7rem; align-self: flex-start; padding: 2px 6px; margin-left: 20px;">ID: ${s.id.substring(0,8).toUpperCase()}</span>
                        </div>
                        <div style="display: flex; gap: 8px; align-items: center; flex-shrink: 0; padding-left: 10px;">
                            <button class="btn-primary" style="padding: 6px; width: 32px; height: 32px; font-size: 1rem; display: flex; align-items: center; justify-content: center; border-radius: 6px; cursor: pointer;" onclick="renameSensor('${s.id}', '${s.name}')" title="Editar">
                                <i class="ph ph-pencil"></i>
                            </button>
                            <button style="padding: 6px; width: 32px; height: 32px; font-size: 1rem; display: flex; align-items: center; justify-content: center; border-radius: 6px; background-color: rgba(255, 59, 48, 0.1); color: #ff3b30; border: 1px solid rgba(255,59,48,0.2); cursor: pointer;" onclick="deleteSensor('${s.id}')" title="Eliminar">
                                <i class="ph ph-trash"></i>
                            </button>
                        </div>
                    `;
                    list.appendChild(li);
                });
            }
        }
    } catch(e) {
        console.error("Error cargando sensores:", e.message);
    }
}

async function handleNewSensor(e) {
    e.preventDefault();
    if (!window.sbClient || !currentRoomId) return;
    const name = document.getElementById('sensorName').value;

    try {
        const { error } = await window.sbClient.from('core_sensors').insert([{
            room_id: currentRoomId,
            name: name
        }]);
        if (error) throw error;
        e.target.reset();
        await loadSensorsForRoom();
    } catch(err) {
        console.error("Error creando sensor:", err);
    }
}

window.deleteSensor = async function(id) {
    if (!confirm('¿Estás seguro de eliminar el sensor de esta sala? Nota: Si el sensor ya tiene historial de telemetría asociado, no podrá eliminarse por seguridad.')) return;
    try {
        const { error } = await window.sbClient.from('core_sensors').delete().eq('id', id);
        if (error) {
            console.error("Supabase Error eliminando sensor:", error);
            alert("No se pudo eliminar el sensor. Verifique si tiene datos históricos asociados (no se puede borrar un sensor con historial).");
            return;
        }
        await loadSensorsForRoom();
        alert("Sensor eliminado exitosamente.");
    } catch(e) {
        console.error("Error catched eliminando sensor:", e);
        alert("Error de red eliminando el sensor.");
    }
}

window.renameSensor = function(id, currentName) {
    const modal = document.getElementById('editSensorModal');
    if (!modal) return;
    document.getElementById('editSensorIdInput').value = id;
    document.getElementById('editSensorNameInput').value = currentName;
    document.getElementById('editSensorFeedback').style.display = 'none';
    modal.style.display = 'block';
    setTimeout(() => document.getElementById('editSensorNameInput').focus(), 100);
}

window.closeEditSensorModal = function() {
    const modal = document.getElementById('editSensorModal');
    if (modal) modal.style.display = 'none';
}

window.confirmRenameSensor = async function() {
    const id = document.getElementById('editSensorIdInput').value;
    const newName = document.getElementById('editSensorNameInput').value.trim();
    if (!newName) return;
    
    const feedback = document.getElementById('editSensorFeedback');
    feedback.style.display = 'block';
    feedback.innerText = 'Guardando...';
    feedback.style.color = 'var(--text-secondary)';

    try {
        const { error } = await window.sbClient.from('core_sensors').update({ name: newName }).eq('id', id);
        if (error) {
            console.error("Supabase Error renombrando sensor:", error);
            feedback.innerText = "Error del servidor al intentar renombrar.";
            feedback.style.color = "var(--color-red)";
            return;
        }
        await loadSensorsForRoom();
        pollLatestTelemetry(currentRoomId);
        window.closeEditSensorModal();
    } catch(e) {
        console.error("Error catched renombrando sensor:", e);
        feedback.innerText = "Error de red renombrando el sensor.";
        feedback.style.color = "var(--color-red)";
    }
}

// Update from Manual Inputs
async function updateManualTelemetry(silentUpdate = false) {
    const tempInput = parseFloat(document.getElementById('manual-temp').value);
    const humInput = parseFloat(document.getElementById('manual-hum').value);
    const sensorSelectVal = document.getElementById('manualSensorSelect').value;

    if (isNaN(tempInput) || isNaN(humInput)) {
        alert("Por favor ingrese valores válidos.");
        return;
    }

    const calculatedVpd = calcVpd(tempInput, humInput);
    const data = getCurrentData();
    let status = 'optimal';
    const phaseLimits = vpdLimits[data.phase] || { min: 0.4, max: 1.6 };

    if (tempInput > 30 || tempInput < 18 || calculatedVpd < phaseLimits.min || calculatedVpd > phaseLimits.max) {
        status = 'critical';
    } else if (tempInput > 28 || humInput > 60 ||
        (calculatedVpd >= (phaseLimits.max - 0.1) && calculatedVpd <= phaseLimits.max) ||
        (calculatedVpd <= (phaseLimits.min + 0.1) && calculatedVpd >= phaseLimits.min)) {
        status = 'warning';
    }

    if (silentUpdate) return;

    // Notar que enviamos directo a BD o al webhook, pero ahora mandando sensor_id. 
    // Como el script pide N8N, usamos el webhook de N8N.
    const payload = {
        batch_id: currentRoomId,
        sensor_id: sensorSelectVal === 'default' ? null : sensorSelectVal,
        phase: data.phase,
        temp: tempInput,
        humidity: humInput,
        vpd: calculatedVpd,
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
            // Forzar actualización visual leyendo base de datos
            setTimeout(() => pollLatestTelemetry(currentRoomId), 1500);
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
    
    const newSensorForm = document.getElementById('newSensorForm');
    if (newSensorForm) {
        newSensorForm.addEventListener('submit', handleNewSensor);
    }

    const sel = document.getElementById('manualSensorSelect');
    if(sel) {
        sel.addEventListener('change', (e) => {
            selectedSensorView = e.target.value;
            pollLatestTelemetry(currentRoomId);
        });
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
            loadSensorsForRoom();
        }
        console.log(`[Rooms] Loaded ${data.length} room(s) from Supabase.`);
    } catch (e) {
        console.error('[Rooms] Error loading rooms:', e);
    }
}

async function pollLatestTelemetry(roomId) {
    try {
        if (!window.sbClient || !roomId) return;

        // Limite superior de 60 puntos para graficar (aprox ultimas 1 o 2 horas dependiendo frecuencia)
        const { data, error } = await window.sbClient
            .from('daily_telemetry')
            .select(`
                temperature_c, humidity_percent, vpd_kpa, created_at, sensor_id,
                core_sensors (name)
            `)
            .eq('batch_id', roomId)
            .order('created_at', { ascending: false })
            .limit(60);

        if (error) {
            console.error('[Polling] Supabase error:', error.message);
            return;
        }

        const rData = roomsData[roomId];
        if (!rData) return;

        if (!data || data.length === 0) {
            rData.sensors = {};
            rData.temp = 0; rData.hum = 0; rData.vpd = 0;
            if (tempChartInstance) tempChartInstance.updateSeries([]);
            if (humChartInstance) humChartInstance.updateSeries([]);
            if (vpdChartInstance) vpdChartInstance.updateSeries([]);
            updateUI();
            return;
        }

        // Procesar datos y agrupar por sensor
        const dataRev = [...data].reverse();
        const telemetryBySensor = {};
        const globalLabelsSet = new Set();
        
        dataRev.forEach(t => {
            const sId = t.sensor_id || 'default';
            const sName = t.core_sensors && t.core_sensors.name ? t.core_sensors.name : (sId === 'default' ? 'Promedio / Sala General' : 'Sensor ' + sId.substring(0,4));
            if(!telemetryBySensor[sId]) telemetryBySensor[sId] = { name: sName, temps: [], hums: [], vpds: [] };
            
            const tsMs = new Date(t.created_at).getTime();
            
            telemetryBySensor[sId].temps.push({ x: tsMs, y: parseFloat(t.temperature_c) || 0 });
            telemetryBySensor[sId].hums.push({ x: tsMs, y: parseFloat(t.humidity_percent) || 0 });
            telemetryBySensor[sId].vpds.push({ x: tsMs, y: parseFloat(t.vpd_kpa) || 0 });
        });

        // Actualizar última lectura general en base al punto más reciente procesado
        // Prioriza un promedio ('default'), o sino toma el último recibido
        if (dataRev.length > 0) {
            const p = dataRev[dataRev.length - 1]; // último cronológico
            rData.temp = parseFloat(p.temperature_c) || 0;
            rData.hum = parseFloat(p.humidity_percent) || 0;
            rData.vpd = parseFloat(p.vpd_kpa) || 0;
        }

        rData.sensors = telemetryBySensor;
        
        let count = 0;
        let sumTemp = 0;
        let sumHum = 0;
        let sumVpd = 0;
        Object.keys(telemetryBySensor).forEach(sId => {
            const s = telemetryBySensor[sId];
            if(s.temps.length > 0) {
                sumTemp += s.temps[s.temps.length - 1].y;
                sumHum += s.hums[s.hums.length - 1].y;
                sumVpd += s.vpds[s.vpds.length - 1].y;
                count++;
            }
        });
        
        if (count > 0) {
            rData.temp = sumTemp / count;
            rData.hum  = sumHum / count;
            rData.vpd  = sumVpd / count;
        }

        // UI de Sincronización
        const latestRow = data[0]; 
        if (latestRow.created_at !== lastTelemetryTime[roomId]) {
            lastTelemetryTime[roomId] = latestRow.created_at;
            const timeStr = new Date(latestRow.created_at).toLocaleTimeString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit' });
            const pollingStatus = document.getElementById('polling-status');
            if (pollingStatus) pollingStatus.innerHTML = `<i class="ph ph-check-circle"></i> Última sync: ${timeStr}`;
        }
        
        // Setup dinámico de gráficos ApexCharts
        if (!tempChartInstance) initCharts();
        
        const tempDatasets = [];
        const humDatasets = [];
        const vpdDatasets = [];

        Object.keys(telemetryBySensor).forEach(sId => {
            const sData = telemetryBySensor[sId];
            
            // Filtrar visualización
            if (selectedSensorView !== 'default' && selectedSensorView !== sId) return;

            tempDatasets.push({
                name: sData.name, 
                data: sData.temps
            });
            humDatasets.push({
                name: sData.name, 
                data: sData.hums
            });
            vpdDatasets.push({
                name: sData.name, 
                data: sData.vpds
            });
        });

        tempChartInstance.updateSeries(tempDatasets);
        humChartInstance.updateSeries(humDatasets);
        vpdChartInstance.updateSeries(vpdDatasets);

        updateUI();

    } catch (error) {
        console.error('[Polling] Error consultando Supabase:', error);
    }
}
