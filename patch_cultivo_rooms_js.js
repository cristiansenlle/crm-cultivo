const fs = require('fs');

let jsContent = fs.readFileSync('cultivo.js', 'utf8');

// 1. Eliminar función renderBatches anterior
let renderStart = jsContent.indexOf('function renderBatches() {');
if (renderStart > -1) {
    let renderEnd = jsContent.indexOf('// Funciones para submódulos de lote', renderStart);
    if(renderEnd === -1) { // Fallback
         renderEnd = jsContent.indexOf('async function logNutrition', renderStart);
    }
    if (renderStart < renderEnd) {
         jsContent = jsContent.slice(0, renderStart) + jsContent.slice(renderEnd);
    }
}

// 2. Funciones Nuevas HUD
const newLogic = `

// --- ESTADO HUD SALAS ---
let currentOpenRoom = null;

function renderBatches() {
    const listOverview = document.getElementById('roomsGridList');
    const listLotes = document.getElementById('activeCropsList');
    
    // 1. Agrupar Lotes por Sala
    let roomsData = {};
    batches.forEach(b => {
        let rId = b.location;
        if(!roomsData[rId]) {
            roomsData[rId] = { id: rId, name: coreRoomsMap[rId] || rId, count: 0, cost: 0, items: [] };
        }
        roomsData[rId].count++;
        roomsData[rId].cost += (parseFloat(b.accumulatedCost) || 0);
        roomsData[rId].items.push(b);
    });
    
    // 2. Renderizar Tarjetas de Salas (Vista Master)
    let overviewHtml = '';
    const roomKeys = Object.keys(roomsData);
    if(roomKeys.length === 0) {
        overviewHtml = '<li style="color:var(--text-secondary);">No hay salas con lotes activos.</li>';
    } else {
        roomKeys.forEach(key => {
            let r = roomsData[key];
            overviewHtml += \`
                <li class="glass-panel" style="padding: 20px; display:flex; flex-direction:column; gap:10px; cursor: pointer;" onclick="openRoomDashboard('\${r.id}')">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size: 1.1rem; font-weight:800; color:var(--text-primary);"><i class="ph-fill ph-map-pin" style="color:var(--color-green);"></i> \${r.name}</span>
                        <span style="font-size: 1.2rem; font-family:'JetBrains Mono'; color:var(--color-green); font-weight:700;">\${r.count} <small style="font-size:0.7rem; color:var(--text-secondary);">LOTES</small></span>
                    </div>
                    <div style="margin-top: 10px; font-size:0.85rem; color:var(--text-secondary);">
                        Costo Operativo Acumulado: <strong style="color:#ffb74d;">$\${r.cost.toFixed(2)}</strong>
                    </div>
                </li>
            \`;
        });
    }
    if (listOverview) listOverview.innerHTML = overviewHtml;
    
    // 3. Renderizar Vista de Detalle si hay una sala abierta
    if(currentOpenRoom && listLotes) {
        let rData = roomsData[currentOpenRoom];
        let detailHtml = '';
        if(!rData || rData.items.length === 0) {
            closeRoomDashboard();
            return; 
        }
        document.getElementById('roomCropsCount').innerText = rData.count;
        
        rData.items.forEach(b => {
            let color = 'var(--color-blue)';
            let label = 'Propagación';
            if (b.stage === 'vegetativo') { color = 'var(--color-green)'; label = 'Fase Vegetativa'; }
            if (b.stage === 'floracion') { color = 'var(--color-yellow)'; label = 'Fase de Floración'; }
            if (b.stage === 'cosecha') { color = 'var(--color-red)'; label = 'Cosecha'; }
            
            // Calculo de Días Activos
            let daysActive = 'N/A';
            if(b.startDate) {
                const ms = Date.now() - new Date(b.startDate).getTime();
                daysActive = Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
            }
            
            detailHtml += \`
            <li class="glass-panel" style="border-left: 4px solid \${color}; padding: 15px; display:flex; justify-content:space-between; align-items:center;">
                <div style="display:flex; flex-direction:column;">
                    <strong style="font-size: 1.1rem; font-weight:800; color: var(--text-primary); margin-bottom:5px;">\${b.id} - <span style="color:var(--color-green);">\${b.strain}</span></strong>
                    <span style="font-size: 0.8rem; color: var(--text-secondary);">
                        <i class="ph-fill ph-plant"></i> \${b.numPlants} Plantas | Días Activos: <strong style="color:#fff;">\${daysActive}</strong> | Etapa: \${label}
                    </span>
                </div>
                
                <div style="display:flex; gap:10px;">
                    <div style="text-align:right; margin-right: 15px;">
                        <div style="font-size: 1.1rem; font-weight: 800; color: #ffb74d;">$\${parseFloat(b.accumulatedCost || 0).toFixed(2)}</div>
                        <div style="font-size: 0.65rem; color: var(--text-secondary); text-transform:uppercase;">Costo</div>
                    </div>
                    <button class="glass-btn" style="padding:8px 12px; border-radius:6px; color:var(--text-secondary);" onclick="viewAgronomicHistory('\${b.id}')" title="Ver Historial"><i class="ph ph-clock-counter-clockwise"></i></button>
                    <button class="glass-btn" style="padding:8px 12px; border-radius:6px; color:var(--text-secondary);" onclick="openEditBatchModal('\${b.id}')" title="Editar Lote"><i class="ph ph-pencil-simple"></i></button>
                    <button class="glass-btn" style="padding:8px 12px; border-radius:6px; color:var(--color-blue);" onclick="openAgronomicEventModal('\${b.id}', '\${b.location}')" title="Evento Particular"><i class="ph ph-note-pencil"></i></button>
                    <button class="glass-btn" style="padding:8px 12px; border-radius:6px; color:var(--text-primary); border-color:var(--color-green);" onclick="advanceStage('\${b.id}')" title="Avanzar Fase / Cosechar"><i class="ph ph-flag-checkered"></i></button>
                </div>
            </li>
            \`;
        });
        listLotes.innerHTML = detailHtml;
    }
}

function openRoomDashboard(roomId) {
    currentOpenRoom = roomId;
    document.getElementById('rooms-overview-wrapper').style.display = 'none';
    document.getElementById('room-detail-wrapper').style.display = 'flex';
    document.getElementById('roomDetailTitle').innerHTML = \`
        <button onclick="closeRoomDashboard()" class="glass-btn" style="padding: 5px 10px; border-radius: 6px; font-size: 0.85rem; margin-right: 10px;"><i class="ph ph-arrow-left"></i> Volver</button>
        <i class="ph-fill ph-map-pin"></i> \${coreRoomsMap[roomId] || roomId}
    \`;
    renderBatches();
}

function closeRoomDashboard() {
    currentOpenRoom = null;
    document.getElementById('room-detail-wrapper').style.display = 'none';
    document.getElementById('rooms-overview-wrapper').style.display = 'flex';
    renderBatches();
}

// --- ACCIONES AGRONÓMICAS MASIVAS (WIDGETS DE SALA) ---
function openRoomActionModal(type) {
    if(!currentOpenRoom) return;
    
    // Llenar checkboxes de lotes
    let rBatches = batches.filter(b => b.location === currentOpenRoom);
    let checksHtml = rBatches.map(b => \`
        <label style="display:flex; align-items:center; gap:8px; padding:8px; background:rgba(0,0,0,0.2); border-radius:6px; cursor:pointer;" class="font-mono">
            <input type="checkbox" name="roomActionBatches" value="\${b.id}" checked>
            \${b.id} (\${b.strain})
        </label>
    \`).join('');
    
    document.getElementById('roomActionBatchList').innerHTML = checksHtml;
    document.getElementById('roomActionType').value = type;
    
    // Mostrar u ocultar campos según tipo
    document.getElementById('ram-nutricion-fields').style.display = type === 'nutricion' ? 'block' : 'none';
    document.getElementById('ram-ipm-fields').style.display = type === 'ipm' ? 'block' : 'none';
    document.getElementById('ram-poda-fields').style.display = type === 'poda' ? 'block' : 'none';
    
    // Títulos y Colores
    let title = "Acción Masiva";
    let icon = "ph-asterisk";
    let color = "#fff";
    
    if(type === 'nutricion') {
        title = "Riego & Nutrición"; icon = "ph-drop"; color = "var(--color-blue)";
        let sel = document.getElementById('ram-nutri-prod');
        sel.innerHTML = '<option value="">Solo Agua</option>' + nutritionProducts.map(p => \`<option value="\${p.id}">\${p.name} (Disp: \${p.qty}mL)</option>\`).join('');
    } else if(type === 'ipm') {
        title = "Prevención IPM"; icon = "ph-bug"; color = "var(--color-red)";
        let sel = document.getElementById('ram-ipm-prod');
        sel.innerHTML = '<option value="">Acción Manual (ej: Limpieza)</option>' + ipmProducts.map(p => \`<option value="\${p.id}">\${p.name} (Disp: \${p.qty}mL)</option>\`).join('');
    } else if(type === 'poda') {
        title = "Bitácora Físico/Poda"; icon = "ph-scissors"; color = "var(--color-green)";
    }
    
    document.getElementById('ram-title').innerHTML = \`<i class="\${icon}"></i> \${title}\`;
    document.getElementById('ram-title').style.color = color;
    
    document.getElementById('modal-room-action').style.display = 'flex';
}

async function submitRoomAction() {
    if(!window.sbClient) { alert("Base de datos no conectada"); return; }
    
    let type = document.getElementById('roomActionType').value;
    let checks = document.querySelectorAll('input[name="roomActionBatches"]:checked');
    let selectedBatches = Array.from(checks).map(c => c.value);
    
    if(selectedBatches.length === 0) return alert("Debes seleccionar al menos un lote de la sala.");
    
    let eventsToInsert = [];
    let inventoryUpdates = [];
    let payloadN8N = null;

    try {
        if(type === 'nutricion') {
            const prodId = document.getElementById('ram-nutri-prod').value;
            const qtyPerBatch = parseFloat(document.getElementById('ram-nutri-qty').value) || 0;
            const ec_ph = document.getElementById('ram-nutri-ph').value;
            const waterLitersPerBatch = parseFloat(document.getElementById('ram-nutri-water').value) || 0;
            
            let pName = 'Sólo Agua', exactCostPerBatch = 0, stockNeeded = 0;
            
            if(prodId) {
                const pObj = nutritionProducts.find(p => p.id === prodId);
                if(pObj) {
                    pName = pObj.name;
                    exactCostPerBatch = parseFloat(pObj.unit_cost || 0) * qtyPerBatch;
                    stockNeeded = qtyPerBatch * selectedBatches.length;
                    inventoryUpdates.push({ id: prodId, deduct: stockNeeded, current: pObj.qty });
                }
            }
            
            selectedBatches.forEach(bid => {
                eventsToInsert.push({
                    batch_id: bid, room_id: currentOpenRoom, event_type: 'nutricion',
                    product_id: prodId || null, amount_applied: prodId ? qtyPerBatch : null,
                    water_liters: waterLitersPerBatch, total_cost: exactCostPerBatch,
                    description: \`\${pName} aplicados (\${qtyPerBatch}ml)\`,
                    details: { ec_ph, product_name: pName, is_massive: true }
                });
            });
            
        } else if(type === 'ipm') {
            const prodId = document.getElementById('ram-ipm-prod').value;
            const qtyPerBatch = parseFloat(document.getElementById('ram-ipm-qty').value) || 0;
            const sync = document.getElementById('ram-ipm-cal').checked;
            
            let pName = 'Acción Manual', stockNeeded = 0;
            
            if(prodId) {
                const pObj = ipmProducts.find(p => p.id === prodId);
                if(pObj) {
                    pName = pObj.name;
                    stockNeeded = qtyPerBatch * selectedBatches.length;
                    inventoryUpdates.push({ id: prodId, deduct: stockNeeded, current: pObj.qty });
                }
            }
            
            selectedBatches.forEach(bid => {
                eventsToInsert.push({
                    batch_id: bid, room_id: currentOpenRoom, event_type: 'ipm',
                    product_id: prodId || null, amount_applied: prodId ? qtyPerBatch : null,
                    description: \`Prevención IPM: \${pName}\`,
                    details: { product_name: pName, is_massive: true }
                });
            });
            
            if (sync) payloadN8N = { action: 'SCHEDULE_IPM', batchIds: selectedBatches, product: pName, scheduleDays: 15 };
            
        } else if(type === 'poda') {
            const pType = document.getElementById('ram-poda-type').value;
            const sync = document.getElementById('ram-poda-cal').checked;
            
            selectedBatches.forEach(bid => {
                eventsToInsert.push({
                    batch_id: bid, room_id: currentOpenRoom, event_type: 'poda',
                    description: \`Bitácora: \${pType}\`,
                    details: { prune_type: pType, is_massive: true }
                });
            });
            
            if (sync) payloadN8N = { action: 'SCHEDULE_PRUNING', batchIds: selectedBatches, pruneType: pType, scheduleHours: 48 };
        }
        
        // Ejecutar DDBB
        if (inventoryUpdates.length > 0) {
            for(let up of inventoryUpdates) {
                if(up.deduct > up.current) return alert(\`Stock Insuficiente. Necesitas \${up.deduct} pero tienes \${up.current}.\`);
                await window.sbClient.from('core_inventory_quimicos').update({ qty: Math.max(0, up.current - up.deduct) }).eq('id', up.id);
            }
            await fetchInventoryForAgronomy();
        }
        
        if (eventsToInsert.length > 0) {
            await window.sbClient.from('core_agronomic_events').insert(eventsToInsert);
        }
        
        if(payloadN8N) {
            fetch("http://109.199.99.126:5678/webhook/cultivo-calendar", {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadN8N)
            }).catch(e=>console.error(e));
        }
        
        alert("¡Acción aplicada exitosamente a " + selectedBatches.length + " lotes!");
        document.getElementById('modal-room-action').style.display = 'none';
        await loadBatches(); // refrescar DB e interfaz
        
        document.getElementById('ram-nutri-qty').value='';
        document.getElementById('ram-nutri-ph').value='';
        document.getElementById('ram-nutri-water').value='';
        document.getElementById('ram-ipm-qty').value='';
        
    } catch(err) {
        console.error("Massive Action Error:", err);
        alert("Error al procesar la acción masiva.");
    }
}

`;

jsContent = jsContent.replace('// Funciones para submódulos de lote', newLogic + '\n// Funciones para submódulos de lote');

fs.writeFileSync('cultivo.js', jsContent);
console.log('Cultivo HUD JS logica inyectada correctamente.');
