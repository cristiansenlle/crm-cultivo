const fs = require('fs');

function parseFlatted(txt) {
    if (!txt) return null;
    const lines = txt.split('\\n');
    for (const line of lines) {
        if (!line.includes('|[')) continue;
        const id = line.split('|')[0];
        const jsonStr = line.substring(id.length + 1);
        try {
            const arr = JSON.parse(jsonStr);
            if (!Array.isArray(arr)) continue;
            
            console.log(`\n========= EXECUTION ${id} =========`);
            
            // Reconstruct the flatted object
            function resolve(val) {
                if (typeof val === 'string' && !isNaN(val)) {
                     const idx = parseInt(val, 10);
                     if(idx >= 0 && idx < arr.length) {
                         const ref = arr[idx];
                         // simple prevention for deep infinite loops
                         if(typeof ref === 'string') return ref;
                         // just return its serialized version to avoid memory explosion
                         return `[REF ${idx}]`; 
                     }
                }
                return val;
            }

            // Let's just linearly scan the array for 'consultar_salas' or 'consultar_lotes' or '2de32401'
            for(let i=0; i<arr.length; i++) {
                const item = arr[i];
                if (typeof item === 'string') {
                    if (item.includes('Planta Madre') || item.includes('2de32401')) {
                         console.log(`[String ${i}]:`, item);
                    }
                } else if (item && typeof item === 'object') {
                    const str = JSON.stringify(item);
                    if (str.includes('Planta Madre') || str.includes('2de32401')) {
                         console.log(`[Object ${i}]:`, str);
                    }
                }
            }
        } catch(e) {
             console.log("Error line:", e.message);
        }
    }
}

parseFlatted(fs.readFileSync('latest_execs.txt', 'utf8'));
