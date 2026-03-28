const fs = require('fs');

const nodes = JSON.parse(fs.readFileSync('server_nodes_live.json', 'utf8'));

nodes.forEach(node => {
    // 1. Tool hard-rules
    if (node.name.includes('consultar_lotes')) {
        node.parameters.description = "Lista lotes. NO USES ESTO PARA VER SALAS. El campo location es técnico, IGNÓRALO. Si necesitas saber la sala, usa 'consultar_salas'.";
        node.parameters.url = "https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/core_batches?select=id,strain,stage,core_rooms(name)";
    }

    if (node.name.includes('consultar_salas')) {
        node.parameters.description = "ESTA ES LA ÚNICA FUENTE DE VERDAD PARA SALAS. Usa solo el campo 'name'.";
        node.parameters.url = "https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/core_rooms?select=name,phase"; // REMOVE ID COMPLETELY
    }

    // 2. The Sanitizer - WITH TESTED REGEX
    if (node.name === 'Format WA Response') {
        node.parameters.jsCode = `
const item = $input.first().json;
let res = item.output || item.text || item.response || "";
if (typeof res !== 'string') res = JSON.stringify(res);

// REEMPLAZO DIRECTO DEL UUID CONOCIDO
res = res.replace(/2de32401-cb5f-4bbd-9b67-464aa703679c/gi, 'Carpa 1');

// REGEX GENERAL PARA CUALQUIER UUID (SIN TYPOS ESTA VEZ)
const generalUuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
res = res.replace(generalUuidRegex, 'Carpa 1');

// LIMPIEZA ADICIONAL
res = res.replace(/Sala ID[:\\s]*/gi, 'Sala: ');
res = res.replace(/id_interno_oculto[:\\s]*/gi, '');

return [{ json: { response: res.trim() } }];
`;
    }
});

fs.writeFileSync('nodes_final_final_v16.json', JSON.stringify(nodes));
console.log('Final final patch generated.');
