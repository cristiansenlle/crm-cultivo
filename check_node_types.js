const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('C:/Users/Cristian/.gemini/antigravity/crm cannabis/active_wf_patched.json', 'utf8'));

wf.nodes.forEach(n => {
    if (n.name.includes('consultar_')) {
        console.log(`Node ${n.name}: type=${n.type}, version=${n.typeVersion}`);
    }
});
