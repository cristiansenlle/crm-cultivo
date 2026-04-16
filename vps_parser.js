
const fs = require('fs');
const { parse, stringify } = require('/usr/lib/node_modules/n8n/node_modules/flatted');
const txt = fs.readFileSync('THE_NEWEST_exe_trace.json', 'utf8');
const exe = parse(txt);
for(const [name, runs] of Object.entries(exe.resultData.runData)) {
    if (name.includes('lote')) {
        console.log('--- NODE:', name);
        console.log(stringify(runs[0].data.main, null, 2).substring(0, 1500));
    }
}
    