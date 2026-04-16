const fs = require('fs');
const jsPath = 'c:/Users/Cristian/.gemini/antigravity/crm cannabis/cultivo.js';

let js = fs.readFileSync(jsPath, 'utf8');

const t1 = `            weightDry: b.weight_dry,
            lightHours: b.light_hours,
            darkHours: b.dark_hours
        }));`;

const r1 = `            weightDry: b.weight_dry,
            lightHours: b.light_hours,
            darkHours: b.dark_hours,
            numPlants: b.num_plants || 0
        }));

        for (let bat of batches) {
            try {
                const { data: evs } = await window.sbClient.from('core_agronomic_events').select('total_cost').eq('batch_id', bat.id);
                bat.accumulatedCost = (evs || []).reduce((sum, ev) => sum + (parseFloat(ev.total_cost) || 0), 0);
            } catch (e) {
                bat.accumulatedCost = 0;
            }
        }`;

// Standardize search
const idx = js.indexOf('darkHours: b.dark_hours\n        }));');
const idx2 = js.indexOf('darkHours: b.dark_hours\r\n        }));');

if (idx > -1) {
    js = js.replace('darkHours: b.dark_hours\n        }));', r1);
    console.log("Patched LF");
} else if (idx2 > -1) {
    js = js.replace('darkHours: b.dark_hours\r\n        }));', r1);
    console.log("Patched CRLF");
} else {
    console.log("Target not found");
}

fs.writeFileSync(jsPath, js, 'utf8');
console.log("Completed");
