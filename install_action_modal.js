const fs = require('fs');

let html = fs.readFileSync('cultivo.html', 'utf8');

const modalHtml = `
    <!-- Modal Acciones de Sala (HUD) -->
    <div class="emergency-overlay" id="modal-room-action" style="display: none; background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); align-items:center; justify-content:center; z-index: 3000;">
        <div class="alert-box glass-panel" style="border: 1px solid rgba(255, 255, 255, 0.1); background: var(--panel-dark); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); text-align: left; max-width: 500px; width: 95%; padding: 30px; border-radius: 20px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h2 id="ram-title" style="margin:0; font-size:1.4rem; font-weight: 800; display:flex; align-items:center; gap:12px;">
                    <i class="ph-fill ph-drop"></i> Tarea de Sala
                </h2>
                <button class="glass-btn" style="border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; border: none;" onclick="document.getElementById('modal-room-action').style.display='none'">
                    <i class="ph ph-x" style="font-size: 1.2rem;"></i>
                </button>
            </div>
            
            <input type="hidden" id="roomActionType">
            
            <!-- Seleccionador Multi Lote -->
            <div style="margin-bottom: 20px;">
                <label style="font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); text-transform: uppercase;">Lotes a afectar:</label>
                <div id="roomActionBatchList" style="display: flex; flex-direction: column; gap: 8px; max-height: 150px; overflow-y: auto; background: rgba(0,0,0,0.1); padding: 10px; border-radius: 8px; margin-top: 10px; border: 1px solid rgba(255,255,255,0.05);">
                </div>
            </div>

            <!-- Formularios Dinamizados -->
            <div id="ram-nutricion-fields" style="display:none;">
                <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px;">
                    <label style="font-size: 0.75rem; color: var(--text-secondary); text-transform:uppercase;">Producto Nutricional (Bodega)</label>
                    <select id="ram-nutri-prod" style="width:100%; padding:10px; border-radius:8px; background:var(--bg-dark); color:var(--text-primary); border:1px solid rgba(255,255,255,0.1);"></select>
                    
                    <div style="display: flex; gap: 10px;">
                        <div style="flex:1;"><label style="font-size:0.75rem; color: var(--text-secondary);">Dosis (mL /g)</label><input type="number" id="ram-nutri-qty" placeholder="0" style="width:100%; padding:10px; background:var(--bg-dark); border:1px inset rgba(255,255,255,0.1); border-radius:6px; color:#fff;"></div>
                        <div style="flex:1;"><label style="font-size:0.75rem; color: var(--text-secondary);">Agua (L)</label><input type="number" step="0.1" id="ram-nutri-water" placeholder="Ej: 5" style="width:100%; padding:10px; background:var(--bg-dark); border:1px inset rgba(255,255,255,0.1); border-radius:6px; color:#fff;"></div>
                        <div style="flex:1.5;"><label style="font-size:0.75rem; color: var(--text-secondary);">EC/pH</label><input type="text" id="ram-nutri-ph" placeholder="Ej: 2.0/6.0" style="width:100%; padding:10px; background:var(--bg-dark); border:1px inset rgba(255,255,255,0.1); border-radius:6px; color:#fff;" class="font-mono"></div>
                    </div>
                    <small style="color:var(--text-muted);">* La dosis se descontará del inventario MULTIPLICADO por la cantidad de lotes tildados arriba.</small>
                </div>
            </div>

            <div id="ram-ipm-fields" style="display:none;">
                <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px;">
                    <label style="font-size: 0.75rem; color: var(--text-secondary); text-transform:uppercase;">Prevención / Producto</label>
                    <select id="ram-ipm-prod" style="width:100%; padding:10px; border-radius:8px; background:var(--bg-dark); color:var(--text-primary); border:1px solid rgba(255,255,255,0.1);"></select>
                    
                    <div style="display: flex; gap: 10px; align-items:center;">
                        <input type="number" id="ram-ipm-qty" placeholder="Dosis (mL/g)" style="flex:1; padding:10px; background:var(--bg-dark); border:1px inset rgba(255,255,255,0.1); border-radius:6px; color:#fff;">
                        <label style="flex:1; font-size:0.8rem; color:var(--text-secondary); display:flex; align-items:center; gap:5px;"><input type="checkbox" id="ram-ipm-cal" checked> Agendar Recordatorio GCalendar (15d)</label>
                    </div>
                </div>
            </div>

            <div id="ram-poda-fields" style="display:none;">
                <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px;">
                    <label style="font-size: 0.75rem; color: var(--text-secondary); text-transform:uppercase;">Intervención Física</label>
                    <select id="ram-poda-type" style="width:100%; padding:10px; border-radius:8px; background:var(--bg-dark); color:var(--text-primary); border:1px solid rgba(255,255,255,0.1);">
                        <option>Poda Apical (Topping)</option>
                        <option>Defoliación Bajos</option>
                        <option>Trellising (Red)</option>
                        <option>Limpieza General</option>
                    </select>
                    
                    <label style="font-size:0.8rem; color:var(--text-secondary); display:flex; align-items:center; gap:5px; margin-top:10px;"><input type="checkbox" id="ram-poda-cal" checked> Agendar Revisión GCalendar (48hs)</label>
                </div>
            </div>

            <button class="glass-btn font-mono" style="width: 100%; padding:15px; border-radius: 14px; font-weight: 700; font-size: 1rem; display: flex; align-items: center; justify-content: center; gap: 10px; background: rgba(5, 150, 105, 0.2); border: 1px solid var(--color-green); color: var(--color-green);" onclick="submitRoomAction()">
                <i class="ph ph-check-circle" style="font-size: 1.2rem;"></i> CONFIRMAR REGISTRO
            </button>
        </div>
    </div>

    <!-- Modal Reporte Evento Agronómico (Rediseñado) -->
`;

if (!html.includes('id="modal-room-action"')) {
    html = html.replace('<!-- Modal Reporte Evento Agronómico (Rediseñado) -->', modalHtml);
    fs.writeFileSync('cultivo.html', html);
    console.log('Action modal successfully injected.');
} else {
    console.log('Modal already exists.');
}
