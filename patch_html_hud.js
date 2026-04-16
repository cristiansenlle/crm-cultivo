const fs = require('fs');
const files = ['index.html', 'tareas.html', 'pos.html', 'insumos.html', 'protocolos.html'];

for (let file of files) {
    if (!fs.existsSync(file)) continue;
    let html = fs.readFileSync(file, 'utf8');

    // 1. Grid Background en Body
    if (!html.includes('class="hud-grid-bg"')) {
        html = html.replace('<body>', '<body class="hud-grid-bg">');
    }

    // 2. Modulos de Cristal (ignorando los que ya tienen o los dashboard-grid base)
    html = html.replace(/class="widget"/g, 'class="widget glass-panel"');
    html = html.replace(/class="widget span-2"/g, 'class="widget glass-panel span-2"');
    html = html.replace(/class="widget span-3"/g, 'class="widget glass-panel span-3"');
    html = html.replace(/class="widget span-4"/g, 'class="widget glass-panel span-4"');

    // 3. Modificaciones por archivo individual (ocultar forms y crear toggle)
    if (file === 'insumos.html') {
        const titleToReplace = '<!-- Ingreso de Mercadería -->';
        if (html.includes(titleToReplace) && !html.includes('id="toggle-btn-insumo"')) {
            const toggleButtonHtml = `
            <!-- Boton de Activacion Formulario -->
            <div id="toggle-btn-insumo" class="glass-panel" style="padding: 15px; margin-bottom: 20px; grid-column: 1 / -1; cursor: pointer; text-align: center; border-color: var(--color-green);" onclick="const f = document.getElementById('ingreso-container'); f.style.display = f.style.display==='none'?'flex':'none';">
                <i class="ph-fill ph-plus-circle" style="font-size: 2rem; color: var(--color-green); margin-bottom: 5px; display:block;"></i>
                <h4 style="color: var(--text-primary); text-transform: uppercase;">Registrar Ingreso B2B / Compra Insumo</h4>
            </div>
            <!-- Contenedor original oculto inicial -->
            `;
            html = html.replace(titleToReplace, toggleButtonHtml + '<div id="ingreso-container" style="display:none; grid-column: span 1;">' + titleToReplace);
            
            // Cerrar el div extra y reparar el dashboard layout
            html = html.replace('</form>\n                </div>\n\n                <!-- Visor de Inventario -->', '</form>\n                </div>\n</div>\n\n                <!-- Visor de Inventario -->');
            // Hacer la grilla fluida en inusmos
            html = html.replace('grid-template-columns: 350px 1fr;', 'grid-template-columns: auto 1fr;');
        }
    }

    if (file === 'tareas.html') {
        const titleToReplace = '<!-- Nueva Tarea / Calendario -->';
        if (html.includes(titleToReplace) && !html.includes('id="toggle-btn-tarea"')) {
            const toggleButtonHtml = `
            <div id="toggle-btn-tarea" class="glass-panel" style="padding: 15px; margin-bottom: 20px; grid-column: 1 / -1; cursor: pointer; text-align: center; border-color: var(--color-blue);" onclick="const f = document.getElementById('tarea-container'); f.style.display = f.style.display==='none'?'flex':'none';">
                <i class="ph-fill ph-calendar-plus" style="font-size: 2rem; color: var(--color-blue); margin-bottom: 5px; display:block;"></i>
                <h4 style="color: var(--text-primary); text-transform: uppercase;">Crear Nueva Tarea o Evento</h4>
            </div>
            `;
            html = html.replace(titleToReplace, toggleButtonHtml + '<div id="tarea-container" style="display:none; grid-column: span 1;">' + titleToReplace);
            // Cierra el div wrapper
            html = html.replace('</form>\n                </div>\n\n                <!-- Timeline y Listado -->', '</form>\n                </div>\n</div>\n\n                <!-- Timeline y Listado -->');
            html = html.replace('grid-template-columns: 300px 1fr;', 'grid-template-columns: auto 1fr;');
        }
    }

    if (file === 'protocolos.html') {
        const titleToReplace = '<!-- Crear Sop -->';
        if (html.includes(titleToReplace) && !html.includes('id="toggle-btn-sop"')) {
            const toggleButtonHtml = `
            <div id="toggle-btn-sop" class="glass-panel" style="padding: 15px; margin-bottom: 20px; grid-column: 1 / -1; cursor: pointer; text-align: center; border-color: var(--color-green);" onclick="const f = document.getElementById('sop-container'); f.style.display = f.style.display==='none'?'flex':'none';">
                <i class="ph-fill ph-file-plus" style="font-size: 2rem; color: var(--color-green); margin-bottom: 5px; display:block;"></i>
                <h4 style="color: var(--text-primary); text-transform: uppercase;">Añadir Protocolo / Base de Conocimiento</h4>
            </div>
            `;
            html = html.replace(titleToReplace, toggleButtonHtml + '<div id="sop-container" style="display:none; grid-column: span 1;">' + titleToReplace);
            html = html.replace('</form>\n                </div>\n\n                <!-- Lista SOP -->', '</form>\n                </div>\n</div>\n\n                <!-- Lista SOP -->');
            html = html.replace('grid-template-columns: 350px 1fr;', 'grid-template-columns: auto 1fr;');
        }
    }

    // index.html tiene telemetría, no ocultar la telemetría, 
    // pero si ocultar el "Nueva Sala o Parametrización"
    if (file === 'index.html') {
        const titleToReplace = '<!-- Agregar Nueva Entidad (Salas, Usuarios, etc) -->';
        if (html.includes(titleToReplace) && !html.includes('id="toggle-btn-index"')) {
            const toggleButtonHtml = `
            <div id="toggle-btn-index" class="glass-panel" style="padding: 15px; margin-bottom: 20px; grid-column: 1 / -1; cursor: pointer; text-align: center; border-color: var(--color-yellow);" onclick="const f = document.getElementById('index-config-container'); f.style.display = f.style.display==='none'?'flex':'none';">
                <i class="ph-fill ph-gear" style="font-size: 2rem; color: var(--color-yellow); margin-bottom: 5px; display:block;"></i>
                <h4 style="color: var(--text-primary); text-transform: uppercase;">Parametrización Sistema & Usuarios</h4>
            </div>
            `;
            html = html.replace(titleToReplace, toggleButtonHtml + '<div id="index-config-container" style="display:none; grid-column: span 1;">' + titleToReplace);
            // en index la sección de form termina donde empieza Sensores (si existiese) o al final
            html = html.replace('</form>\n                    </div>\n                </div>\n\n                <!-- Telemetría & Medio Ambiente -->', '</form>\n                    </div>\n                </div>\n</div>\n\n                <!-- Telemetría & Medio Ambiente -->');
        }
    }

    if (file === 'pos.html') {
        const titleToReplace = '<!-- Formulario Venta (Carrito) -->';
         if (html.includes(titleToReplace) && !html.includes('id="toggle-btn-pos"')) {
            const toggleButtonHtml = `
            <div id="toggle-btn-pos" class="glass-panel" style="padding: 15px; margin-bottom: 20px; grid-column: 1 / -1; cursor: pointer; text-align: center; border-color: var(--color-green);" onclick="const f = document.getElementById('pos-form-container'); f.style.display = f.style.display==='none'?'flex':'none';">
                <i class="ph-fill ph-shopping-bag" style="font-size: 2rem; color: var(--color-green); margin-bottom: 5px; display:block;"></i>
                <h4 style="color: var(--text-primary); text-transform: uppercase;">Abrir Operador de Punto de Venta / Crear Carrito</h4>
            </div>
            `;
            html = html.replace(titleToReplace, toggleButtonHtml + '<div id="pos-form-container" style="display:none; grid-column: span 1;">' + titleToReplace);
            html = html.replace('</div>\n                </div>\n\n                <!-- Ticket o Historial -->', '</div>\n                </div>\n</div>\n\n                <!-- Ticket o Historial -->');
            html = html.replace('grid-template-columns: 400px 1fr;', 'grid-template-columns: auto 1fr;');
        }
    }

    fs.writeFileSync(file, html);
    console.log(`HUD injected into \${file}`);
}
