// CANNABIS-CORE 360 - Dashboard Agronómico (Timeline)

let telemetryData = [];
let eventsData = [];
let agronomyChartInstance = null;
let officialBatches = []; // Agregado para filtros estrictos
let officialSensors = []; // Caché de sensores


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

        // 1.5 Fetch de Sensores
        const { data: sensors } = await window.sbClient.from('core_sensors').select('id, name, room_id');
        officialSensors = sensors || [];

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
    const sensorSelect = document.getElementById('filterSensor');
    
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

    // 3. Población de Sensores
    populateSensorOptions(roomSelect.value);

    // Repoblar sensores si el usuario cambia el filtro de sala y forzar redibujado manual aquí no es necesario si ya se hace en applyAgronomyFilters, 
    // PERO como ambos tienen onchange="applyAgronomyFilters()", el DOM event listeners pisa.
    // Para simplificar, añadimos un evento especifico a la sala.
    roomSelect.removeEventListener('change', handleRoomChange); // avoid duplicates
    roomSelect.addEventListener('change', handleRoomChange);
}

function handleRoomChange() {
    populateSensorOptions(document.getElementById('filterRoom').value);
    applyAgronomyFilters(); // El HTML tiene un onchange="applyAgronomyFilters()" que se gatillará, pero al menos actualizamos las opciones primero.
}

function populateSensorOptions(selectedRoom) {
    const sensorSelect = document.getElementById('filterSensor');
    const container = document.getElementById('sensorFilterContainer');
    if (!sensorSelect || !container) return;
    
    if (selectedRoom === 'all') {
        container.style.display = 'none';
        sensorSelect.innerHTML = '<option value="all">Global</option>';
        return;
    }
    
    // Si hay sala seleccionada, mostramos el filtro y por defecto promedios
    container.style.display = 'flex';
    sensorSelect.innerHTML = '<option value="average_only">Solo Promedio de la Sala</option><option value="all">Todos los Sensores (Incluye Promedio)</option>';
    
    const filtered = officialSensors.filter(s => normalizeRoomId(s.room_id) === selectedRoom);
    
    filtered.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.innerText = s.name;
        sensorSelect.appendChild(opt);
    });
}

function applyAgronomyFilters() {
    renderAgronomyChart();
}

