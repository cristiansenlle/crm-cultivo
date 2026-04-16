const fs = require('fs');

const htmlPath = 'c:/Users/Cristian/.gemini/antigravity/crm cannabis/cultivo.html';
let html = fs.readFileSync(htmlPath, 'utf8');

html = html.replace(
`<table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
                    <thead>
                        <tr style="border-bottom: 1px solid #444; color: var(--text-secondary); text-align: left;">
                            <th style="padding: 8px;">Fecha</th>
                            <th style="padding: 8px;">Tipo</th>
                            <th style="padding: 8px;">Detalle</th>
                        </tr>
                    </thead>`,
`<table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
                    <thead>
                        <tr style="border-bottom: 1px solid #444; color: var(--text-secondary); text-align: left;">
                            <th style="padding: 8px;">Fecha</th>
                            <th style="padding: 8px;">Tipo</th>
                            <th style="padding: 8px;">Métricas</th>
                            <th style="padding: 8px;">Detalle</th>
                        </tr>
                    </thead>`
);

fs.writeFileSync(htmlPath, html);

const jsPath = 'c:/Users/Cristian/.gemini/antigravity/crm cannabis/cultivo.js';
let js = fs.readFileSync(jsPath, 'utf8');

js = js.replace(
`                const tr = document.createElement('tr');
                tr.innerHTML = \`
                    <td>\${eventDate ? new Date(eventDate).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }) : 'N/A'} \${eventDate ? new Date(eventDate).toLocaleTimeString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit' }) : ''}</td>
                    <td style="text-transform: capitalize; color: var(--color-blue); font-weight: 600;">\${ev.event_type}</td>
                    <td style="color: var(--text-secondary);">\${detailStr}</td>
                \`;`,
`                const tr = document.createElement('tr');
                tr.innerHTML = \`
                    <td style="padding:8px; border-bottom:1px solid #444;">\${eventDate ? new Date(eventDate).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }) : 'N/A'} \${eventDate ? new Date(eventDate).toLocaleTimeString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit' }) : ''}</td>
                    <td style="padding:8px; border-bottom:1px solid #444; text-transform: capitalize; color: var(--color-blue); font-weight: 600;">\${ev.event_type}</td>
                    <td style="padding:8px; border-bottom:1px solid #444; color: var(--color-green); font-weight: bold; font-size:0.8rem;">
                        <span style="color: #ffb74d;">$\${(ev.total_cost || 0).toFixed(2)}</span><br>
                        <span style="color: #64b5f6;">\${(ev.water_liters || 0).toFixed(2)} L</span>
                    </td>
                    <td style="padding:8px; border-bottom:1px solid #444; color: var(--text-secondary);">\${detailStr}</td>
                \`;`
);

fs.writeFileSync(jsPath, js);
console.log('Patch complete.');
