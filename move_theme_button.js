const fs = require('fs');
const path = require('path');

const files = [
    'index.html', 'cultivo.html', 'tareas.html', 'insumos.html', 
    'pos.html', 'analytics.html', 'agronomy.html', 'protocolos.html'
];

files.forEach(file => {
    let filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) return;
    
    let content = fs.readFileSync(filePath, 'utf8');

    // Remove the button from the sidebar
    const toggleButtonRegex = /<button id="themeToggleBtn"[\s\S]*?<\/button>\s*/;
    const buttonMatch = content.match(toggleButtonRegex);
    
    if (buttonMatch) {
        let extractedButton = buttonMatch[0].trim();
        
        // Remove button from sidebar
        content = content.replace(toggleButtonRegex, '');

        // Now inject it into the topbar right before the 'logout' or user profile element
        // There's a div with <div class="topbar-controls">...
        // We can just append it right before the logout button:
        // "<button class=\"btn-icon\"\n...onclick=\"logoutUser()\""
        
        // Wait, some pages might have a slightly different topbar setup.
        // Let's find <div class="user-profile"
        // and insert it right before it, or before the logout icon
        
        const logoutRegex = /<button class="btn-icon"[^>]*onclick="logoutUser\(\)"[^>]*>[\s\S]*?<\/span>\s*<\/button>/;
        
        // Let's modify the extracted button to fit the topbar aesthetic (make it look like an icon or a topbar button)
        extractedButton = extractedButton.replace('class="theme-toggle"', 'class="theme-toggle btn-icon"').replace('<i class="ph ph-sun"></i> Modo Claro', '<i class="ph ph-sun" style="font-size: 1.2rem;"></i> <span style="font-size: 0.85rem; font-weight: 600;">Tema</span>').replace('id="themeToggleBtn"', 'id="themeToggleBtn" style="color: var(--text-primary); cursor: pointer; margin-right: 15px; background: rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 6px 10px; display: flex; align-items: center; gap: 5px; border: 1px solid rgba(255, 255, 255, 0.1); transition: all 0.2s ease;"');
        
        if (content.match(logoutRegex)) {
            content = content.replace(logoutRegex, match => `${extractedButton}\n                    ${match}`);
            fs.writeFileSync(filePath, content);
            console.log(`Relocated theme toggle in ${file}`);
        } else {
             // If no logout button (maybe pos.html?), insert right inside topbar-controls end
             const topbarEndRegex = /<\/div>\s*<\/header>/;
             content = content.replace(topbarEndRegex, match => `    ${extractedButton}\n                ${match}`);
             fs.writeFileSync(filePath, content);
             console.log(`Relocated theme toggle (fallback) in ${file}`);
        }
    } else {
        console.log(`Theme toggle not found in sidebar of ${file} (already moved?)`);
    }
});