function renderAgronomyChart() {
    const ctx = document.getElementById('agronomyChart').getContext('2d');
    const roomFilter = document.getElementById('filterRoom').value;
    const batchFilter = document.getElementById('filterBatch').value;
    const sensorSelectEl = document.getElementById('filterSensor');
    const sensorFilter = sensorSelectEl ? sensorSelectEl.value : 'all';
    const startDateVal = document.getElementById('filterStartDate').value;
    const endDateVal = document.getElementById('filterEndDate').value;
    
    // Metric Checkboxes
    const showTemp = document.getElementById('showTemp') ? document.getElementById('showTemp').checked : true;
    const showHum = document.getElementById('showHum') ? document.getElementById('showHum').checked : true;
    const showVpd = document.getElementById('showVpd') ? document.getElementById('showVpd').checked : false;

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

    const sensorDatasets = [];

    // -- Calcular Promedio Horario (Independientemente del dataset de cada sensor) --
    // Manejar cuenta independiente para evitar arrastre de Nulos o Ceros absolutos en VPD.
    const hourlyBuckets = {};
    fTelemetry.forEach(t => {
        const d = new Date(t.created_at);
        d.setMinutes(0, 0, 0); // Redondear a la hora
        const hKey = d.getTime();
        
        if (!hourlyBuckets[hKey]) {
            hourlyBuckets[hKey] = { sumTemp: 0, countTemp: 0, sumHum: 0, countHum: 0, sumVpd: 0, countVpd: 0 };
        }
        
        const temp = parseFloat(t.temperature_c);
        if (!isNaN(temp)) { hourlyBuckets[hKey].sumTemp += temp; hourlyBuckets[hKey].countTemp++; }
        
        const hum = parseFloat(t.humidity_percent);
        if (!isNaN(hum)) { hourlyBuckets[hKey].sumHum += hum; hourlyBuckets[hKey].countHum++; }
        
        const vpd = parseFloat(t.vpd_kpa);
        if (!isNaN(vpd)) { hourlyBuckets[hKey].sumVpd += vpd; hourlyBuckets[hKey].countVpd++; }
    });

    const averageTemps = [];
    const averageHums = [];
    const averageVpds = [];

    Object.keys(hourlyBuckets).sort((a,b) => a - b).forEach(k => {
        const b = hourlyBuckets[k];
        const ts = parseInt(k);
        if (b.countTemp > 0) averageTemps.push({ x: ts, y: b.sumTemp / b.countTemp });
        if (b.countHum > 0) averageHums.push({ x: ts, y: b.sumHum / b.countHum });
        if (b.countVpd > 0) averageVpds.push({ x: ts, y: b.sumVpd / b.countVpd });
    });

    // Limitar Telemetría a SOLO el sensor si seleccionaron uno
    if (sensorFilter !== 'all' && sensorFilter !== 'average_only') {
        fTelemetry = fTelemetry.filter(t => t.sensor_id === sensorFilter);
    }

    // --- Persistencia y Generador de Datasets (Override System) ---
    let customChartStyles = JSON.parse(localStorage.getItem('agronomy_styles') || '{}');

    const buildDataset = (label, data, defaultColor, defaultDash, yAxisKey, isAverage = false) => {
        const userStyle = customChartStyles[label] || {};
        const finalColor = userStyle.color || defaultColor;
        
        let dashedArr = defaultDash;
        if (userStyle.dashType === 'solid') dashedArr = [];
        else if (userStyle.dashType === 'dash_fine') dashedArr = [2,2];
        else if (userStyle.dashType === 'dash_thick') dashedArr = [6,4];
        else if (userStyle.dashType === 'dash_room') dashedArr = [15,8];

        return {
            label: label,
            data: data,
            borderColor: finalColor,
            backgroundColor: finalColor + (isAverage ? '00' : '1A'),
            borderWidth: isAverage ? 5 : 2,
            borderDash: dashedArr,
            tension: isAverage ? 0.4 : 0.3,
            yAxisID: yAxisKey,
            hidden: userStyle.hidden || false,
            _rawLabel: label
        };
    };

    // --- Construcción de Datasets para Line (Telemetría MULTISENSOR) ---
    if (sensorFilter !== 'average_only') {
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
            
            if (showTemp) sensorDatasets.push(buildDataset(`Temp (°C) [${sData.name}]`, sData.temps, color, [], 'y', false));
            if (showHum) sensorDatasets.push(buildDataset(`Hum (%) [${sData.name}]`, sData.hums, color, [2, 2], 'yHum', false));
            if (showVpd) sensorDatasets.push(buildDataset(`VPD (kPa) [${sData.name}]`, sData.vpds, color, [5, 5], 'yVpd', false));
        });
    }

    // Dataset para Promedio Horario (negro grueso punteado)
    if (sensorFilter === 'all' || sensorFilter === 'average_only') {
        if (showTemp) sensorDatasets.push(buildDataset(`Temp (°C) [PROMEDIO SALA]`, averageTemps, '#000000', [6, 4], 'y', true));
        if (showHum) sensorDatasets.push(buildDataset(`Hum (%) [PROMEDIO SALA]`, averageHums, '#000000', [10, 6], 'yHum', true));
        if (showVpd) sensorDatasets.push(buildDataset(`VPD (kPa) [PROMEDIO SALA]`, averageVpds, '#000000', [15, 8], 'yVpd', true));
    }

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
                    display: false // Usamos la Custom Legend HTML
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
    
    renderCustomLegend();
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

