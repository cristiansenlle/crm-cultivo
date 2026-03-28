const fs = require('fs');
const path = require('path');

const files = [
    'index.html', 'cultivo.html', 'tareas.html', 'insumos.html', 
    'pos.html', 'analytics.html', 'agronomy.html', 'protocolos.html'
];

const standardizedButtons = `
                    <div class="header-action-buttons" style="display: flex; align-items: center; gap: 12px; margin-left: auto;">
                        <button id="themeToggleBtn" class="theme-toggle" style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 8px 15px; color: var(--text-primary); display: flex; align-items: center; gap: 8px; cursor: pointer; transition: all 0.2s ease; white-space: nowrap; height: 40px;">
                            <i class="ph ph-sun" style="font-size: 1.2rem;"></i>
                            <span style="font-size: 0.85rem; font-weight: 600;">Tema</span>
                        </button>
                        
                        <button class="btn-icon" onclick="logoutUser()" title="Cerrar Sesión" style="background: rgba(255, 61, 0, 0.1); border: 1px solid rgba(255, 61, 0, 0.2); border-radius: 8px; padding: 8px 15px; color: var(--color-red); display: flex; align-items: center; gap: 8px; cursor: pointer; transition: all 0.2s ease; white-space: nowrap; height: 40px;">
                            <i class="ph ph-sign-out" style="font-size: 1.2rem;"></i>
                            <span style="font-size: 0.85rem; font-weight: 600;">Salir</span>
                        </button>
                    </div>
`;

files.forEach(file => {
    let filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) return;
    
    let content = fs.readFileSync(filePath, 'utf8');

    // 1. Completely strip out the original buttons (Theme & Logout) using aggressive regex
    // We'll replace both buttons safely.
    content = content.replace(/<button[^>]*id="themeToggleBtn"[\s\S]*?<\/button>/gi, '');
    content = content.replace(/<button[^>]*onclick="logoutUser\([^)]*\)"[\s\S]*?<\/button>/gi, '');

    // 2. Insert the standardizedButtons immediately BEFORE the .user-profile div
    const userProfileRegex = /<div class="user-profile"/;
    
    if (content.match(userProfileRegex)) {
        content = content.replace(userProfileRegex, match => `${standardizedButtons}\n                    ${match}`);
        fs.writeFileSync(filePath, content);
        console.log(`Successfully normalized buttons in ${file}`);
    } else {
        console.log(`Failed to find user profile to anchor in ${file}`);
    }
});
