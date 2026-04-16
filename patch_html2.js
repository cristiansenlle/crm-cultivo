const fs = require('fs');

const htmlPath = 'c:/Users/Cristian/.gemini/antigravity/crm cannabis/cultivo.html';
let html = fs.readFileSync(htmlPath, 'utf8');

const regex = new RegExp('<input type="hidden" id="editBatchOriginalId">[\\\\s\\\\S]*?(?=<!-- Modal Success -->)', 'm');

const replacement = `<input type="hidden" id="editBatchOriginalId">
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 15px; margin-bottom: 20px;">
                <!-- Row 1 -->
                <div style="display: flex; flex-direction: column;">
                    <label style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 5px;">ID del Lote</label>
                    <input type="text" id="editBatchId" disabled
                        style="padding:10px; border-radius:8px; background:rgba(30, 30, 35, 0.8); color:#fff; border:1px solid #444; opacity: 0.7; transition: all 0.2s ease;">
                </div>
                <div style="display: flex; flex-direction: column;">
                    <label style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 5px;">Cepa / Variedad</label>
                    <input type="text" id="editBatchStrain"
                        style="padding:10px; border-radius:8px; background:rgba(30, 30, 35, 0.8); color:#fff; border:1px solid #444; transition: all 0.2s ease;">
                </div>

                <!-- Row 2 -->
                <div style="display: flex; flex-direction: column;">
                    <label style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 5px;">Origen</label>
                    <select id="editBatchOrigen"
                        style="padding:10px; border-radius:8px; background:rgba(30, 30, 35, 0.8); color:#fff; border:1px solid #444; transition: all 0.2s ease;">
                        <option value="clon">Clon (Esqueje)</option>
                        <option value="semilla">Semilla</option>
                    </select>
                </div>
                <div style="display: flex; flex-direction: column;">
                    <label style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 5px;">Madre/Breeder</label>
                    <input type="text" id="editBatchMadre"
                        style="padding:10px; border-radius:8px; background:rgba(30, 30, 35, 0.8); color:#fff; border:1px solid #444; transition: all 0.2s ease;">
                </div>

                <!-- Row 3 -->
                <div style="display: flex; flex-direction: column;">
                    <label style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 5px;">Días de Floración</label>
                    <input type="number" id="editBatchFlowerDays"
                        style="padding:10px; border-radius:8px; background:rgba(30, 30, 35, 0.8); color:#fff; border:1px solid #444; transition: all 0.2s ease;">
                </div>
                <div style="display: flex; flex-direction: column;">
                    <label style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 5px;">Cant. Plantas</label>
                    <input type="number" id="editBatchPlants" min="0" placeholder="0"
                        style="padding:10px; border-radius:8px; background:rgba(30, 30, 35, 0.8); color:#fff; border:1px solid #444; transition: all 0.2s ease;">
                </div>

                <!-- Row 4 (Full Width) -->
                <div style="display: flex; flex-direction: column; grid-column: span 2;">
                    <label style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 5px;">Ubicación / Sala del Cultivo</label>
                    <select id="editBatchLocation"
                        style="padding:10px; border-radius:8px; background:rgba(30, 30, 35, 0.8); color:#fff; border:1px solid #444; transition: all 0.2s ease;">
                        <!-- Se llenará dinámicamente -->
                    </select>
                </div>
            </div>

            <button class="btn-primary" style="width: 100%; padding:14px; border-radius: 10px; font-weight: 700; font-size: 1.05rem; display: flex; align-items: center; justify-content: center; gap: 8px; background-color: var(--color-blue); border: none; color: white; box-shadow: 0 8px 20px -5px rgba(41, 121, 255, 0.4); transition: all 0.3s ease;"
                onclick="confirmEditBatch()">
                <i class="ph ph-floppy-disk" style="font-size: 1.3rem;"></i> Confirmar Cambios
            </button>
        </div>
    </div>

    `;

if(regex.test(html)) {
    let replaced = html.replace(regex, replacement);
    fs.writeFileSync(htmlPath, replaced, 'utf8');
    console.log("SUCCESS HTML PATCH");
} else {
    console.log("NOT FOUND REGEX");
}
