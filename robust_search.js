const fs = require('fs');
const path = require('path');

const dir = __dirname;
const files = fs.readdirSync(dir)
    .filter(f => f.endsWith('.json') && f !== 'package.json' && f !== 'package-lock.json')
    .map(f => ({ name: f, time: fs.statSync(path.join(dir, f)).mtime.getTime() }))
    .sort((a, b) => b.time - a.time)
    .slice(0, 15);

console.log('Searching top 15 recent JSON files for WhatsApp nodes...');

for (const fileObj of files) {
    const file = fileObj.name;
    try {
        let content = fs.readFileSync(path.join(dir, file), 'utf8');
        
        // Clean up potential concatenated JSON objects
        if (content.trim().startsWith('{') && content.includes('}{')) {
            content = '[' + content.replace(/\}\{/g, '},{') + ']';
        }

        const data = JSON.parse(content);
        
        let nodesToSearch = [];
        if (Array.isArray(data)) {
            nodesToSearch = data;
        } else if (data.nodes && Array.isArray(data.nodes)) {
            nodesToSearch = data.nodes;
        } else if (data.data && data.data.nodes && Array.isArray(data.data.nodes)) {
            nodesToSearch = data.data.nodes;
        }

        const waNodes = nodesToSearch.filter(n => n.type && n.type.toLowerCase().includes('whatsapp'));
        if (waNodes.length > 0) {
            console.log(`\n=== Found in ${file} ===`);
            console.log(JSON.stringify(waNodes, null, 2));
        }

    } catch (e) {
        console.log(`Error parsing ${file}: ${e.message}`);
    }
}
