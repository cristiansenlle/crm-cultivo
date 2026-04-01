// CANNABIS-CORE 360 - Dashboard Agronómico (Timeline)

let telemetryData = [];
let eventsData = [];
let agronomyChartInstance = null;
let officialBatches = []; // Agregado para filtros estrictos

const ROOM_MAP = {
    '2de32401-cb5f-4bbd-9b67-464aa703679c': '2de32401-cb5f-4bbd-9b67-464aa703679c',
    '2de32401': '2de32401-cb5f-4bbd-9b67-464aa703679c',
    'carpa 1': '2de32401-cb5f-4bbd-9b67-464aa703679c',
    'Carpa 1': '2de32401-cb5f-4bbd-9b67-464aa703679c',
    'sala-1': '2de32401-cb5f-4bbd-9b67-464aa703679c',
    'sala-2': '2de32401-cb5f-4bbd-9b67-464aa703679c',
    'sala-carpa-1': '2de32401-cb5f-4bbd-9b67-464aa703679c',
    'sala-veg-1': '2de32401-cb5f-4bbd-9b67-464aa703679c', // Si existía, mapear a lo único oficial
    'sala-flo-1': '2de32401-cb5f-4bbd-9b67-464aa703679c',
    'sala-flo-2': '2de32401-cb5f-4bbd-9b67-464aa703679c'
};

const ROOM_LABELS = {
    '2de32401-cb5f-4bbd-9b67-464aa703679c': 'Carpa 1'
};

function normalizeRoomId(id) {
    return ROOM_MAP[id] || id;
}

document.addEventListener('DOMContentLoaded', async () => {
    // Si no hay Supabase, mockear
    if (!window.sbClient) {
        console.warn("Supabase no inicializado en agronomy.js");
        document.getElementById('agronomyChart').parentElement.innerHTML = '<div style="color:var(--color-red); padding:20px;">Error: Cliente de Nube (Supabase) inactivo. No se pueden cargar datos agronómicos históricos.</div>';
        return;
    }

    await loadAgronomyData();
    populateFilters();
    renderAgronomyChart();
    setupRealtimeSubscription();
});

function setupRealtimeSubscription() {
    if (!window.sbClient) return;

    // Suscribirse a inserciones en daily_telemetry
    const channel = window.sbClient
        .channel('schema-db-changes')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'daily_telemetry'
            },
            (payload) => {
                console.log('Nueva telemetría recibida en tiempo real:', payload.new);
                handleNewTelemetry(payload.new);
            }
        )
        .subscribe();
}

function handleNewTelemetry(newEntry) {
    // Evitar duplicados si ya existe por alguna razón
    if (telemetryData.find(t => t.id === newEntry.id)) return;

    telemetryData.push(newEntry);
    populateFilters();
    renderAgronomyChart();
}

async function loadAgronomyData() {
    try {
        // 0. Fetch de Lotes para mapeo de Sala si llega a faltar
        const { data: batches } = await window.sbClient.from('core_batches').select('id, location');
        const batchRoomMap = {};
        if (batches) {
            officialBatches = batches; // Guardar para filtros
            batches.forEach(b => batchRoomMap[b.id] = b.location);
        }

        // 1. Fetch de Telemetría (Clima)
        const { data: telemetry, error: errTel } = await window.sbClient
            .from('daily_telemetry')
            .select('*')
            .order('created_at', { ascending: true });
        if (errTel) throw errTel;
        
        // Auto-asignar room_id si es null pero tenemos batch_id
        telemetryData = (telemetry || []).map(t => {
            if (!t.room_id && t.batch_id && batchRoomMap[t.batch_id]) {
                return { ...t, room_id: batchRoomMap[t.batch_id] };
            }
            // Si el batch_id es una sala (ej: "sala-1"), asignarlo a room_id
            if (!t.room_id && t.batch_id && t.batch_id.startsWith('sala')) {
                return { ...t, room_id: t.batch_id };
            }
            return t;
        });

        // 2. Fetch de Eventos Biológicos/Agronómicos
        const { data: events, error: errEv } = await window.sbClient
            .from('core_agronomic_events')
            .select('*')
            .order('date_occurred', { ascending: true });
        if (errEv) throw errEv;
        eventsData = (events || []).map(e => {
            if (!e.room_id && e.batch_id && batchRoomMap[e.batch_id]) {
                return { ...e, room_id: batchRoomMap[e.batch_id] };
            }
            return e;
        });

    } catch (e) {
        console.error("Error al cargar data agronómica:", e);
    }
}

