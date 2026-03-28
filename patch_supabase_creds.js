const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'n8n-crm-cannabis-workflow.json');
let content = fs.readFileSync(filePath, 'utf8');

// The old wrong IDs and keys
const oldId = "dvvfdsaqvcyftaaronhd";
const oldKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2dmZkc2FxdmN5ZnRhYXJvbmhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MDAzMzksImV4cCI6MjA4NzQ3NjMzOX0.u6LeadPF3nqYq3Rb09ykVN_9Gbf80VCcWc8nEYwmJgk";

// The new correct IDs and keys
const newId = "opnjrzixsrizdnphbjnq";
const newKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wbmpyeml4c3JpemRucGhiam5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1Nzc2NTAsImV4cCI6MjA4ODE1MzY1MH0.Hx6t3ZFZj6TGei8c99bfdwUfJ1ce5XaGM4IuUBJUeC8";

// Also check for any variations in length or prefixes if necessary, but string replace should work
console.log(`Replacing ${oldId} with ${newId}`);
content = content.split(oldId).join(newId);

console.log(`Replacing old key with new key`);
content = content.split(oldKey).join(newKey);

// Special case: check if there are other keys or variants
// But we'll start with this.

fs.writeFileSync(filePath, content, 'utf8');
console.log('Workflow patched with correct Supabase credentials.');
