const fs = require('fs');
const data = JSON.parse(fs.readFileSync('execution_data_trace.json', 'utf8'));

console.log("Searching flatted JSON for 11111111...");
for (let i = 0; i < data.length; i++) {
    if (typeof data[i] === 'string' && data[i].includes('11111111')) {
        console.log('\n--- INDEX:', i, '---');
        console.log(data[i]);
    }
}
