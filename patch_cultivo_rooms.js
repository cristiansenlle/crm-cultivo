const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'cultivo.js');
let content = fs.readFileSync(filePath, 'utf8');

// Replacement 1
content = content.replace(
    "let batches = [];\r\nlet nutritionProducts = [];",
    "let batches = [];\r\nlet coreRoomsMap = {};\r\nlet nutritionProducts = [];"
).replace(
    "let batches = [];\nlet nutritionProducts = [];",
    "let batches = [];\nlet coreRoomsMap = {};\nlet nutritionProducts = [];"
);

// Replacement 2 (loadBatches)
const loadBatchesTarget = `            darkHours: b.dark_hours
        }));

        renderBatches();`;
        
const loadBatchesReplacement = `            darkHours: b.dark_hours
        }));

        // Load custom room names from core_rooms
        const roomsRes = await window.sbClient.from('core_rooms').select('id, name');
        if (roomsRes && roomsRes.data) {
            roomsRes.data.forEach(room => {
                coreRoomsMap[room.id] = room.name;
            });
        }

        renderBatches();`;
        
content = content.replace(loadBatchesTarget.replace(/\n/g, '\r\n'), loadBatchesReplacement.replace(/\n/g, '\r\n'))
                 .replace(loadBatchesTarget, loadBatchesReplacement);


// Replacement 3 (renderBatches location)
const locationTarget = `        // Mapear location dinámicamente o usar el original
        const roomNameMap = {
            'sala-veg-1': "Sala Veg 1",
            'sala-flo-1': "Sala Floración 1",
            'sala-flo-2': "Sala Floración 2"
        };
        let roomName = roomNameMap[b.location] || b.location;`;
        
const locationReplacement = `        // Priorities: 1. DB Custom Room Name, 2. Default hardcoded mapping, 3. Raw Location String (UUID)
        const defaultRoomNameMap = {
            'sala-veg-1': "Sala Veg 1",
            'sala-flo-1': "Sala Floración 1",
            'sala-flo-2': "Sala Floración 2"
        };
        let roomName = coreRoomsMap[b.location] || defaultRoomNameMap[b.location] || b.location;`;
        
content = content.replace(locationTarget.replace(/\n/g, '\r\n'), locationReplacement.replace(/\n/g, '\r\n'))
                 .replace(locationTarget, locationReplacement);


// Replacement 4 (Modal Options)
const modalTarget = `    const locSelect = document.getElementById('editBatchLocation');
    locSelect.innerHTML = \`
        <option value="sala-veg-1">Sala Veg 1</option>
        <option value="sala-flo-1">Sala Floración 1</option>
        <option value="sala-flo-2">Sala Floración 2</option>
    \`;
    // If the location is custom, inject it as an option so it's not lost
    if (!['sala-veg-1', 'sala-flo-1', 'sala-flo-2'].includes(batch.location)) {
        locSelect.innerHTML += \`<option value="\${batch.location}">\${batch.location}</option>\`;
    }
    locSelect.value = batch.location || 'sala-veg-1';`;
    
const modalReplacement = `    const locSelect = document.getElementById('editBatchLocation');
    // Generar dinámicamente las opciones basadas en las salas descargadas
    let optionsHtml = '';
    const loadedRooms = Object.keys(coreRoomsMap);
    
    if (loadedRooms.length > 0) {
        loadedRooms.forEach(roomId => {
            optionsHtml += \`<option value="\${roomId}">\${coreRoomsMap[roomId]}</option>\`;
        });
    } else {
        // Fallback robusto por defecto
        optionsHtml = \`
            <option value="sala-veg-1">Sala Veg 1</option>
            <option value="sala-flo-1">Sala Floración 1</option>
            <option value="sala-flo-2">Sala Floración 2</option>
        \`;
    }

    // Agregar la locación actual si por caso extraño no está en la base ni en el fallback
    if (!loadedRooms.includes(batch.location) && !['sala-veg-1', 'sala-flo-1', 'sala-flo-2'].includes(batch.location)) {
        optionsHtml += \`<option value="\${batch.location}">\${coreRoomsMap[batch.location] || batch.location}</option>\`;
    }

    locSelect.innerHTML = optionsHtml;
    locSelect.value = batch.location || (loadedRooms.length > 0 ? loadedRooms[0] : 'sala-veg-1');`;

content = content.replace(modalTarget.replace(/\n/g, '\r\n'), modalReplacement.replace(/\n/g, '\r\n'))
                 .replace(modalTarget, modalReplacement);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Patches applied successfully.");
