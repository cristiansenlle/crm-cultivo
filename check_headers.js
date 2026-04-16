const fs = require('fs');

const files = ['index.html', 'pos.html', 'agronomy.html'];

files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const match = content.match(/<header class="topbar">[\s\S]*?<\/header>/);
    console.log(`\n=== ${file} ===\n`);
    if(match) console.log(match[0]);
    else console.log('NO HEADER FOUND!');
});
