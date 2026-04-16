const fs = require('fs');
const path = require('path');

const files = ['pos.html', 'analytics.html', 'agronomy.html'];

const standardButton = `<button id="themeToggleBtn" class="theme-toggle btn-icon" style="color: var(--text-primary); cursor: pointer; margin-right: 15px; background: rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 6px 10px; display: flex; align-items: center; gap: 5px; border: 1px solid rgba(255, 255, 255, 0.1); transition: all 0.2s ease;">
                        <i class="ph ph-sun" style="font-size: 1.2rem;"></i> <span style="font-size: 0.85rem; font-weight: 600;">Tema</span>
                    </button>`;

files.forEach(file => {
    let filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) return;
    
    let content = fs.readFileSync(filePath, 'utf8');

    // First, check if it already has the button
    if (content.includes('id="themeToggleBtn"')) {
        console.log(`Button already exists in ${file}`);
        return;
    }

    // Find the logout button to insert before it
    const logoutRegex = /<button class="btn-icon"[^>]*onclick="logoutUser\(\)"[^>]*>[\s\S]*?<\/span>\s*<\/button>/;
    
    if (content.match(logoutRegex)) {
        content = content.replace(logoutRegex, match => `${standardButton}\n                    ${match}`);
        fs.writeFileSync(filePath, content);
        console.log(`Injected theme toggle in ${file}`);
    } else {
         // If no logout button, try to find user-profile
         const profileRegex = /<div class="user-profile">/;
         if (content.match(profileRegex)) {
             content = content.replace(profileRegex, match => `${standardButton}\n                ${match}`);
             fs.writeFileSync(filePath, content);
             console.log(`Injected theme toggle (via profile) in ${file}`);
         } else {
             console.log(`Could not find anchor to inject in ${file}`);
         }
    }
});
