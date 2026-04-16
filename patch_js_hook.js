const fs = require('fs');
const jsPath = 'c:/Users/Cristian/.gemini/antigravity/crm cannabis/cultivo.js';

let js = fs.readFileSync(jsPath, 'utf8');

const anchor = `        const roomsRes = await window.sbClient.from('core_rooms').select('id, name');
        if (roomsRes && roomsRes.data) {
            roomsRes.data.forEach(room => {
                coreRoomsMap[room.id] = room.name;
            });
        }`;
const replacement = `        const roomsRes = await window.sbClient.from('core_rooms').select('id, name');
        if (roomsRes && roomsRes.data) {
            roomsRes.data.forEach(room => {
                coreRoomsMap[room.id] = room.name;
            });
            if (typeof populateLocationSelects === 'function') {
                populateLocationSelects();
            }
        }`;

if(js.includes(anchor)){
    js = js.replace(anchor, replacement);
    fs.writeFileSync(jsPath, js, 'utf8');
    console.log("HOOK PATCHED");
} else {
    console.log("HOOK TARGET NOT FOUND");
}
