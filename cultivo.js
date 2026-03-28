// CANNABIS-CORE 360 - Lógica de Cultivos
let batches = [];
let coreRoomsMap = {};
let nutritionProducts = [];
let ipmProducts = [];

document.addEventListener('DOMContentLoaded', async () => {
    // Configurar fecha de hoy en el input de fecha
    try {
        document.getElementById('cropDate').valueAsDate = new Date();
    } catch (e) { }

    const form = document.getElementById('newCropForm');
    form.addEventListener('submit', handleNewCrop);

    // Cargar Stock de Bodega al Selector de Riego
    await cargarSelectInsumos();
    await fetchInventoryForAgronomy();

    // Cargar Lotes Activos desde la Nube
    await loadBatches();
});

async function fetchInventoryForAgronomy() {
    if (!window.sbClient) return;
    try {
        const { data, error } = await window.sbClient.from('core_inventory_quimicos').select('*').gt('qty', 0);
        if (error) throw error;
        const quimicos = data || [];
        nutritionProducts = quimicos.filter(q => ['fertilizante', 'estimulador', 'correctivo_ph'].includes(q.type));
        ipmProducts = quimicos.filter(q => ['pesticida_biologico', 'fungicida', 'acaricida'].includes(q.type));
    } catch (e) {
        console.error("Error fetching inventory for agronomy:", e);
    }
}

async function loadBatches() {
    if (!window.sbClient) {
        renderBatches(); // Render demo
        return;
    }
    try {
        const { data, error } = await window.sbClient.from('core_batches').select('*').order('timestamp', { ascending: false });
        if (error) throw error;

        batches = (data || []).map(b => ({
            id: b.id,
            strain: b.strain,
            startDate: b.start_date,
            stage: b.stage,
            origen: b.origen,
            madre: b.madre,
            location: b.location,
            flowerDays: b.flower_days,
            syncGCal: b.sync_gcal,
            timestamp: b.timestamp,
            weightWet: b.weight_wet,
            weightDry: b.weight_dry,
            lightHours: b.light_hours,
                        weightDry: b.weight_dry,
            lightHours: b.light_hours,
            darkHours: b.dark_hours,
            numPlants: b.num_plants || 0
        }));

        for (let bat of batches) {
            try {
                const { data: evs } = await window.sbClient.from('core_agronomic_events').select('total_cost').eq('batch_id', bat.id);
                bat.accumulatedCost = (evs || []).reduce((sum, ev) => sum + (parseFloat(ev.total_cost) || 0), 0);
            } catch (e) {
                bat.accumulatedCost = 0;
            }
        }

        // Load custom room names from core_rooms
        const roomsRes = await window.sbClient.from('core_rooms').select('id, name');
        if (roomsRes && roomsRes.data) {
            roomsRes.data.forEach(room => {
                coreRoomsMap[room.id] = room.name;
            });
            if (typeof populateLocationSelects === 'function') { populateLocationSelects(); }
            if (typeof populateLocationSelects === 'function') { populateLocationSelects(); }
        }

        renderBatches();
    } catch (e) {
        console.error("Error cargando lotes activos:", e);
    }
}

async function cargarSelectInsumos() {
    const sel = document.getElementById('fertirriegoInsumo');
    if (!sel) return;
    sel.innerHTML = '<option value="">Sólo Agua</option>'; // Limpiar

    if (!window.sbClient) return;

    try {
        const { data, error } = await window.sbClient.from('core_inventory_quimicos').select('*').gt('qty', 0);
        if (error) throw error;

        const quimicos = data || [];
        quimicos.forEach(q => {
            const opt = document.createElement('option');
            opt.value = q.id;
            const unit = q.type === 'sustrato' ? 'Lts' : 'mL';
            opt.innerText = `${q.name} (${q.qty} ${unit} disp.)`;
            sel.appendChild(opt);
        });
    } catch (e) {
        console.error("Error cargando insumos de Supabase:", e);
    }
}

