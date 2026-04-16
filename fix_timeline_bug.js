const fs = require('fs');
const path = require('path');

// 1. Fix agronomy.js filter logic
let jsPath = 'c:/Users/Cristian/.gemini/antigravity/crm cannabis/agronomy.js';
let js = fs.readFileSync(jsPath, 'utf8');

js = js.replace(/t\.timestamp/g, 't.created_at');
fs.writeFileSync(jsPath, js);
console.log('Fixed telemetry field variable in agronomy.js');


// 2. Fix the html files for UI
const htmlFiles = ['agronomy.html', 'agronomy_server.html'];

for (const file of htmlFiles) {
    let fPath = path.join('c:/Users/Cristian/.gemini/antigravity/crm cannabis/', file);
    if (!fs.existsSync(fPath)) continue;
    
    let html = fs.readFileSync(fPath, 'utf8');
    
    // Using simple string replacement anchor since my previous script created a specific DOM block
    // The previous block was:
    /*
                        <div style="display:flex; gap: 10px; align-items: center; flex-wrap: wrap; justify-content: flex-end;">
                            <input type="date" id="filterStartDate" onchange="applyAgronomyFilters()" style="padding:8px; border-radius:6px; background:#111; color:#fff; border:1px solid #444;" title="Fecha de Inicio" aria-label="Desde">
                            <span style="color:var(--text-muted); font-size: 0.9rem;">al</span>
                            <input type="date" id="filterEndDate" onchange="applyAgronomyFilters()" style="padding:8px; border-radius:6px; background:#111; color:#fff; border:1px solid #444;" title="Fecha de Fin" aria-label="Hasta">
                            
                            <select id="filterRoom"
                                style="padding:8px 15px; border-radius:6px; background:#111; color:#fff; border:1px solid #444;"
                                onchange="applyAgronomyFilters()">
                                <option value="all">Todas las Salas</option>
                            </select>

                            <select id="filterBatch"
                                style="padding:8px 15px; border-radius:6px; background:#111; color:#fff; border:1px solid #444;"
                                onchange="applyAgronomyFilters()">
                                <option value="all">Todos los Lotes</option>
                                <!-- Se llenará dinámicamente -->
                            </select>
                        </div>
    */
    
    // I will grab the entire <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 15px;"> block
    // and replace the inner contents entirely.
    
    const anchorStart = '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 15px;">';
    const anchorEnd = '<div style="position: relative; height: 500px; width: 100%;">';
    
    const parts0 = html.split(anchorStart);
    const parts1 = parts0[1].split(anchorEnd);
    
    const newUI = `
                        <div>
                            <h3 style="margin-bottom: 0.5rem; display:flex; align-items:center; gap:8px;">
                                <i class="ph ph-chart-scatter"></i> Línea de Tiempo Integral
                            </h3>
                            <p style="font-size: 0.85rem; color: var(--text-muted);">
                                Visualiza líneas de Temp y VPD interceptadas por eventos de plagas <span
                                    style="color:#ef4444">(Rojo)</span>, fases <span
                                    style="color:#eab308">(Amarillo)</span> y tareas del calendario <span
                                    style="color:#22c55e">(Verde)</span>.
                            </p>
                        </div>
                        <div class="filters-container" style="display:flex; gap:15px; align-items:flex-end; flex-wrap:wrap; justify-content:flex-end;">
                            <div style="display:flex; flex-direction:column; gap:4px;">
                                <label style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px;">Desde</label>
                                <input type="date" id="filterStartDate" onchange="applyAgronomyFilters()" style="padding:8px 12px; border-radius:6px; background:#111; color:#fff; border:1px solid #444; height:38px; cursor:pointer;">
                            </div>
                            <div style="display:flex; flex-direction:column; gap:4px;">
                                <label style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px;">Hasta</label>
                                <input type="date" id="filterEndDate" onchange="applyAgronomyFilters()" style="padding:8px 12px; border-radius:6px; background:#111; color:#fff; border:1px solid #444; height:38px; cursor:pointer;">
                            </div>
                            <div style="display:flex; flex-direction:column; gap:4px;">
                                <label style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px;">Sala</label>
                                <select id="filterRoom" onchange="applyAgronomyFilters()" style="padding:8px 15px; border-radius:6px; background:#111; color:#fff; border:1px solid #444; height:38px; cursor:pointer;">
                                    <option value="all">Todas</option>
                                </select>
                            </div>
                            <div style="display:flex; flex-direction:column; gap:4px;">
                                <label style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px;">Lote</label>
                                <select id="filterBatch" onchange="applyAgronomyFilters()" style="padding:8px 15px; border-radius:6px; background:#111; color:#fff; border:1px solid #444; height:38px; cursor:pointer;">
                                    <option value="all">Todos</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    `;
    
    html = parts0[0] + anchorStart + newUI + anchorEnd + parts1[1];
    fs.writeFileSync(fPath, html);
    console.log('Restructured filters UI in ' + file);
}
