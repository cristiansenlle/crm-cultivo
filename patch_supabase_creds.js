const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'n8n-crm-cannabis-workflow.json');
let content = fs.readFileSync(filePath, 'utf8');

// The old wrong IDs and keys
const oldId = "dvvfdsaqvcyftaaronhd";
const oldKey = "HIDDEN_SECRET_BY_AI";

// The new correct IDs and keys
const newId = "opnjrzixsrizdnphbjnq";
const newKey = "HIDDEN_SECRET_BY_AI";

// Also check for any variations in length or prefixes if necessary, but string replace should work
console.log(`Replacing ${oldId} with ${newId}`);
content = content.split(oldId).join(newId);

console.log(`Replacing old key with new key`);
content = content.split(oldKey).join(newKey);

// Special case: check if there are other keys or variants
// But we'll start with this.

fs.writeFileSync(filePath, content, 'utf8');
console.log('Workflow patched with correct Supabase credentials.');
