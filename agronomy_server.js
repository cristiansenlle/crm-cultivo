// CANNABIS-CORE 360 - Dashboard Agronómico (Timeline)

let telemetryData = [];
let eventsData = [];
let agronomyChartInstance = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Si no hay Supabase, mockear
    if (!window.sbClient) {
        console.warn("Supabase no inicializado en agronomy.js");
        document.getElementById('agronomyChart').parentElement.innerHTML = '<div style="color:var(--color-red); padding:20px;">Error: Cliente de Nube (Supabase) inactivo. No se pueden cargar datos agronómicos históricos.</div>';
        return;
    }

    await loadAgronomyData();
    populateBatchFilter();
    renderAgronomyChart();
});

async function loadAgronomyData() {
    try {
        // 1. Fetch de Telemetría (Clima)
        const { data: telemetry, error: errTel } = await window.sbClient
            .from('daily_telemetry')
            .select('*')
            .order('created_at', { ascending: true });
        if (errTel) throw errTel;
        telemetryData = telemetry || [];

        // 2. Fetch de Eventos Biológicos/Agronómicos
        const { data: events, error: errEv } = await window.sbClient
            .from('core_agronomic_events')
            .select('*')
            .order('date_occurred', { ascending: true });
        if (errEv) throw errEv;
        eventsData = events || [];

    } catch (e) {
        console.error("Error al cargar data agronómica:", e);
    }
}

function populateBatchFilter() {
    const select = document.getElementById('filterBatch');
    const uniqueBatches = new Set();

    telemetryData.forEach(tel => uniqueBatches.add(tel.batch_id));
    eventsData.forEach(ev => uniqueBatches.add(ev.batch_id));

    uniqueBatches.forEach(batch => {
        if (!batch) return;
        const opt = document.createElement('option');
        opt.value = batch;
        opt.innerText = "Lote: " + batch;
        select.appendChild(opt);
    });
}

function applyAgronomyFilters() {
    renderAgronomyChart();
}

function renderAgronomyChart() {
    const ctx = document.getElementById('agronomyChart').getContext('2d');
    const roomFilter = document.getElementById('filterRoom').value;
    const batchFilter = document.getElementById('filterBatch').value;

    // --- Filtros ---
    let fTelemetry = telemetryData;
    let fEvents = eventsData;

    if (roomFilter !== 'all') {
        fTelemetry = fTelemetry.filter(t => t.room_id === roomFilter);
        fEvents = fEvents.filter(e => e.room_id === roomFilter);
    }
    if (batchFilter !== 'all') {
        fTelemetry = fTelemetry.filter(t => t.batch_id === batchFilter);
        fEvents = fEvents.filter(e => e.batch_id === batchFilter);
    }

    // --- Construcción de Datasets para Line (Telemetría) ---
    // Agruparemos por día para simplificar la línea
    const tempPoints = fTelemetry.map(t => ({ x: new Date(t.created_at).getTime(), y: parseFloat(t.temperature_c) || 0 }));
    const vpdPoints = fTelemetry.map(t => ({ x: new Date(t.created_at).getTime(), y: parseFloat(t.vpd_kpa) || 0 }));
    const humPoints = fTelemetry.map(t => ({ x: new Date(t.created_at).getTime(), y: parseFloat(t.humidity_percent) || 0 }));

    // --- Construcción de Datasets para Scatter (Eventos) ---
    const plagasPoints = [];
    const fasesPoints = [];
    const tareasPoints = [];

    fEvents.forEach(ev => {
        const p = {
            x: new Date(ev.date_occurred).getTime(),
            // Ubicamos los eventos en Y ligeramente fijados o dependientes de la escala principal para evitar que rompan el eje
            // Lo pondremos fijo en el "piso" del gráfico (ej. Y = 10, o le daremos una escala propia)
            y: 0,
            description: ev.description,
            type: ev.event_type
        };

        if (ev.event_type === 'Plaga') {
            p.y = 10; // Fila visual 1
            plagasPoints.push(p);
        } else if (ev.event_type === 'Fase') {
            p.y = 12; // Fila visual 2
            fasesPoints.push(p);
        } else {
            p.y = 8;  // Fila visual 3 (Aplicación, Riego, Info)
            tareasPoints.push(p);
        }
    });

    if (agronomyChartInstance) {
        agronomyChartInstance.destroy();
    }

    agronomyChartInstance = new Chart(ctx, {
        type: 'line', // Tipo global linea
        data: {
            datasets: [
                {
                    label: 'Temperatura (°C)',
                    data: tempPoints,
                    borderColor: '#3b82f6', // Azul
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    tension: 0.3,
                    yAxisID: 'y'
                },
                {
                    label: 'Humedad Relativa (%)',
                    data: humPoints,
                    borderColor: '#06b6d4', // Cyan
                    borderWidth: 2,
                    borderDash: [2, 2],
                    tension: 0.3,
                    yAxisID: 'yHum'
                },
                {
                    label: 'VPD (kPa)',
                    data: vpdPoints,
                    borderColor: '#a855f7', // Violeta
                    borderWidth: 2,
                    borderDash: [5, 5],
                    tension: 0.3,
                    yAxisID: 'yVpd'
                },
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
            ]
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
                    ticks: { color: '#888' }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: { display: true, text: 'Temp (°C)', color: '#3b82f6' },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#888' },
                    min: 15,
                    max: 35
                },
                yHum: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: { display: true, text: 'Humedad (%)', color: '#06b6d4' },
                    grid: { display: false },
                    ticks: { color: '#888' },
                    min: 30,
                    max: 90
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