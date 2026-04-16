
const fs = require('fs');
const workflows = JSON.parse(fs.readFileSync('/root/export2.json', 'utf8'));
const wf = Array.isArray(workflows) ? workflows[0] : workflows;
let found = false;
for (const n of wf.nodes) {
    const str = JSON.stringify(n);
    if (str.includes('11111111')) {
        console.log("FOUND IN NODE:", n.name, n.type);
        found = true;
    }
}
if (!found) {
    console.log("Not found in any node in export2.json!");
}
