const fs = require('fs');
const path = require('path');

const jsPath = 'c:/Users/Cristian/.gemini/antigravity/crm cannabis/agronomy.js';
let js = fs.readFileSync(jsPath, 'utf8');

// Add Date Filtering logic to renderAgronomyChart()
if (!js.includes("filterStartDate")) {
    const renderStart = "    const batchFilter = document.getElementById('filterBatch').value;";
    const filterInject = \`
    const startDateVal = document.getElementById('filterStartDate').value;
    const endDateVal = document.getElementById('filterEndDate').value;
    \`;
    const fInit = "    let fEvents = eventsData;";
    const fFilter = \`
    if (startDateVal) {
        const startMs = new Date(startDateVal + "T00:00:00").getTime();
        fTelemetry = fTelemetry.filter(t => new Date(t.timestamp).getTime() >= startMs);
        fEvents = fEvents.filter(e => new Date(e.date_occurred).getTime() >= startMs);
    }
    if (endDateVal) {
        const endMs = new Date(endDateVal + "T23:59:59").getTime();
        fTelemetry = fTelemetry.filter(t => new Date(t.timestamp).getTime() <= endMs);
        fEvents = fEvents.filter(e => new Date(e.date_occurred).getTime() <= endMs);
    }
    \`;

    js = js.replace(renderStart, renderStart + filterInject);
    js = js.replace(fInit, fInit + fFilter);

    // Add exportTimelinePDF function at bottom
    js += \`
async function exportTimelinePDF() {
    const btn = event.currentTarget || event.target.closest('button');
    const ogHtml = btn.innerHTML;
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Procesando...';
    btn.disabled = true;

    try {
        const element = document.querySelector('.widget');
        const opt = {
            margin:       0.5,
            filename:     'Reporte_Agronomico_' + new Date().toLocaleDateString('es-AR').replace(/\\//g, '-') + '.pdf',
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
\`;

    fs.writeFileSync(jsPath, js);
    console.log("Patched agronomy.js");
}

const htmlFiles = ['agronomy.html', 'agronomy_server.html'];

for (const file of htmlFiles) {
    const fPath = path.join('c:/Users/Cristian/.gemini/antigravity/crm cannabis/', file);
    if (!fs.existsSync(fPath)) continue;
    let html = fs.readFileSync(fPath, 'utf8');

    // Inject html2pdf.js before Theme Toggle script
    if (!html.includes('html2pdf.bundle')) {
        html = html.replace('<!-- Theme Toggle -->', 
            '<!-- html2pdf -->\\n    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>\\n    <!-- Theme Toggle -->');
    }

    // Inject Export Button in header
    if (!html.includes('exportTimelinePDF')) {
        const regexHeaderBtns = /<div class="header-action-buttons" style="display: flex; align-items: center; gap: 12px; margin-left: auto;">/;
        const btnHtml = \`
                        <button class="btn-primary" onclick="exportTimelinePDF(event)" style="background:var(--color-green); color:#fff; border:none; border-radius: 8px; padding: 8px 15px; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: all 0.2s ease; height: 40px;">
                            <i class="ph ph-file-pdf" style="font-size: 1.2rem;"></i>
                            <span style="font-size: 0.85rem; font-weight: 600;">Exportar Vista PDF</span>
                        </button>\`;
        html = html.replace(regexHeaderBtns, '<div class="header-action-buttons" style="display: flex; align-items: center; gap: 12px; margin-left: auto;">' + btnHtml);
    }

    // Inject Date Pickers
    if (!html.includes('filterStartDate')) {
        const oldFilterDiv = '<div style="display:flex; gap: 10px;">';
        const newFilterDiv = \`
                        <div style="display:flex; gap: 10px; align-items: center; flex-wrap: wrap; justify-content: flex-end;">
                            <input type="date" id="filterStartDate" onchange="applyAgronomyFilters()" style="padding:8px; border-radius:6px; background:#111; color:#fff; border:1px solid #444;" title="Fecha de Inicio" aria-label="Desde">
                            <span style="color:var(--text-muted); font-size: 0.9rem;">al</span>
                            <input type="date" id="filterEndDate" onchange="applyAgronomyFilters()" style="padding:8px; border-radius:6px; background:#111; color:#fff; border:1px solid #444;" title="Fecha de Fin" aria-label="Hasta">\`;
        html = html.replace(oldFilterDiv, newFilterDiv);
    }

    fs.writeFileSync(fPath, html);
    console.log("Patched " + file);
}
