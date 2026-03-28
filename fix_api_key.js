const fs = require('fs');
const f = 'C:/Users/Cristian/.gemini/antigravity/crm cannabis/n8n-crm-cannabis-workflow.json';
const wf = JSON.parse(fs.readFileSync(f, 'utf8'));

const OLD_KEY = 'sbp_26b273690ba8b9aebca57a19a9fb6dc3e9cc9089';
const ANON_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2dmZkc2FxdmN5ZnRhYXJvbmhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MDAzMzksImV4cCI6MjA4NzQ3NjMzOX0.u6LeadPF3nqYq3Rb09ykVN_9Gbf80VCcWc8nEYwmJgk';

// Replace every occurrence of the old publishable key with the JWT anon key
const raw = fs.readFileSync(f, 'utf8');
const updated = raw.split(OLD_KEY).join(ANON_JWT);
const count = (raw.match(new RegExp(OLD_KEY.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;

fs.writeFileSync(f, updated);
console.log(`Done. Replaced ${count} occurrences of sbp_ key with the correct JWT anon key.`);

// Verify
const verify = JSON.parse(fs.readFileSync(f, 'utf8'));
const tools = verify.nodes.filter(n => n.type === '@n8n/n8n-nodes-langchain.toolHttpRequest');
let ok = 0, bad = 0;
tools.forEach(t => {
    const headers = t.parameters.parametersHeaders?.values || [];
    const hasAnon = headers.some(h => h.value === ANON_JWT);
    const hasOld = headers.some(h => h.value === OLD_KEY);
    if (hasAnon && !hasOld) ok++;
    else if (hasOld) bad++;
});
console.log(`Tools with correct JWT: ${ok}, Tools still with old key: ${bad}`);