async function handleNewCrop(e) {
    e.preventDefault();

    const id = document.getElementById('cropId').value;
    const strain = document.getElementById('cropStrain').value;
    const startDate = document.getElementById('cropDate').value;
    const stage = document.getElementById('cropStage').value;
    const origen = document.getElementById('cropOrigen').value;
    const madre = document.getElementById('cropMadre').value;
    const location = document.getElementById('cropLocation').value;
    const flowerDays = document.getElementById('cropFlowerDays').value;
    const syncGCal = document.getElementById('syncGCal').checked;

    const newBatch = {
        action: 'CREATE_CROP_BATCH',
        id: id,
        strain: strain,
        startDate: startDate,
        stage: stage,
        origen: origen,
        madre: madre,
        location: location,
        flowerDays: flowerDays,
        syncGCal: syncGCal,
        timestamp: new Date().toISOString()
    };

    if (window.sbClient) {
        try {
            await window.sbClient.from('core_batches').insert([{
                id: id,
                strain: strain,
                start_date: startDate,
                stage: stage,
                origen: origen,
                madre: madre,
                location: location,
                flower_days: flowerDays ? parseInt(flowerDays) : null,
                sync_gcal: syncGCal,
                timestamp: new Date().toISOString()
            }]);
        } catch (e) {
            console.error("Error guardando nuevo lote en Nube:", e);
        }
    } else {
        batches.push(newBatch); // Modo local
    }

    // Actualizamos UI desde DB
    await loadBatches();

    // Resetear form
    e.target.reset();
    document.getElementById('cropDate').valueAsDate = new Date();

    // Sincronizar hacia n8n webhook para Google Calendar si el check está marcado
    if (syncGCal) {
        try {
            const webhookCalendarUrl = "http://109.199.99.126.sslip.io:5678/webhook/cultivo-calendar";
            const response = await fetch(webhookCalendarUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newBatch)
            });

            if (response.ok) {
                console.log("Fechas clave agendadas en Google Calendar vía n8n");
            } else {
                console.warn("Error en el webhook. No hay conexión con n8n, guardado local exitoso.");
            }
        } catch (err) {
            console.error("No se pudo contactar n8n. Webhook inválido o n8n apagado.", err);
        }
    }

    // Mostrar Pop-up de Éxito Front-end
    document.getElementById('successOverlayCrop').style.display = 'flex';
}

function closeSuccessCrop() {
    document.getElementById('successOverlayCrop').style.display = 'none';
}

