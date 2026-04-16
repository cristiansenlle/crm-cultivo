const fs = require('fs');
const path = require('path');
const dir = __dirname;
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

files.forEach(file => {
    const fPath = path.join(dir, file);
    let original = fs.readFileSync(fPath, 'utf8');
    let content = original;

    // Remove the orphaned </div> right before </aside> exactly
    content = content.replace(/<\/div>(\s*)<\/aside>/g, '$1</aside>');

    if (content !== original) {
        fs.writeFileSync(fPath, content);
        console.log(`Orphaned </div> fixed in ${file}`);
    }
});

// Fix pos.html specifically
let posPath = path.join(dir, 'pos.html');
let posContent = fs.readFileSync(posPath, 'utf8');

if (!posContent.includes('Protocolos & Recetas')) {
    // We target the Timeline Agronomico line and add Protocolos after it
    const searchStr = '<a href="agronomy.html" class="nav-item"><i class="ph ph-projector-screen-chart"></i> Timeline Agronómico</a>';
    const replaceStr = '<a href="agronomy.html" class="nav-item"><i class="ph ph-projector-screen-chart"></i> Timeline Agronómico</a>\n                <a href="protocolos.html" class="nav-item"><i class="ph ph-book-open"></i> Protocolos & Recetas</a>';
    
    posContent = posContent.replace(searchStr, replaceStr);
    
    // Also try checking the line break version if "Timeline Agronómico" was preserved with line break
    const searchStr2 = '<a href="agronomy.html" class="nav-item"><i class="ph ph-projector-screen-chart"></i> Timeline\n                    Agronómico</a>';
    posContent = posContent.replace(searchStr2, replaceStr);
    
    fs.writeFileSync(posPath, posContent);
    console.log('Appended Protocolos & Recetas link to pos.html');
}
