const fs = require('fs');
const path = require('path');

const dir = __dirname;
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

let found = false;

for (const file of files) {
    if(file === 'package.json' || file === 'package-lock.json') continue;
    try {
        const content = fs.readFileSync(path.join(dir, file), 'utf8');
        if (!content.match(/whatsApp/i)) continue;
        const data = JSON.parse(content);
        
        let nodesToSearch = [];
        if (Array.isArray(data)) nodesToSearch = data;
        else if (data.nodes && Array.isArray(data.nodes)) nodesToSearch = data.nodes;
        else continue;

        const waNodes = nodesToSearch.filter(n => n.type && n.type.includes('whatsApp'));
        if (waNodes.length > 0) {
            console.log(`Found in ${file}:`);
            console.log(JSON.stringify(waNodes, null, 2));
            found = true;
        }
    } catch(e) { /* ignore parse errors */ }
}

if (!found) console.log('No WhatsApp nodes found parsed correctly.');