function renderBatches() {
    const list = document.getElementById('activeCropsList');

    let html = '';

    if (batches.length === 0) {
        html = `<li style="padding: 30px; text-align: center; color: var(--text-secondary); list-style: none;">
            <i class="ph ph-plant" style="font-size: 2rem; display: block; margin-bottom: 10px;"></i>
            No hay lotes activos. Registrá tu primer cultivo usando el formulario.
        </li>`;
        list.innerHTML = html;
        return;
    }

    batches.forEach((b, index) => {
        let color = 'var(--color-blue)'; // Germinacion
        let label = 'Propagación';

        if (b.stage === 'vegetativo') { color = 'var(--color-green)'; label = 'Fase Vegetativa'; }
        if (b.stage === 'floracion') { color = 'var(--color-yellow)'; label = 'Fase de Floración'; }
        if (b.stage === 'cosecha') { color = 'var(--color-red)'; label = 'Cosecha'; }

        // Priorities: 1. DB Custom Room Name, 2. Default hardcoded mapping, 3. Raw Location String (UUID)
        const defaultRoomNameMap = {
            'sala-veg-1': "Sala Veg 1",
            'sala-flo-1': "Sala Floración 1",
            'sala-flo-2': "Sala Floración 2"
        };
        let roomName = coreRoomsMap[b.location] || defaultRoomNameMap[b.location] || b.location;
        let originText = b.origen === 'clon' ? 'Clon' : 'Semilla';
        let madreText = b.madre ? `(Madre: ${b.madre})` : '';
        let fotoText = (b.lightHours && b.darkHours) ? ` | Foto: ${b.lightHours}/${b.darkHours}` : '';

        let actionHtml = '';
        if (b.stage === 'cosecha') {
            if (b.weightDry) {
                actionHtml = `<span style="font-size:0.85rem; color:var(--color-yellow); font-weight:bold;"><i class="ph ph-check"></i> En Stock (${b.weightDry}g)</span>`;
            } else {
                actionHtml = `<button class="btn-primary" style="padding:8px 15px; border-color:var(--color-yellow); color:var(--color-yellow); background:transparent;" onclick="openDryWeightModal('${b.id}')">Cargar Seco</button>`;
            }
        } else {
            actionHtml = `
                <div style="display:flex; gap:10px;">
                    <button class="btn-primary" style="padding:8px 15px; border-color:var(--text-secondary); color:var(--text-secondary); background:transparent;" onclick="openEditBatchModal('${b.id}')" title="Editar Lote"><i class="ph ph-pencil-simple"></i> Editar</button>
                    <button class="btn-primary" style="padding:8px 15px; border-color:var(--text-secondary); color:var(--text-secondary); background:transparent;" onclick="viewAgronomicHistory('${b.id}')" title="Ver Historial Agronómico"><i class="ph ph-clock-counter-clockwise"></i> Historial</button>
                    <button class="btn-primary" style="padding:8px 15px; border-color:var(--color-blue); color:var(--color-blue); background:transparent;" onclick="openAgronomicEventModal('${b.id}', '${b.location}')" title="Reportar Plaga o Tarea Generica"><i class="ph ph-bug"></i> Evento</button>
                    <button class="btn-icon" onclick="advanceStage('${b.id}')" title="Avanzar Fase / Cosechar"><i class="ph ph-flag-checkered"></i></button>
                </div>
            `;
        }

        html += `
        <li class="task-item" style="border-left: 3px solid ${color}; flex-direction: column; align-items: stretch; padding: 15px; background: var(--bg-panel);">
            <div style="display:flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <div style="display:flex; flex-direction:column; flex:1;">
                    <div style="display:flex; justify-content: space-between; align-items: center; padding-right:15px;">
                        <strong style="font-size: 1.2rem; color: var(--text-primary);">${b.id} - ${b.strain}</strong>
                        <div style="text-align:right; display:flex; flex-direction:column;">
                            <span style="font-size: 1.2rem; font-weight: 800; color: #ffb74d;">$${parseFloat(b.accumulatedCost || 0).toFixed(2)}</span>
                            <span style="font-size: 0.65rem; color: var(--text-secondary); text-transform:uppercase;">Costo Acumulado</span>
                        </div>
                    </div>
                    <span class="task-time" style="color:${color}; margin-top:4px;">${label} - Inicial</span>
                    <span style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 5px;">
                        <i class="ph-fill ph-plant" style="color:var(--color-green);"></i> ${b.numPlants || 0} Plantas | <i class="ph ph-map-pin"></i> ${roomName} | Origen: ${originText} ${madreText}${fotoText}
                    </span>
                </div>
                ${actionHtml}
            </div>
            
            <!-- Modulos Expandibles Dinámicos -->
            <details style="background: var(--bg-dark); padding: 10px; border-radius: 6px; margin-bottom: 8px; border: 1px solid #333;">
                <summary style="cursor: pointer; font-weight: 600; color: var(--color-blue);"><i class="ph ph-drop"></i> Registro de Fertirriego Diario</summary>
                <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #444; display: flex; gap: 10px; align-items: flex-end; flex-wrap: wrap;">
                    <div style="flex: 2 1 150px;">
                        <label style="font-size:0.75rem;">Producto (Bodega)</label>
                        <select id="nutri-prod-${index}" style="width:100%; padding:5px; border-radius:4px; background:#111; color:#fff; border:1px solid #444;">
                            <option value="">Solo Agua</option>
                            ${nutritionProducts.map(p => `<option value="${p.id}">${p.name} (Disp: ${p.qty}mL)</option>`).join('')}
                        </select>
                    </div>
                    <div style="flex: 1 1 80px;"><label style="font-size:0.75rem;">Cant.(mL)</label><input type="number" id="nutri-qty-${index}" placeholder="0" style="width:100%; padding:5px; border-radius:4px; background:#111; color:#fff; border:1px solid #444;"></div>
                    <div style="flex: 1 1 80px;"><label style="font-size:0.75rem;">EC/pH</label><input type="text" id="nutri-ph-${index}" placeholder="Ej: 2.0/6.0" style="width:100%; padding:5px; border-radius:4px; background:#111; color:#fff; border:1px solid #444;"></div>
                    <div style="flex: 1 1 80px;"><label style="font-size:0.75rem;">Agua(L)</label><input type="number" step="0.1" id="nutri-water-${index}" placeholder="Ej: 5" style="width:100%; padding:5px; border-radius:4px; background:#111; color:#fff; border:1px solid #444;"></div>
                    <button class="btn-primary" onclick="logNutrition('${b.id}', ${index})" style="padding: 5px 10px; height: 32px; flex: 0 0 auto;" title="Guardar"><i class="ph ph-check"></i></button>
                </div>
            </details>

            <details style="background: var(--bg-dark); padding: 10px; border-radius: 6px; margin-bottom: 8px; border: 1px solid #333;">
                <summary style="cursor: pointer; font-weight: 600; color: var(--color-red);"><i class="ph ph-bug"></i> Prevención Plagas (IPM)</summary>
                <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #444; display: flex; gap: 10px; align-items: flex-end; flex-wrap: wrap;">
                    <div style="flex: 2 1 150px;">
                        <label style="font-size:0.75rem;">Producto / Acción</label>
                        <select id="ipm-prod-${index}" style="width:100%; padding:5px; border-radius:4px; background:#111; color:#fff; border:1px solid #444;">
                            <option value="">Acción Manual (ej: Limpieza)</option>
                            ${ipmProducts.map(p => `<option value="${p.id}">${p.name} (Disp: ${p.qty}mL/g)</option>`).join('')}
                        </select>
                    </div>
                    <div style="flex: 1 1 80px;"><label style="font-size:0.75rem;">Cant.(mL/g)</label><input type="number" id="ipm-qty-${index}" placeholder="0" style="width:100%; padding:5px; border-radius:4px; background:#111; color:#fff; border:1px solid #444;"></div>
                    <div style="flex: 1 1 120px; display:flex; align-items:center; gap:5px; height:32px;">
                        <input type="checkbox" id="ipm-cal-${index}" checked>
                        <label for="ipm-cal-${index}" style="font-size:0.75rem; color:var(--text-secondary);">G.Calendar (15d)</label>
                    </div>
                    <button class="btn-primary" onclick="logIPM('${b.id}', ${index})" style="padding: 5px 10px; height: 32px; background: var(--color-red); border-color: var(--color-red); flex: 0 0 auto;" title="Registrar y Agendar autom."><i class="ph ph-check"></i></button>
                </div>
            </details>

            <details style="background: var(--bg-dark); padding: 10px; border-radius: 6px; border: 1px solid #333;">
                <summary style="cursor: pointer; font-weight: 600; color: var(--color-green);"><i class="ph ph-scissors"></i> Bitácora Físico/Poda</summary>
                <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #444; display: flex; gap: 10px; align-items: flex-end; flex-wrap: wrap;">
                    <div style="flex: 2 1 150px;"><label style="font-size:0.75rem;">Intervención</label>
                        <select id="prune-type-${index}" style="width:100%; padding:5px; border-radius:4px; background:#111; color:#fff; border:1px solid #444;">
                            <option>Poda Apical (Topping)</option>
                            <option>Defoliación Bajos</option>
                            <option>Trellising (Red)</option>
                        </select>
                    </div>
                    <div style="flex: 1 1 150px; display:flex; align-items:center; gap:5px; height:32px;">
                        <input type="checkbox" id="prune-cal-${index}" checked>
                        <label for="prune-cal-${index}" style="font-size:0.75rem; color:var(--text-secondary);">G.Calendar: Revisión (48hs)</label>
                    </div>
                    <button class="btn-primary" onclick="logPruning('${b.id}', ${index})" style="padding: 5px 10px; height: 32px; flex: 0 0 auto;" title="Registrar y Agendar autom."><i class="ph ph-calendar-plus"></i></button>
                </div>
            </details>
        </li>
        `;
    });

    list.innerHTML = html;
}

