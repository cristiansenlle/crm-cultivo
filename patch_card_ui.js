const fs = require('fs');
const jsPath = 'c:/Users/Cristian/.gemini/antigravity/crm cannabis/cultivo.js';

let js = fs.readFileSync(jsPath, 'utf8');

const t1 = `            <div style="display:flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <div style="display:flex; flex-direction:column;">
                    <strong style="font-size: 1.1rem;">\${b.id} - \${b.strain}</strong>
                    <span class="task-time" style="color:\${color}">\${label} - Inicial</span>
                    <span style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 3px;"><i class="ph ph-map-pin"></i> \${roomName} | Origen: \${originText} \${madreText}\${fotoText}</span>
                </div>
                \${actionHtml}
            </div>`;

const r1 = `            <div style="display:flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                <div style="display:flex; flex-direction:column; flex:1;">
                    <div style="display:flex; justify-content: space-between; align-items: center; padding-right:15px;">
                        <strong style="font-size: 1.2rem; color: var(--text-primary);">\${b.id} - \${b.strain}</strong>
                        <div style="text-align:right; display:flex; flex-direction:column;">
                            <span style="font-size: 1.2rem; font-weight: 800; color: #ffb74d;">$\${parseFloat(b.accumulatedCost || 0).toFixed(2)}</span>
                            <span style="font-size: 0.65rem; color: var(--text-secondary); text-transform:uppercase;">Costo Acumulado</span>
                        </div>
                    </div>
                    <span class="task-time" style="color:\${color}; margin-top:4px;">\${label} - Inicial</span>
                    <span style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 5px;">
                        <i class="ph-fill ph-plant" style="color:var(--color-green);"></i> \${b.numPlants} Plantas | <i class="ph ph-map-pin"></i> \${roomName} | Origen: \${originText} \${madreText}\${fotoText}
                    </span>
                </div>
                <div style="margin-left:auto;">\${actionHtml}</div>
            </div>`;

if(js.indexOf(t1) !== -1) {
    js = js.replace(t1, r1);
    fs.writeFileSync(jsPath, js, 'utf8');
    console.log("Card UI Patched");
} else {
    console.log("Card UI Target NOT FOUND at all");
}
