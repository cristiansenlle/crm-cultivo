const fs = require('fs');
const jsPath = 'c:/Users/Cristian/.gemini/antigravity/crm cannabis/cultivo.js';
const htmlPath = 'c:/Users/Cristian/.gemini/antigravity/crm cannabis/cultivo.html';

let js = fs.readFileSync(jsPath, 'utf8');
let html = fs.readFileSync(htmlPath, 'utf8');

// HTML Target
const tH = `                                <select id="cropLocation"
                                    style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #444; background: var(--bg-dark); color: white; margin-top:5px;">
                                    <option value="sala-veg-1">Sala Veg 1</option>
                                    <option value="sala-flo-1">Sala Floración 1</option>
                                    <option value="sala-flo-2">Sala Floración 2</option>
                                </select>`;
const rH = `                                <select id="cropLocation"
                                    style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #444; background: var(--bg-dark); color: white; margin-top:5px;">
                                    <!-- Las salas se cargarán orgánicamente desde core_rooms -->
                                    <option value="sala-veg-1">Vegetativo (Fallback)</option>
                                </select>`;
html = html.replace(tH, rH);

// JS Target (Inside loadBatches)
const tJS1 = `        // Load custom room names from core_rooms
        const roomsRes = await window.sbClient.from('core_rooms').select('id, name');
        if (roomsRes && roomsRes.data) {
            roomsRes.data.forEach(room => {
                coreRoomsMap[room.id] = room.name;
            });
        }`;
const rJS1 = `        // Load custom room names from core_rooms
        const roomsRes = await window.sbClient.from('core_rooms').select('id, name');
        if (roomsRes && roomsRes.data) {
            roomsRes.data.forEach(room => {
                coreRoomsMap[room.id] = room.name;
            });
            populateLocationSelects(); // Inyectar dinámicamente salas al form
        }`;
js = js.replace(tJS1, rJS1);

// Append the helper function at the bottom of the file
const helperFn = `

// DOM Injector para selectores de ubicación base
function populateLocationSelects() {
    const locSelect = document.getElementById('cropLocation');
    if (!locSelect) return;
    
    const loadedRooms = Object.keys(coreRoomsMap);
    if (loadedRooms.length > 0) {
        let optionsHtml = '';
        loadedRooms.forEach(roomId => {
            optionsHtml += \`<option value="\${roomId}">\${coreRoomsMap[roomId]}</option>\`;
        });
        locSelect.innerHTML = optionsHtml;
    }
}
`;
if (!js.includes('populateLocationSelects() {')) {
    js += helperFn;
}

fs.writeFileSync(jsPath, js, 'utf8');
fs.writeFileSync(htmlPath, html, 'utf8');
console.log("Loc Patch Applied");