// Funciones para submódulos de lote
async function logNutrition(batchId, index) {
    if (!window.sbClient) return alert("Conexión a BD requerida para guardar eventos.");

    const prodId = document.getElementById(`nutri-prod-${index}`).value;
    const qty = parseFloat(document.getElementById(`nutri-qty-${index}`).value) || 0;
    const ec_ph = document.getElementById(`nutri-ph-${index}`).value;
    const waterLiters = parseFloat(document.getElementById(`nutri-water-${index}`).value) || 0;

    if (prodId && qty <= 0) return alert("Debe ingresar una cantidad a descontar mayor a 0.");

    try {
        // 1. Guardar Evento
        let exactCost = 0;
        let pName = 'Sólo Agua';
        if(prodId) {
            const pObj = nutritionProducts.find(p => p.id === prodId);
            if(pObj) {
                pName = pObj.name;
                exactCost = parseFloat(pObj.unit_cost || 0) * qty;
            }
        }
        await window.sbClient.from('core_agronomic_events').insert([{
            batch_id: batchId,
            event_type: 'nutricion',
            product_id: prodId || null,
            amount_applied: prodId ? qty : null,
            water_liters: waterLiters,
            total_cost: exactCost,
            details: { ec_ph, product_name: pName }
        }]);
        // 2. Descontar Inventario
        if (prodId && qty > 0) {
            const prod = nutritionProducts.find(p => p.id === prodId);
            if (prod) {
                const newQty = Math.max(0, prod.qty - qty);
                await window.sbClient.from('core_inventory_quimicos').update({ qty: newQty }).eq('id', prodId);
            }
        }

        alert(`Riego registrado en ${batchId}.` + (prodId ? `\nSe han descontado ${qty} del inventario.` : ''));

        // Limpiar
        document.getElementById(`nutri-prod-${index}`).value = '';
        document.getElementById(`nutri-qty-${index}`).value = '';
        document.getElementById(`nutri-ph-${index}`).value = '';
        document.getElementById(`nutri-water-${index}`).value = '';

        // Recargar inventario en memoria
        await fetchInventoryForAgronomy();
        loadBatches(); // Refrescar UI
    } catch (e) {
        console.error("Error logging nutrition:", e);
        alert("Error al guardar evento agronómico.");
    }
}

