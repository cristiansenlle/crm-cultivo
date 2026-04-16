const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// 1. Modificar Fila 2 (Ingreso Manual y Admin Sensores)
const fila2start = html.indexOf('<!-- Fila 2: Ingreso Manual y Sensores -->');
const vpdStart = html.indexOf('<!-- Fila 3: Valores de Referencia VPD (en fila) -->');

if (fila2start !== -1 && vpdStart !== -1) {
    const originalFila2 = html.substring(fila2start, vpdStart);

    const newFila2 = '                <!-- Fila 2: Widgets de Acción (Colapsados por defecto) -->\n' +
        '                <div class="widget glass-panel span-2" style="cursor: pointer; display: flex; align-items: center; justify-content: center; min-height: 100px; border-color: var(--color-blue);" onclick="const f = document.getElementById(\\\'manual-telemetry-container\\\'); f.style.display = f.style.display===\\\'none\\\'?\\\'block\\\':\\\'none\\\';">\n' +
        '                    <h3 style="margin: 0; color: var(--color-blue); text-transform: uppercase; font-size: 1.1rem; display: flex; align-items: center; gap: 10px;">\n' +
        '                        <i class="ph-fill ph-keyboard" style="font-size: 1.8rem;"></i> Ingreso de Telemetría Manual\n' +
        '                    </h3>\n' +
        '                </div>\n\n' +
        '                <div class="widget glass-panel span-2" style="cursor: pointer; display: flex; align-items: center; justify-content: center; min-height: 100px; border-color: var(--color-purple);" onclick="const f = document.getElementById(\\\'sensor-admin-container\\\'); f.style.display = f.style.display===\\\'none\\\'?\\\'block\\\':\\\'none\\\';">\n' +
        '                    <h3 style="margin: 0; color: var(--color-purple); text-transform: uppercase; font-size: 1.1rem; display: flex; align-items: center; gap: 10px;">\n' +
        '                        <i class="ph-fill ph-thermometer" style="font-size: 1.8rem;"></i> Panel de Sensores (Admin)\n' +
        '                    </h3>\n' +
        '                </div>\n\n' +
        '                <!-- Contenedores Ocultos de los Formularios (Originales) -->\n' +
        '                <div id="manual-telemetry-container" style="display: none; grid-column: span 4;">\n' +
        '                    <div class="widget glass-panel" id="widget-telemetry-input" style="border-left: 4px solid var(--color-blue);">\n' +
        '                        <div class="widget-header">\n' +
        '                            <h3><i class="ph ph-keyboard"></i> Herramienta de Ingreso Manual de Telemetría</h3>\n' +
        '                        </div>\n' +
        '                        <div style="margin-top: 10px;">\n' +
        '                            <label style="font-size: 0.8rem; color: var(--text-secondary);">Destino (Sensor)</label>\n' +
        '                            <select id="manualSensorSelect" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: white; margin-top: 5px;">\n' +
        '                                <option value="default">Promedio / Sala General</option>\n' +
        '                            </select>\n' +
        '                        </div>\n' +
        '                        <div style="display: flex; gap: 15px; margin-top: 15px; align-items:flex-end;">\n' +
        '                            <div style="flex:1;">\n' +
        '                                <label style="font-size: 0.8rem; color: var(--text-secondary);">Temp (°C)</label>\n' +
        '                                <input type="number" id="manual-temp" step="0.1" placeholder="--" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: white; font-family: \\\'JetBrains Mono\\\';">\n' +
        '                            </div>\n' +
        '                            <div style="flex:1;">\n' +
        '                                <label style="font-size: 0.8rem; color: var(--text-secondary);">Humedad (%)</label>\n' +
        '                                <input type="number" id="manual-hum" step="0.1" placeholder="--" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: white; font-family: \\\'JetBrains Mono\\\';">\n' +
        '                            </div>\n' +
        '                            <button class="btn-primary" onclick="updateManualTelemetry()" style="padding: 10px 20px; width:auto; flex-shrink: 0; font-weight: bold;"><i class="ph ph-upload-simple"></i> Cargar</button>\n' +
        '                        </div>\n' +
        '                    </div>\n' +
        '                </div>\n\n' +
        '                <div id="sensor-admin-container" style="display: none; grid-column: span 4;">\n' +
        '                    <div class="widget glass-panel" style="border-left: 4px solid var(--color-purple);">\n' +
        '                        <div style="display:flex; justify-content:space-between; align-items:center;">\n' +
        '                            <h3 style="margin:0; font-size:1.1rem; display:flex; align-items:center; gap:8px;">\n' +
        '                                <i class="ph ph-thermometer" style="color:var(--color-purple);"></i> Sensores Registrados\n' +
        '                            </h3>\n' +
        '                        </div>\n' +
        '                        <form id="newSensorForm" style="display:flex; gap: 15px; margin-top:15px; align-items:flex-end;">\n' +
        '                            <div style="flex:1;">\n' +
        '                                <label style="font-size: 0.8rem; color: var(--text-secondary);">Nueva Ubicación/Sensor</label>\n' +
        '                                <input type="text" id="sensorName" required placeholder="Ej: Foco, Puerta" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: white; margin-top:5px; font-family: \\\'JetBrains Mono\\\';">\n' +
        '                            </div>\n' +
        '                            <button type="submit" class="btn-primary" style="padding: 10px 20px; background:var(--color-purple); border-color:var(--color-purple); font-weight: bold;">\n' +
        '                                <i class="ph ph-plus"></i> Añadir a Sala Selecta\n' +
        '                            </button>\n' +
        '                        </form>\n' +
        '                        <div style="margin-top:15px; max-height: 120px; overflow-y: auto;">\n' +
        '                            <ul class="task-list" id="activeSensorsList" style="display: flex; flex-direction: column; gap: 8px; font-size: 0.85rem;">\n' +
        '                                <li style="color:#888; text-align:center; padding:10px;">Cargando sensores...</li>\n' +
        '                            </ul>\n' +
        '                        </div>\n' +
        '                    </div>\n' +
        '                </div>\n\n' +
        '                <!-- END FILA 2 -->\n';

    html = html.replace(originalFila2, newFila2.replace(/\\'/g, "'"));
}

const telemetryGlowHtml = '<style>\\n' +
    '.telemetry-widget {\\n' +
    '    background: linear-gradient(135deg, rgba(30,41,59,0.9), rgba(15,23,42,0.8)) !important;\\n' +
    '    border: 1px solid rgba(255,255,255,0.05) !important;\\n' +
    '    backdrop-filter: blur(25px) !important;\\n' +
    '    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3) !important;\\n' +
    '}\\n' +
    '.telemetry-widget.glow-green { border-bottom: 3px solid var(--color-green) !important; box-shadow: inset 0 -20px 20px -20px rgba(16, 185, 129, 0.3) !important; }\\n' +
    '.telemetry-widget.glow-yellow { border-bottom: 3px solid var(--color-yellow) !important; box-shadow: inset 0 -20px 20px -20px rgba(255, 234, 0, 0.3) !important; }\\n' +
    '.telemetry-widget.glow-red { border-bottom: 3px solid var(--color-red) !important; box-shadow: inset 0 -20px 20px -20px rgba(255, 61, 0, 0.4) !important; }\\n' +
    '.telemetry-widget .widget-value {\\n' +
    '    font-size: 3.5rem !important;\\n' +
    '    font-family: "JetBrains Mono", monospace !important;\\n' +
    '    font-weight: 800 !important;\\n' +
    '    text-align: center;\\n' +
    '    margin: 10px 0;\\n' +
    '    text-shadow: 0 0 20px rgba(255,255,255,0.1);\\n' +
    '}\\n' +
    '.widget-value span { color: #fff; }\\n' +
    '[data-theme="light"] .widget-value span { color: #111; }\\n' +
    '</style>\\n';

if (!html.includes('telemetry-widget { background: linear-gradient')) {
    html = html.replace('</head>', telemetryGlowHtml.replace(/\\n/g, '\n') + '</head>');
}

fs.writeFileSync('index.html', html);
console.log("Visuals updated for index.html successfully.");
