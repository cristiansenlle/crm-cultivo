const fs = require('fs');

const data = JSON.parse(fs.readFileSync('pulled_wf.json', 'utf8'));

let modified = false;
data.nodes.forEach(node => {
    // Buscar Conditiones boolean / string del IF
    if (node.type === 'n8n-nodes-base.if' || node.type === 'n8n-nodes-base.switch') {
        let str = JSON.stringify(node);
        if (str.includes('54911') || str.includes('1160351586') || str.includes('541160351586')) {
            console.log("Encontrado Celular Viejo en nodo:", node.name);
            // Hacer reeplazo regex agresivo para atrapar la config antigua
            str = str.replace(/5491160351586/g, '5491156548820');
            str = str.replace(/1160351586/g, '1156548820');
            val = JSON.parse(str);
            // Replace in array
            Object.assign(node, val);
            modified = true;
        } else if (str.toLowerCase().includes('remotejid')) {
            console.log("Nodo que usa remoteJid (WhatsApp API):", node.name);
            // Si el condition value2 dice algo, parchear.
             if (node.parameters && node.parameters.conditions && node.parameters.conditions.string) {
                 node.parameters.conditions.string.forEach(cond => {
                     if(cond.value1 && cond.value1.includes('remoteJid')) {
                         console.log("OLD condicion:", cond.value2);
                         cond.value2 = "5491156548820@s.whatsapp.net"; // Format de Baileys / WWebJS
                         console.log("NEW condicion:", cond.value2);
                         modified = true;
                     }
                 });
             }
        }
    }
});

if (modified) {
    fs.writeFileSync('patched_wf.json', JSON.stringify(data, null, 2));
    console.log("Guardado parche local patched_wf.json");
} else {
    console.log("NO SE ENCONTRÓ NADA QUE PARCHEAR");
    // Volcar todos los IFs para ver
    data.nodes.filter(n => n.type.includes('if') || n.type.includes('switch')).forEach(n => {
       console.log(JSON.stringify(n.parameters, null, 2)); 
    });
}