async function logIPM(batchId, index) {
    if (!window.sbClient) return alert("Conexión a BD requerida para guardar eventos.");

    const prodId = document.getElementById(`ipm-prod-${index}`).value;
    const qty = parseFloat(document.getElementById(`ipm-qty-${index}`).value) || 0;
    const sync = document.getElementById(`ipm-cal-${index}`).checked;

    if (prodId && qty <= 0) return alert("Debe ingresar una cantidad a descontar mayor a 0.");

    const prodName = prodId ? ipmProducts.find(p => p.id === prodId)?.name : 'Acción Manual (Limpieza)';

    try {
        // 1. Guardar Evento
        await window.sbClient.from('core_agronomic_events').insert([{
            batch_id: batchId,
            event_type: 'ipm',
            product_id: prodId || null,
            amount_applied: prodId ? qty : null,
            details: { product_name: prodName }
        }]);

        // 2. Descontar Inventario
        if (prodId && qty > 0) {
            const prod = ipmProducts.find(p => p.id === prodId);
            if (prod) {
                const newQty = Math.max(0, prod.qty - qty);
                await window.sbClient.from('core_inventory_quimicos').update({ qty: newQty }).eq('id', prodId);
            }
        }

        let alertMsg = `IPM (${prodName}) registrado en ${batchId}.` + (prodId ? `\nSe han descontado ${qty} del inventario.` : '');

        if (sync) {
            // Enviar a N8N
            const payload = { action: 'SCHEDULE_IPM', batchId: batchId, product: prodName, scheduleDays: 15 };
            fetch("http://109.199.99.126:5678/webhook/cultivo-calendar", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).catch(e => console.error(e));
            alertMsg += `\n¡Recordatorio IPM agendado en Google Calendar a 15 días!`;
        }

        alert(alertMsg);

        document.getElementById(`ipm-prod-${index}`).value = '';
        document.getElementById(`ipm-qty-${index}`).value = '';

        await fetchInventoryForAgronomy();
        loadBatches();
    } catch (e) {
        console.error("Error logging IPM:", e);
        alert("Error al guardar evento agronómico.");
    }
}

async function logPruning(batchId, index) {
    if (!window.sbClient) return alert("Conexión a BD requerida para guardar eventos.");

    const type = document.getElementById(`prune-type-${index}`).value;
    const sync = document.getElementById(`prune-cal-${index}`).checked;

    try {
        await window.sbClient.from('core_agronomic_events').insert([{
            batch_id: batchId,
            event_type: 'poda',
            details: { prune_type: type }
        }]);

        let alertMsg = `${type} registrado en ${batchId}.`;

        if (sync) {
            const payload = { action: 'SCHEDULE_PRUNING', batchId: batchId, pruneType: type, scheduleHours: 48 };
            fetch("http://109.199.99.126:5678/webhook/cultivo-calendar", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).catch(e => console.error(e));
            alertMsg += `\n¡Revisión en 48hs enviada a Google Calendar!`;
        }

        alert(alertMsg);
    } catch (e) {
        console.error("Error logging Pruning:", e);
        alert("Error al guardar evento agronómico.");
    }
}

