const fs = require('fs');
const jsPath = 'c:/Users/Cristian/.gemini/antigravity/crm cannabis/cultivo.js';

let js = fs.readFileSync(jsPath, 'utf8');
let lines = js.split('\n');

// Line 66:             roomsRes.data.forEach(room => {
// Line 67:                 coreRoomsMap[room.id] = room.name;
// Line 68:             });
// We will insert after line 68.

let inserted = false;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('coreRoomsMap[room.id] = room.name;')) {
        // next line is `            });`
        lines.splice(i + 2, 0, `            if (typeof populateLocationSelects === 'function') { populateLocationSelects(); }`);
        inserted = true;
        break;
    }
}

if (inserted) {
    fs.writeFileSync(jsPath, lines.join('\n'), 'utf8');
    console.log("Hook inserted successfully!");
} else {
    console.log("Anchor not found!");
}
