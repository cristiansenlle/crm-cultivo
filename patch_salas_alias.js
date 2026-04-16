const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

// THE ROOT CAUSE: consultar_salas was returning `id,name,phase`
// The AI reads the `id` UUID and then shows it to the user.
// Fix: select only `name,phase` from core_rooms. 
// But we ALSO keep a separate, internal tool step for cargar_telemetria 
// via the existing consultar_salas_for_uuid sub-step which the prompt already handles.
// 
// ACTUALLY, the real issue: the AI *needs* the UUID internally to log telemetry.
// Solution: use a DIFFERENT query for the listing tool vs the UUID-fetch tool.
// Since we only have one consultar_salas node, we REMOVE id from the response
// and rely on the prompt instructing the AI to call consultar_salas again at log time.
// The AI will get name+phase in the list response, but when it needs to log telemetry
// it calls consultar_salas again and gets name+phase (NO UUID!)
// That's a problem - we need the UUID for POST requests.
//
// BEST SOLUTION: Keep `id` in the API but add EXPLICIT system-prompt instructions 
// to NEVER show the `id` field to the user in text responses.
// The existing prompt already says this but the LLM ignores it.
//
// NUCLEAR OPTION: Remove `id` from select, and have the cargar_telemetria tool 
// do a lookup by name internally using a Supabase function.
// OR: Use Supabase RPC that accepts name and returns nothing (UUID looked up server-side).
//
// SIMPLEST REAL FIX: Keep id in select (so AI can use it for POST), but add
// a RESPONSE FORMAT instruction at the TOP of the system prompt: 
// "When listing rooms, ONLY show the `name` field. NEVER output `id` in your text."
// This is what we already have and it keeps failing.
//
// TRUE ROOT CAUSE: The AI is using `consultar_salas` (which returns id) as the 
// source of truth for LISTING rooms. Since the data it gets back has an `id` field, 
// it decides to "be helpful" and show it.
//
// DEFINITIVE FIX: We split responsibility:
//   - For LISTING: use a filtered URL with select=name,phase only (user-facing display)
//   - For UUID LOOKUP: inline the lookup in cargar_telemetria POST body using Supabase EQ filter
//
// Implementation: Add `=eq.` filter support to cargar_telemetria endpoint and use 
// a Supabase function or modify the cargar_telemetria URL to do a JOIN by name.
// Actually the CLEANEST approach: 
// - consultar_salas returns ONLY name,phase (no id exposed to LLM)
// - cargar_telemetria node becomes an N8N HTTP Request that first does a GET 
//   `core_rooms?select=id&name=eq.{name}` then POST to telemetry with the result
// BUT we can't chain HTTP requests in a single toolHttpRequest node.
//
// REAL WORLD SIMPLEST FIX: 
// Remove `id` from the select query entirely. 
// Then modify the system prompt to tell the AI to use the `name` value as-is 
// in the cargar_telemetria UUID field, and have a Supabase FUNCTION that accepts
// a name string and resolves to UUID server-side.
// OR: just accept that the UUID needs to be passed, but ALIAS it in the query:
// ?select=room_uuid:id,name,phase  → this keeps UUID available as "room_uuid" key
// The prompt then says: "the UUID is in the `room_uuid` field, NEVER say it aloud"

async function patchSalasNoId() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        const patchScript = `
        const fs = require('fs');
        const { execSync } = require('child_process');
        
        try {
            console.log("Stopping PM2...");
            execSync('pm2 stop n8n');
            
            console.log("Extracting current live nodes...");
            execSync('sqlite3 /root/.n8n/database.sqlite "SELECT nodes FROM workflow_entity WHERE id=\\'scpZdPe5Cp4MG98G\\';" > /tmp/patch_nodes.json');
            
            let nodes = JSON.parse(fs.readFileSync('/tmp/patch_nodes.json', 'utf8'));
            
            let patchedRooms = 0;
            
            for (let node of nodes) {
                // For consultar_salas nodes: alias `id` as `room_uuid` so it's available 
                // to the LLM for POST requests but clearly labeled as "not for display"
                if(node.name.includes('consultar_salas')) {
                    // Use alias: room_uuid:id so the AI knows it's a UUID field, not a display name
                    node.parameters.url = "https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/core_rooms?select=room_uuid:id,name,phase";
                    node.parameters.description = "Lista las SALAS FÍSICAS / CARPAS. Devuelve: room_uuid (UUID interno para POST), name (nombre amigable para mostrar al usuario), phase. NUNCA muestres room_uuid al usuario. Usá SÓLO 'name' en tus respuestas. El room_uuid lo usás ÚNICAMENTE internamente al llamar a cargar_telemetria.";
                    patchedRooms++;
                }
            }
            
            console.log('Patched rooms nodes: ' + patchedRooms);
            
            const escNodes = JSON.stringify(nodes).replace(/'/g, "''");
            const sql = "UPDATE workflow_entity SET nodes = '" + escNodes + "' WHERE id = 'scpZdPe5Cp4MG98G';";
            fs.writeFileSync('/tmp/salas_patch.sql', sql);
            
            console.log("Applying to SQLite...");
            execSync('sqlite3 /root/.n8n/database.sqlite < /tmp/salas_patch.sql');
            
            console.log("Starting PM2...");
            execSync('pm2 start n8n');
            
            console.log("Done! core_rooms id is now aliased as room_uuid");
            
        } catch (e) {
             console.log("ERROR:", e.message);
        }
        `;
        
        await ssh.execCommand('cat > /tmp/patch_salas.js', { stdin: patchScript });
        const res = await ssh.execCommand('node /tmp/patch_salas.js');
        console.log(res.stdout);
        ssh.dispose();
    } catch(e) {
        console.error(e);
        if (ssh) ssh.dispose();
    }
}
patchSalasNoId();