function populateFilters() {
    const roomSelect = document.getElementById('filterRoom');
    const batchSelect = document.getElementById('filterBatch');
    
    // 1. Población de Salas (estricta desde ROOM_LABELS)
    roomSelect.innerHTML = '<option value="all">Todas las Salas</option>';
    Object.keys(ROOM_LABELS).forEach(room => {
        const opt = document.createElement('option');
        opt.value = room;
        opt.innerText = ROOM_LABELS[room];
        roomSelect.appendChild(opt);
    });

    // 2. Población de Lotes (estricta desde core_batches)
    batchSelect.innerHTML = '<option value="all">Todos los Lotes</option>';
    officialBatches.forEach(batch => {
        const opt = document.createElement('option');
        opt.value = batch.id;
        opt.innerText = "Lote: " + batch.id;
        batchSelect.appendChild(opt);
    });
}

function applyAgronomyFilters() {
    renderAgronomyChart();
}

function renderAgronomyChart() {
    const ctx = document.getElementById('agronomyChart').getContext('2d');
    const roomFilter = document.getElementById('filterRoom').value;
    const batchFilter = document.getElementById('filterBatch').value;
    const startDateVal = document.getElementById('filterStartDate').value;
    const endDateVal = document.getElementById('filterEndDate').value;

    // --- Filtros ---
    let fTelemetry = telemetryData;
    let fEvents = eventsData;
    
    if (startDateVal) {
        const startMs = new Date(startDateVal + "T00:00:00").getTime();
        fTelemetry = fTelemetry.filter(t => new Date(t.created_at).getTime() >= startMs);
        fEvents = fEvents.filter(e => new Date(e.date_occurred).getTime() >= startMs);
    }
    if (endDateVal) {
        const endMs = new Date(endDateVal + "T23:59:59").getTime();
        fTelemetry = fTelemetry.filter(t => new Date(t.created_at).getTime() <= endMs);
        fEvents = fEvents.filter(e => new Date(e.date_occurred).getTime() <= endMs);
    }

    if (roomFilter !== 'all') {
        fTelemetry = fTelemetry.filter(t => normalizeRoomId(t.room_id || t.batch_id) === roomFilter);
        fEvents = fEvents.filter(e => normalizeRoomId(e.room_id || e.batch_id) === roomFilter);
    }
    if (batchFilter !== 'all') {
        fTelemetry = fTelemetry.filter(t => t.batch_id === batchFilter);
        fEvents = fEvents.filter(e => e.batch_id === batchFilter);
    }

    // --- Construcción de Datasets para Line (Telemetría MULTISENSOR) ---
    const sensorDatasets = [];
    const telemetryBySensor = {};
    
    fTelemetry.forEach(t => {
        const sId = t.sensor_id || 'default';
        const sName = t.core_sensors && t.core_sensors.name ? t.core_sensors.name : (sId === 'default' ? 'General / Defecto' : 'Sensor ' + sId.substring(0,4));
        if(!telemetryBySensor[sId]) telemetryBySensor[sId] = { name: sName, temps: [], hums: [], vpds: [] };
        
        const timestamp = new Date(t.created_at).getTime();
        telemetryBySensor[sId].temps.push({ x: timestamp, y: parseFloat(t.temperature_c) || 0 });
        telemetryBySensor[sId].hums.push({ x: timestamp, y: parseFloat(t.humidity_percent) || 0 });
        telemetryBySensor[sId].vpds.push({ x: timestamp, y: parseFloat(t.vpd_kpa) || 0 });
    });

    const colorPalette = ['#3b82f6', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6', '#14b8a6', '#ef4444'];
    let colorIdx = 0;
    
    Object.keys(telemetryBySensor).forEach(sId => {
        const sData = telemetryBySensor[sId];
        const color = colorPalette[colorIdx % colorPalette.length];
        colorIdx++;
        
        sensorDatasets.push({
            label: `Temp (°C) [${sData.name}]`,
            data: sData.temps,
            borderColor: color,
            backgroundColor: color + '1A', // Hex opacity
            borderWidth: 2,
            tension: 0.3,
            yAxisID: 'y'
        });
        sensorDatasets.push({
            label: `Hum (%) [${sData.name}]`,
            data: sData.hums,
            borderColor: color,
            borderWidth: 2,
            borderDash: [2, 2],
            tension: 0.3,
            yAxisID: 'yHum',
            hidden: false
        });
        sensorDatasets.push({
            label: `VPD (kPa) [${sData.name}]`,
            data: sData.vpds,
            borderColor: color,
            borderWidth: 2,
            borderDash: [5, 5],
            tension: 0.3,
            yAxisID: 'yVpd',
            hidden: true 
        });
    });

    // --- Construcción de Datasets para Scatter (Eventos) ---
    const plagasPoints = [];
    const fasesPoints = [];
    const tareasPoints = [];

    fEvents.forEach(ev => {
        const p = {
            x: new Date(ev.date_occurred).getTime(),
            y: 0,
            description: ev.description,
            type: ev.event_type
        };

        if (ev.event_type === 'Plaga') {
            p.y = 10; 
            plagasPoints.push(p);
        } else if (ev.event_type === 'Fase') {
            p.y = 12; 
            fasesPoints.push(p);
        } else {
            p.y = 8;  
            tareasPoints.push(p);
        }
    });

    const scatterDatasets = [
        {
            type: 'scatter',
            label: 'Plagas / Patógenos',
            data: plagasPoints,
            backgroundColor: '#ef4444', // Rojo
            pointStyle: 'triangle',
            pointRadius: 8,
            pointHoverRadius: 10,
            yAxisID: 'yEvents'
        },
        {
            type: 'scatter',
            label: 'Cambios de Fase',
            data: fasesPoints,
            backgroundColor: '#eab308', // Amarillo
            pointStyle: 'rectRot',
            pointRadius: 8,
            pointHoverRadius: 10,
            yAxisID: 'yEvents'
        },
        {
            type: 'scatter',
            label: 'Registro Aplicaciones / Riegos',
            data: tareasPoints,
            backgroundColor: '#22c55e', // Verde
            pointStyle: 'rect',
            pointRadius: 8,
            pointHoverRadius: 10,
            yAxisID: 'yEvents'
        }
    ];

    if (agronomyChartInstance) {
        agronomyChartInstance.destroy();
    }

    agronomyChartInstance = new Chart(ctx, {
        type: 'line', // Tipo global linea
        data: {
            datasets: [...sensorDatasets, ...scatterDatasets]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'nearest',
                intersect: true
            },
            plugins: {
                legend: {
                    labels: { color: '#ccc' }
                },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            if (context[0]) {
                                return new Date(context[0].raw.x).toLocaleString('es-AR', { 
                                    timeZone: 'America/Argentina/Buenos_Aires',
                                    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                                });
                            }
                            return '';
                        },
                        label: function (context) {
                            if (context.dataset.type === 'scatter') {
                                // Es un evento
                                return `${context.dataset.label}: ${context.raw.description}`;
                            } else {
                                // Es telemetria
                                return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}`;
                            }
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day',
                        displayFormats: {
                            day: 'MMM dd'
                        }
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { 
                        color: '#888',
                        callback: function(value, index, values) {
                            // value is the timestamp
                            return new Date(value).toLocaleString('es-AR', { 
                                timeZone: 'America/Argentina/Buenos_Aires',
                                day: '2-digit', month: 'short'
                            });
                        }
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: { display: true, text: 'Temp (°C)', color: '#3b82f6' },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#888' },
                    suggestedMin: 15,
                    suggestedMax: 35
                },
                yHum: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: { display: true, text: 'Humedad (%)', color: '#06b6d4' },
                    grid: { display: false },
                    ticks: { color: '#888' },
                    suggestedMin: 30,
                    suggestedMax: 90
                },
                yVpd: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: { display: true, text: 'VPD (kPa)', color: '#a855f7' },
                    grid: { display: false },
                    ticks: { color: '#888' },
                    min: 0,
                    max: 3
                },
                yEvents: {
                    type: 'linear',
                    display: false, // No mostramos los números de este eje imaginario
                    min: 0,
                    max: 15
                }
            }
        }
    });
}

async function exportTimelinePDF(event) {
    const btn = event.currentTarget || event.target.closest('button');
    const ogHtml = btn.innerHTML;
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Procesando...';
    btn.disabled = true;

    try {
        const element = document.querySelector('.widget');
        const opt = {
            margin:       0.5,
            filename:     'Reporte_Agronomico_' + new Date().toLocaleDateString('es-AR').replace(/\//g, '-') + '.pdf',
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, backgroundColor: '#13181f' },
            jsPDF:        { unit: 'in', format: 'letter', orientation: 'landscape' }
        };
        await html2pdf().set(opt).from(element).save();
    } catch (e) {
        console.error(e);
        alert("Fallo al exportar el gráfico.");
    } finally {
        btn.innerHTML = ogHtml;
        btn.disabled = false;
    }
}
