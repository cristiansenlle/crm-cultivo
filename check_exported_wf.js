const fs = require('fs');
try {
    const wf = JSON.parse(fs.readFileSync('/opt/crm-cannabis/exported_wf.json', 'utf8'));
    const content = JSON.stringify(wf);
    const debug = content.includes('[DEBUG-PATCHED]');
    const roomId = content.includes('room_id');
    const nodesCount = wf.nodes ? wf.nodes.length : 0;
    
    // Check for specific mapping logic
    const tool = wf.nodes.find(n => n.name === 'cargar_telemetria');
    const mapping = tool ? JSON.stringify(tool.parameters) : 'NOT FOUND';

    console.log(JSON.stringify({ 
        debug, 
        roomId, 
        nodesCount,
        hasMapping: mapping.includes('2de32401-cb5f-4bbd-9b67-464aa703679c')
    }, null, 2));
} catch (err) {
    console.error('Check failed:', err.message);
}