async function viewAgronomicHistory(batchId) {
    if (!window.sbClient) return alert("Se requiere conexión para ver el historial.");

    try {
        const { data, error } = await window.sbClient.from('core_agronomic_events')
            .select('*')
            .eq('batch_id', batchId);

        if (error) throw error;

        const tbody = document.getElementById('historyTableBody');
        if (!tbody) {
            console.warn("Element 'historyTableBody' not found in DOM.");
            return;
        }
        tbody.innerHTML = '';

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 2rem;">No hay eventos registrados para este lote.</td></tr>';
        } else {
            // Ordenar localmente para evitar error si la columna es created_at o timestamp
            const sortedData = data.sort((a, b) => {
                const dateA = new Date(a.date_occurred || a.timestamp || a.created_at || 0);
                const dateB = new Date(b.date_occurred || b.timestamp || b.created_at || 0);
                return dateB - dateA;
            });

            sortedData.forEach(ev => {
                let detailStr = '';
                try {
                    if (ev.event_type === 'nutricion' && ev.details) {
                        detailStr = `Prod: ${ev.details.product_name || 'N/A'} | Cant: ${ev.amount_applied || 0} | EC/pH: ${ev.details.ec_ph || 'N/A'} | Vol: ${ev.details.vol || 'N/A'}`;
                    } else if (ev.event_type === 'ipm' && ev.details) {
                        detailStr = `Acción: ${ev.details.product_name || 'N/A'} | Cant: ${ev.amount_applied || 0}`;
                    } else if (ev.event_type === 'poda' && ev.details) {
                        detailStr = `Tipo: ${ev.details.prune_type || 'N/A'}`;
                    } else if (ev.description) {
                        detailStr = ev.description;
                    } else {
                        detailStr = ev.details ? (typeof ev.details === 'string' ? ev.details : JSON.stringify(ev.details)) : 'Sin detalles';
                    }
                } catch (errDet) {
                    detailStr = 'Error al parsear detalles';
                    console.warn("Detail parse error:", errDet, ev);
                }

                const eventDate = ev.date_occurred || ev.timestamp || ev.created_at;
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="padding:8px; border-bottom:1px solid #444;">${eventDate ? new Date(eventDate).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }) : 'N/A'} ${eventDate ? new Date(eventDate).toLocaleTimeString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit' }) : ''}</td>
                    <td style="padding:8px; border-bottom:1px solid #444; text-transform: capitalize; color: var(--color-blue); font-weight: 600;">${ev.event_type}</td>
                    <td style="padding:8px; border-bottom:1px solid #444; color: var(--color-green); font-weight: bold; font-size:0.8rem;">
                        <span style="color: #ffb74d;">${(ev.total_cost || 0).toFixed(2)}</span><br>
                        <span style="color: #64b5f6;">${(ev.water_liters || 0).toFixed(2)} L</span>
                    </td>
                    <td style="padding:8px; border-bottom:1px solid #444; color: var(--text-secondary);">${detailStr}</td>
                `;
                tbody.appendChild(tr);
            });
        }

        document.getElementById('modalHistoryTitle').innerText = 'Historial Agronómico: ' + batchId;
        document.getElementById('modalAgronomicHistory').style.display = 'flex';
    } catch (e) {
        console.error(e);
        alert("Error cargando historial");
    }
}

function closeHistoryModal() {
    document.getElementById('modalAgronomicHistory').style.display = 'none';
}

// Avanzar etapa manualmente
let currentAdvancingBatchId = null;
let currentAdvancingNewStage = null;

function advanceStage(batchId) {
    if (batchId === 'LOTE-A01') {
        alert("Este es un lote de demostración. Los lotes reales notificarán a n8n su avance.");
    }

    const batch = batches.find(b => b.id === batchId);
    if (!batch) return;

    let newStage = '';
    if (batch.stage === 'germinacion') newStage = 'vegetativo';
    else if (batch.stage === 'vegetativo') newStage = 'floracion';
    else if (batch.stage === 'floracion') newStage = 'cosecha';
    else {
        alert("El lote ya se encuentra en estado de Cosecha.");
        return;
    }

    currentAdvancingBatchId = batchId;
    currentAdvancingNewStage = newStage;

    if (newStage === 'vegetativo' || newStage === 'floracion') {
        document.getElementById('modal-stage-transition').style.display = 'flex';
        document.getElementById('stage-modal-title').innerHTML = `<i class="ph ph-sliders"></i> Configurar: ${newStage.toUpperCase()}`;

        if (newStage === 'floracion') {
            document.getElementById('flora-days-container').style.display = 'block';
            document.getElementById('stage-light-hours').value = 12;
            document.getElementById('stage-dark-hours').value = 12;
        } else {
            document.getElementById('flora-days-container').style.display = 'none';
            document.getElementById('stage-light-hours').value = 18;
            document.getElementById('stage-dark-hours').value = 6;
        }
    } else if (newStage === 'cosecha') {
        document.getElementById('modal-stage-harvest-wet').style.display = 'flex';
    }
}

async function confirmStageTransition() {
    const light = document.getElementById('stage-light-hours').value;
    const dark = document.getElementById('stage-dark-hours').value;
    const floraDays = document.getElementById('stage-flora-days').value;

    if (!light || !dark) return alert("Ingrese un fotoperiodo válido.");

    const batch = batches.find(b => b.id === currentAdvancingBatchId);
    if (batch) {
        const payload = {
            action: 'ADVANCE_STAGE',
            batchId: currentAdvancingBatchId,
            newStage: currentAdvancingNewStage,
            lightHours: light,
            darkHours: dark,
            floraDays: currentAdvancingNewStage === 'floracion' ? floraDays : null
        };

        try {
            fetch("http://109.199.99.126:5678/webhook/cultivo-calendar", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (window.sbClient) {
                // Actualizar lote en Nube
                await window.sbClient.from('core_batches').update({
                    stage: currentAdvancingNewStage,
                    light_hours: light,
                    dark_hours: dark,
                    flower_days: currentAdvancingNewStage === 'floracion' ? parseInt(floraDays) : null
                }).eq('id', currentAdvancingBatchId);

                // Registrar Evento Biológico silencioso
                await window.sbClient.from('core_agronomic_events').insert([{
                    batch_id: currentAdvancingBatchId,
                    room_id: batch.location,
                    event_type: 'Fase',
                    description: `Pase a fase: ${currentAdvancingNewStage}`
                }]);
            } else {
                batch.stage = currentAdvancingNewStage;
                batch.lightHours = light;
                batch.darkHours = dark;
            }

            alert(`Lote actualizado a ${currentAdvancingNewStage.toUpperCase()} con Fotoperiodo de ${light}h de luz y ${dark}h de oscuridad.`);
        } catch (e) { }

        document.getElementById('modal-stage-transition').style.display = 'none';
        await loadBatches();
    }
}

async function confirmHarvestWet() {
    const wetWeight = document.getElementById('stage-wet-weight').value;
    if (!wetWeight) return alert("Debe ingresar el peso húmedo estimado.");

    const batch = batches.find(b => b.id === currentAdvancingBatchId);
    if (batch) {
        const payload = {
            action: 'HARVEST_WET',
            batchId: currentAdvancingBatchId,
            weightWet: wetWeight
        };

        try {
            fetch("http://109.199.99.126:5678/webhook/cultivo-calendar", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (window.sbClient) {
                // Actualizar lote en Nube
                await window.sbClient.from('core_batches').update({
                    stage: 'cosecha',
                    weight_wet: parseFloat(wetWeight)
                }).eq('id', currentAdvancingBatchId);

                // Registrar Evento Biológico de Cosecha
                await window.sbClient.from('core_agronomic_events').insert([{
                    batch_id: currentAdvancingBatchId,
                    room_id: batch.location,
                    event_type: 'Fase',
                    description: `Corte y Cosecha Húmeda: ${wetWeight}g`
                }]);
            } else {
                batch.stage = 'cosecha';
                batch.weightWet = wetWeight;
            }

            alert(`Cosecha iniciada. ${wetWeight}g húmedos cargados.`);
        } catch (e) { }

        document.getElementById('modal-stage-harvest-wet').style.display = 'none';
        await loadBatches();
    }
}

let currentDryWeightBatchId = null;

function openDryWeightModal(batchId) {
    currentDryWeightBatchId = batchId;
    document.getElementById('modal-stage-harvest-dry').style.display = 'flex';
}

async function confirmHarvestDry() {
    const dryWeight = document.getElementById('stage-dry-weight').value;
    if (!dryWeight) return alert("Debe ingresar el peso seco final.");

    const batch = batches.find(b => b.id === currentDryWeightBatchId);
    if (batch) {
        if (window.sbClient) {
            try {
                // Actualizar peso seco en el lote en la Nube
                await window.sbClient.from('core_batches').update({
                    weight_dry: parseFloat(dryWeight)
                }).eq('id', batch.id);

                // Buscar o anexar Cosecha a la Bodega
                const existingReq = await window.sbClient.from('core_inventory_cosechas').select('qty').eq('id', batch.id).single();

                if (existingReq.data) {
                    await window.sbClient.from('core_inventory_cosechas').update({
                        qty: parseFloat(existingReq.data.qty) + parseFloat(dryWeight),
                        last_updated: new Date().toISOString()
                    }).eq('id', batch.id);
                } else {
                    await window.sbClient.from('core_inventory_cosechas').insert([{
                        id: batch.id,
                        name: `${batch.id} (${batch.strain})`,
                        type: 'cosecha_propia',
                        qty: parseFloat(dryWeight),
                        price: 0
                    }]);
                }
            } catch (e) { console.error("Error guardando cosecha en Nube:", e); }
        } else {
            batch.weightDry = dryWeight;
        }

        const payload = {
            action: 'UPDATE_STOCK',
            batchId: currentDryWeightBatchId,
            weightDry: dryWeight
        };

        try {
            fetch("http://109.199.99.126:5678/webhook/cultivo-calendar", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            alert(`Stock Comercial habilitado en Nube: ${dryWeight}g secos listos para Puntos de Venta.`);
        } catch (e) { }

        document.getElementById('modal-stage-harvest-dry').style.display = 'none';
        await loadBatches();
    }
}

async function guardarFertirriego(loteId) {
    const insumoId = document.getElementById('fertirriegoInsumo').value;
    const qty = parseFloat(document.getElementById('fertirriegoQty').value);
    const ec = document.getElementById('fertirriegoEc').value;
    const ph = document.getElementById('fertirriegoPh').value;

    if (!ec && !ph && (!insumoId && !qty)) {
        return alert("Ingresa valores a registrar.");
    }

    if (insumoId && qty > 0) {
        // Descontar del inventario Nube
        if (window.sbClient) {
            try {
                const { data, error } = await window.sbClient.from('core_inventory_quimicos').select('name, qty').eq('id', insumoId).single();
                if (data) {
                    if (qty > data.qty) {
                        return alert(`Stock insuficiente de ${data.name}. Sólo hay ${data.qty} disponibles.`);
                    }
                    await window.sbClient.from('core_inventory_quimicos').update({ qty: data.qty - qty, last_updated: new Date().toISOString() }).eq('id', insumoId);
                    await cargarSelectInsumos(); // Refresh select visual
                }
            } catch (e) { console.error("Error descontando insumo en Nube:", e); }
        }
    }

    alert(`Fertirriego registrado correctamente en el Lote: ${loteId}.\nStock descontado en la Nube.`);

    // Limpiar campos visualmente
    document.getElementById('fertirriegoQty').value = "";
    document.getElementById('fertirriegoEc').value = "";
    document.getElementById('fertirriegoPh').value = "";
}

// --- Módulo Eventos Agronómicos (Plagas, Aplicaciones, Observaciones) ---

function openAgronomicEventModal(batchId, roomId) {
    document.getElementById('event-batch-id').value = batchId;
    document.getElementById('event-room-id').value = roomId;
    document.getElementById('event-description').value = '';
    document.getElementById('modal-agronomic-event').style.display = 'flex';
}

async function submitAgronomicEvent() {
    const batchId = document.getElementById('event-batch-id').value;
    const roomId = document.getElementById('event-room-id').value;
    const eventType = document.getElementById('event-type').value;
    const description = document.getElementById('event-description').value;

    if (!description.trim()) {
        return alert("Por favor, ingresa una descripción del evento (ej. 'Aceite Neem 20ml').");
    }

    if (window.sbClient) {
        try {
            const { error } = await window.sbClient.from('core_agronomic_events').insert([{
                batch_id: batchId,
                room_id: roomId,
                event_type: eventType,
                description: description
            }]);

            if (error) throw error;

            alert("Evento Agronómico Registrado exitosamente en la línea de tiempo.");
            document.getElementById('modal-agronomic-event').style.display = 'none';

        } catch (e) {
            console.error("Error guardando evento en la Nube:", e);
            alert("Error de red. Intenta nuevamente.");
        }
    } else {
        alert("Modo Local: Evento Agronómico registrado transitoriamente.");
        document.getElementById('modal-agronomic-event').style.display = 'none';
    }
}

// --- Módulo Edición de Lotes Activos ---
function openEditBatchModal(batchId) {
    const batch = batches.find(b => b.id === batchId);
    if (!batch) return;

    if (batch.stage === 'cosechado' || batch.stage === 'cosecha') {
        alert("Los lotes en etapa de cosecha o cosechados ya no pueden editarse porque sus datos impactan en bodega/inventario.");
        return;
    }

    document.getElementById('editBatchOriginalId').value = batch.id;
    document.getElementById('editBatchId').value = batch.id; // disable id edit
    document.getElementById('editBatchStrain').value = batch.strain || '';
    document.getElementById('editBatchOrigen').value = batch.origen || 'clon';
    document.getElementById('editBatchMadre').value = batch.madre || '';
    document.getElementById('editBatchFlowerDays').value = batch.flowerDays || 60;
    document.getElementById('editBatchPlants').value = batch.numPlants || 0;

    const locSelect = document.getElementById('editBatchLocation');
    // Generar dinámicamente las opciones basadas en las salas descargadas
    let optionsHtml = '';
    const loadedRooms = Object.keys(coreRoomsMap);
    
    if (loadedRooms.length > 0) {
        loadedRooms.forEach(roomId => {
            optionsHtml += `<option value="${roomId}">${coreRoomsMap[roomId]}</option>`;
        });
    } else {
        // Fallback robusto por defecto
        optionsHtml = `
            <option value="sala-veg-1">Sala Veg 1</option>
            <option value="sala-flo-1">Sala Floración 1</option>
            <option value="sala-flo-2">Sala Floración 2</option>
        `;
    }

    // Agregar la locación actual si por caso extraño no está en la base ni en el fallback
    if (!loadedRooms.includes(batch.location) && !['sala-veg-1', 'sala-flo-1', 'sala-flo-2'].includes(batch.location)) {
        optionsHtml += `<option value="${batch.location}">${coreRoomsMap[batch.location] || batch.location}</option>`;
    }

    locSelect.innerHTML = optionsHtml;
    locSelect.value = batch.location || (loadedRooms.length > 0 ? loadedRooms[0] : 'sala-veg-1');

    document.getElementById('modal-edit-batch').style.display = 'flex';
}

async function confirmEditBatch() {
    const originalId = document.getElementById('editBatchOriginalId').value;
    const strain = document.getElementById('editBatchStrain').value;
    const origen = document.getElementById('editBatchOrigen').value;
    const madre = document.getElementById('editBatchMadre').value;
    const location = document.getElementById('editBatchLocation').value;
    const flowerDays = document.getElementById('editBatchFlowerDays').value;
    const numPlants = parseInt(document.getElementById('editBatchPlants').value) || 0;

    const batch = batches.find(b => b.id === originalId);
    if (!batch) return;

    if (window.sbClient) {
        try {
            await window.sbClient.from('core_batches').update({
                strain: strain,
                origen: origen,
                madre: madre,
                location: location,
                flower_days: flowerDays ? parseInt(flowerDays) : null,
                num_plants: numPlants
            }).eq('id', originalId);

            // Log edit event
            await window.sbClient.from('core_agronomic_events').insert([{
                batch_id: originalId,
                room_id: location,
                event_type: 'Info',
                description: 'Datos del lote actualizados manualmente.'
            }]);
            
            alert('Lote actualizado exitosamente.');
        } catch (e) {
            console.error("Error updating batch in DB:", e);
            alert("Hubo un error guardando en la Nube.");
            return;
        }
    } else {
        batch.strain = strain;
        batch.origen = origen;
        batch.madre = madre;
        batch.location = location;
        batch.flowerDays = flowerDays;
        batch.numPlants = numPlants;
        alert('Lote actualizado en modo local.');
    }

    document.getElementById('modal-edit-batch').style.display = 'none';
    await loadBatches();
}


// DOM Injector para selectores de ubicación base
function populateLocationSelects() {
    const locSelect = document.getElementById('cropLocation');
    if (!locSelect) return;
    
    const loadedRooms = Object.keys(coreRoomsMap);
    if (loadedRooms.length > 0) {
        let optionsHtml = '';
        loadedRooms.forEach(roomId => {
            optionsHtml += `<option value="${roomId}">${coreRoomsMap[roomId]}</option>`;
        });
        locSelect.innerHTML = optionsHtml;
    }
}
