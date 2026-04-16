const fs = require('fs');
let css = fs.readFileSync('style.css', 'utf8');

// The widget block
css = css.replace(
    '/* Widgets */\\n.widget {\\n    background-color: var(--panel-dark);\\n    border-radius: var(--border-radius);\\n    padding: 1.5rem;\\n    border: 1px solid #333;\\n    display: flex;\\n    flex-direction: column;',
    '/* Widgets */\\n.widget {\\n    background-color: var(--panel-dark);\\n    border-radius: var(--border-radius);\\n    padding: 1.5rem;\\n    border: 1px solid rgba(255,255,255,0.1);\\n    backdrop-filter: blur(20px);\\n    -webkit-backdrop-filter: blur(20px);\\n    display: flex;\\n    flex-direction: column;'
);

// Sidebar
css = css.replace(
    '.sidebar {\\n    background-color: var(--panel-dark);\\n    padding: 2rem 1.5rem 4rem 1.5rem; /* added bottom padding to clear taskbar */\\n    display: flex;\\n    flex-direction: column;\\n    border-right: 1px solid #333;\\n}',
    '.sidebar {\\n    background-color: var(--panel-dark);\\n    backdrop-filter: blur(20px);\\n    -webkit-backdrop-filter: blur(20px);\\n    padding: 2rem 1.5rem 4rem 1.5rem; /* added bottom padding to clear taskbar */\\n    display: flex;\\n    flex-direction: column;\\n    border-right: 1px solid rgba(255,255,255,0.1);\\n}'
);

// Light mode widget overrides
css = css.replace(
    '[data-theme="light"] .widget {\\n    background-color: var(--panel-dark);\\n    border-color: rgba(0,0,0,0.1);\\n}',
    '[data-theme="light"] .widget {\\n    background-color: var(--panel-dark);\\n    border-color: rgba(0,0,0,0.15);\\n    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.05);\\n    backdrop-filter: blur(20px);\\n    -webkit-backdrop-filter: blur(20px);\\n}'
);

css = css.replace(
    '[data-theme="light"] .sidebar {\\n    overflow: hidden;\\n    background-color: var(--panel-dark);\\n    border-right-color: #E5E7EB;\\n}',
    '[data-theme="light"] .sidebar {\\n    overflow: hidden;\\n    background-color: var(--panel-dark);\\n    border-right-color: rgba(0,0,0,0.1);\\n    backdrop-filter: blur(20px);\\n    -webkit-backdrop-filter: blur(20px);\\n}'
);


fs.writeFileSync('style.css', css);
console.log("Exito!");