// --- FUNCIONES LEYENDA CUSTOMIZADA Y MODAL DE ESTILOS ---
function renderCustomLegend() {
    try {
        const container = document.getElementById('customLegendContainer');
        if (!container) return;
        container.innerHTML = '';
        
        if (!agronomyChartInstance) return;
        
        agronomyChartInstance.data.datasets.forEach((dataset, index) => {
            let meta = {};
            try { meta = agronomyChartInstance.getDatasetMeta(index) || {}; } catch(e){}
            
            const isHidden = (meta.hidden === null || meta.hidden === undefined) ? !!dataset.hidden : meta.hidden;
            
            const itemDiv = document.createElement('div');
            itemDiv.style.display = 'flex';
            itemDiv.style.alignItems = 'center';
            itemDiv.style.gap = '8px';
            itemDiv.style.padding = '4px 10px';
            itemDiv.style.borderRadius = '20px';
            itemDiv.style.cursor = 'pointer';
            itemDiv.style.backgroundColor = isHidden ? 'transparent' : (dataset.type === 'scatter' ? 'transparent' : dataset.borderColor + '22');
            itemDiv.style.border = '1px solid ' + (isHidden ? '#333' : (dataset.type === 'scatter' ? dataset.backgroundColor : dataset.borderColor));
            itemDiv.style.transition = '0.2s';
            
            // Indicador de color (Haz click para ocultar/mostrar)
            const dot = document.createElement('div');
            dot.style.width = '12px';
            dot.style.height = '12px';
            dot.style.borderRadius = '50%';
            dot.style.backgroundColor = isHidden ? '#444' : (dataset.type === 'scatter' ? dataset.backgroundColor : dataset.borderColor);
            
            dot.onclick = (e) => {
                e.stopPropagation();
                toggleDatasetVisibility(index);
            };
            
            // Etiqueta de texto (Haz click para editar formato si es línea)
            const label = document.createElement('span');
            label.innerText = dataset.label;
            label.style.fontSize = '0.8rem';
            label.style.fontWeight = '500';
            label.style.color = isHidden ? 'var(--text-muted)' : 'var(--text-primary)';
            label.style.textDecoration = isHidden ? 'line-through' : 'none';
            
            itemDiv.onclick = () => {
                if (dataset.type === 'scatter') {
                    toggleDatasetVisibility(index);
                } else {
                    openStyleEditor(index, dataset);
                }
            };
            
            itemDiv.title = dataset.type === 'scatter' ? 'Clic para ocultar/mostrar' : 'Clic en el círculo para ocultar. Clic aquí para editar estílo.';
            itemDiv.appendChild(dot);
            itemDiv.appendChild(label);
            container.appendChild(itemDiv);
        });
    } catch(err) {
        console.error("Error renderizando leyenda:", err);
    }
}

function toggleDatasetVisibility(index) {
    const meta = agronomyChartInstance.getDatasetMeta(index);
    meta.hidden = meta.hidden === null ? !agronomyChartInstance.data.datasets[index].hidden : !meta.hidden;
    
    // Persistencia del estado oculto
    const dataset = agronomyChartInstance.data.datasets[index];
    const lbl = dataset._rawLabel || dataset.label;
    
    let customChartStyles = JSON.parse(localStorage.getItem('agronomy_styles') || '{}');
    if (!customChartStyles[lbl]) customChartStyles[lbl] = {};
    customChartStyles[lbl].hidden = meta.hidden;
    localStorage.setItem('agronomy_styles', JSON.stringify(customChartStyles));
    
    agronomyChartInstance.update();
    renderCustomLegend();
}

function openStyleEditor(index, dataset) {
    document.getElementById('styleEditorBackdrop').style.display = 'block';
    document.getElementById('styleEditorModal').style.display = 'block';
    
    document.getElementById('styleEditorTitle').innerText = 'Personalizar: ' + dataset.label;
    document.getElementById('styleEditorDatasetIndex').value = index;
    document.getElementById('styleEditorOriginalLabel').value = dataset._rawLabel || dataset.label;
    
    document.getElementById('styleEditorColor').value = dataset.borderColor.length === 7 ? dataset.borderColor : '#ffffff';
    
    let dashType = 'solid';
    const dArray = dataset.borderDash;
    if (dArray && dArray.length > 0) {
        if (dArray[0] === 2) dashType = 'dash_fine';
        else if (dArray[0] === 6) dashType = 'dash_thick';
        else if (dArray[0] === 15) dashType = 'dash_room';
    }
    document.getElementById('styleEditorDash').value = dashType;
}

function closeStyleEditor() {
    document.getElementById('styleEditorBackdrop').style.display = 'none';
    document.getElementById('styleEditorModal').style.display = 'none';
}

function saveDatasetStyle() {
    const color = document.getElementById('styleEditorColor').value;
    const dashType = document.getElementById('styleEditorDash').value;
    const labelKey = document.getElementById('styleEditorOriginalLabel').value;
    
    let customChartStyles = JSON.parse(localStorage.getItem('agronomy_styles') || '{}');
    if (!customChartStyles[labelKey]) customChartStyles[labelKey] = {};
    
    customChartStyles[labelKey].color = color;
    customChartStyles[labelKey].dashType = dashType;
    
    localStorage.setItem('agronomy_styles', JSON.stringify(customChartStyles));
    
    closeStyleEditor();
    renderAgronomyChart();
}

function resetDatasetStyle() {
    const labelKey = document.getElementById('styleEditorOriginalLabel').value;
    let customChartStyles = JSON.parse(localStorage.getItem('agronomy_styles') || '{}');
    if (customChartStyles[labelKey]) {
        delete customChartStyles[labelKey].color;
        delete customChartStyles[labelKey].dashType;
        localStorage.setItem('agronomy_styles', JSON.stringify(customChartStyles));
    }
    closeStyleEditor();
    renderAgronomyChart();
}
