const fs = require('fs');

let css = fs.readFileSync('style.css', 'utf8');

// Incorporar Fonts
if (!css.includes('JetBrains+Mono')) {
    css = `@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Manrope:wght@400;600;800&display=swap');\n` + css;
}

// 1. Reemplazo general de colores DARK theme
css = css.replace(/--bg-dark:\s*#[0-9a-fA-F]+/i, '--bg-dark: #0F172A');
css = css.replace(/--panel-dark:\s*#[0-9a-fA-F]+/i, '--panel-dark: #1E293B');
css = css.replace(/--text-accent:\s*#[0-9a-fA-F]+/i, '--text-accent: #34D399');
css = css.replace(/--color-green:\s*#[0-9a-fA-F]+/i, '--color-green: #10B981');
css = css.replace(/rgba\(0,\s*230,\s*118,/g, 'rgba(16, 185, 129,'); // Glow update

// 2. Reemplazo general colores LIGHT theme
css = css.replace(/--bg-dark:\s*#EEF1F5/g, '--bg-dark: #F8FAFC');
css = css.replace(/--text-accent:\s*#065F46/g, '--text-accent: #059669');
css = css.replace(/rgba\(5,\s*150,\s*105,/g, 'rgba(5, 150, 105,'); // Glow update

// 3. Tipografía Base
css = css.replace(/font-family:\s*'Inter',\s*sans-serif;/g, "font-family: 'Manrope', sans-serif;");

// 4. Clases Glassmorphism HUD (Al final si no existen)
if (!css.includes('.glass-panel')) {
    const hudCSS = `
/* Next-Gen HUD Glassmorphism */
.glass-panel {
    background: rgba(30, 41, 59, 0.45);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    border-radius: var(--border-radius);
    transition: var(--transition);
}

.glass-panel.hud-module {
    border-top: 2px solid var(--color-green);
}

.glass-panel:hover {
    border-color: rgba(52, 211, 153, 0.3);
    box-shadow: 0 0 20px rgba(16, 185, 129, 0.15);
}

[data-theme="light"] .glass-panel {
    background: rgba(255, 255, 255, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.5);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.05);
}

[data-theme="light"] .glass-panel:hover {
    border-color: rgba(5, 150, 105, 0.4);
}

/* Glass Buttons */
.glass-btn {
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: var(--text-primary);
    transition: all 0.2s ease;
}
.glass-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-2px);
}
[data-theme="light"] .glass-btn {
    background: rgba(0, 0, 0, 0.03);
    border-color: rgba(0, 0, 0, 0.1);
}

.font-mono {
    font-family: 'JetBrains Mono', monospace !important;
}

/* Grid BG */
.hud-grid-bg {
    background-image: 
        linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px);
    background-size: 40px 40px;
    background-position: center center;
}

[data-theme="light"] .hud-grid-bg {
    background-image: 
        linear-gradient(to right, rgba(0,0,0,0.04) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(0,0,0,0.04) 1px, transparent 1px);
}
`;
    css = css + '\n' + hudCSS;
}

fs.writeFileSync('style.css', css);
console.log('CSS patches applied for HUD');
