const fs = require('fs');
const path = require('path');

const cssFile = path.join(__dirname, 'style.css');
if (fs.existsSync(cssFile)) {
    let cssContent = fs.readFileSync(cssFile, 'utf8');
    // Fix width and margin of theme-toggle
    cssContent = cssContent.replace('width: 100%;\n    margin-top: 0.5rem;', 'width: auto;\n    margin: 0;');
    fs.writeFileSync(cssFile, cssContent);
    console.log("Fixed style.css theme-toggle rules");
}

const files = [
    'index.html', 'cultivo.html', 'tareas.html', 'insumos.html', 
    'pos.html', 'analytics.html', 'agronomy.html', 'protocolos.html'
];

files.forEach(file => {
    let filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) return;
    
    let content = fs.readFileSync(filePath, 'utf8');

    // Remove rogue margin-right: 15px from Theme toggle and Logout buttons
    content = content.replace(/margin-right:\s*15px;/g, '');

    // For pages that lack topbar-controls, they have elements floating directly in <header class="topbar">
    // Wait, let's just make the topbar structured like this:
    // <header class="topbar">
    //   Left side stuff (<h1> or search)
    //   <div class="topbar-controls" style="display:flex; gap:15px; align-items:center;"> (all the buttons and profile) </div>
    // </header>
    
    // Check if topbar-controls exists
    if (!content.includes('topbar-controls')) {
        // Find everything from the Theme Button to the user-profile closing div
        const match = content.match(/(<button id="themeToggleBtn"[\s\S]*?)(<\/header>)/);
        if (match) {
            const buttonsBlock = match[1];
            const newBlock = `
                <div class="topbar-controls" style="display: flex; gap: 15px; align-items: center; justify-content: flex-end; flex: 1;">
                    ${buttonsBlock.trim()}
                </div>\n            `;
            content = content.replace(buttonsBlock, newBlock);
            fs.writeFileSync(filePath, content);
            console.log(`Wrapped topbar controls in ${file}`);
        }
    } else {
        // Just make sure it looks neat and removed the margins
        fs.writeFileSync(filePath, content);
        console.log(`Cleaned up margins in ${file}`);
    }
});
