const fs = require('fs');
const path = require('path');

const filesToPatch = [
    'index.html',
    'pos.html',
    'cultivo.html',
    'tareas.html',
    'insumos.html',
    'analytics.html',
    'agronomy.html'
];

const newLink = '<a href="protocolos.html" class="nav-item"><i class="ph ph-book-open"></i> Protocolos & Recetas</a>';

for (const file of filesToPatch) {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) {
        console.warn(`File not found: ${file}`);
        continue;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if already patched
    if (content.includes('protocolos.html')) {
        console.log(`Already patched: ${file}`);
        continue;
    }

    // Find the end of the nav-menu
    const agronomyLinkIndex = content.indexOf('<a href="agronomy.html"');
    if (agronomyLinkIndex !== -1) {
        // Find the end of the agronomy link
        const endOfAgronomyLink = content.indexOf('</a>', agronomyLinkIndex) + 4;
        
        // Insert the new link after agronomy link
        content = content.slice(0, endOfAgronomyLink) + '\n                ' + newLink + content.slice(endOfAgronomyLink);
        
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Successfully patched: ${file}`);
    } else {
        console.warn(`Could not find agronomy link in: ${file}`);
    }
}
