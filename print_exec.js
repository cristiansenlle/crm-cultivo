const fs = require('fs');

try {
    const raw = fs.readFileSync('exec_88.json', 'utf8');
    const nodes = raw.match(/"node":"(.*?)"/g);
    
    if(nodes) {
        // extracts just the node name
        const unique = [...new Set(nodes)].map(n => n.split('"')[3]);
        console.log('Executed Nodes:', unique);
    } else {
        console.log('No nodes found. Dumping first 100 chars:', raw.substring(0, 100));
    }
} catch(e) {
    console.error(e);
}
