const fs = require('fs');

const data = JSON.parse(fs.readFileSync('active_wf_extracted.json', 'utf8'));

let patchedCount = 0;
data.nodes.forEach(n => {
    if (n.type.includes('agent') || n.name.toLowerCase().includes('agent')) {
        if (n.parameters && n.parameters.options && n.parameters.options.systemMessage) {
            let msg = n.parameters.options.systemMessage;

            // Remove bad lines suggesting LOTE-A01 for fuzzy matches
            msg = msg.replace(/• Tarea obligatoria: Hacé "fuzzy matching" o autocompletado en tu mente SIEMPRE. Si la base de datos dice "LOTE-A01" \(en sala-veg-1\) y el usuario dice "Trips en lote 1", vos usás inteligentemente "LOTE-A01". Si el usuario dice "sala veg 1", vos lo transformás a "sala-veg-1"./g, 
                "• Tarea obligatoria: Hacé 'fuzzy matching' o autocompletado, pero NUNCA inventes IDs. Si la base de datos devuelve 'Planta madre NP/2/2025' y el usuario dice 'madre 2', usás EXACTAMENTE 'Planta madre NP/2/2025'. NUNCA inventes códigos como 'LOTE-123' a menos que consultar_lotes devuelva exactamente ese código.");

            // Add strict generic warning
            if (!msg.includes("REGLAS DE INTEGRIDAD DE LOTES")) {
                const rulesAdd = `
━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ REGLAS DE INTEGRIDAD DE LOTES (CRÍTICO)
━━━━━━━━━━━━━━━━━━━━━━━━
• NUNCA inventes nombres de lotes ni uses IDs como "LOTE-1", "LOTE-XXXX", "LOTE-A01" si no existen.
• SIEMPRE debés usar el ID exacto que devuelve el tool consultar_lotes_groq (ej: "Planta madre NP/2/2025").
• Si el usuario menciona un lote/planta y no tenés la lista exacta en memoria, EJECUTÁ consultar_lotes_groq silenciosamente ANTES de proceder a registrar el evento.
• Si ejecutas reportar_evento_agronomico con un batch_id inventado, rompes todo el sistema y el historial fallará groseramente.`;
                
                msg = msg.replace("━━━━━━━━━━━━━━━━━━━━━━━━\n⚠️ REGLAS DE INTEGRIDAD DE SALAS (CRÍTICO)", rulesAdd + "\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n⚠️ REGLAS DE INTEGRIDAD DE SALAS (CRÍTICO)");
            }

            // Fix the generic rule in "REGLAS ANTI-CRASH"
            msg = msg.replace(/• Si te falta el lote exacto \(batch_id\), PREGUNTALE PRIMERO al usuario en lenguaje natural: "¿A qué lote te referís de la sala 1\?". ¡No ejecutes el tool de carga hasta que el usuario te responda con el dato faltante! ¡Si ejecutas el tool incompleto el servidor explota!/g, 
                "• Si te falta el lote exacto, LLAMÁ PRIMERO a consultar_lotes_groq para ver las opciones válidas. Luego, si aún hay dudas, preguntale al usuario ofreciéndole esas opciones exactas. ¡Si ejecutas el tool con un ID inventado el sistema colapsará!");

            n.parameters.options.systemMessage = msg;
            patchedCount++;
        }
    }
});

if (patchedCount > 0) {
    fs.writeFileSync('active_wf_patched.json', JSON.stringify(data, null, 2));
    console.log("Successfully patched system prompt into active_wf_patched.json");
} else {
    console.log("Could not find the system prompt to patch.");
}
