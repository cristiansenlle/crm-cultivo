const fs = require('fs');
const tempPath = 'c:/Users/Cristian/.gemini/antigravity/crm cannabis/temp_glass.txt';
let h = fs.readFileSync(tempPath, 'utf8');

// Transform dark glass to icy light glass
h = h.replace('background: rgba(20, 20, 25, 0.55);', 'background: rgba(255, 255, 255, 0.12); color: #fff;');
h = h.replace('border: 1px solid rgba(255, 255, 255, 0.1);', 'border: 1px solid rgba(255, 255, 255, 0.3);');

// Input backgrounds
h = h.replaceAll('background:rgba(255, 255, 255, 0.05)', 'background:rgba(255, 255, 255, 0.15)');
h = h.replaceAll('background:rgba(25, 25, 30, 0.9)', 'background:rgba(255, 255, 255, 0.15)');

// Input borders
h = h.replaceAll('border-bottom: 2px solid rgba(255,255,255,0.15)', 'border-bottom: 2px solid rgba(255,255,255,0.4)');
h = h.replaceAll('border: 1px solid rgba(255,255,255,0.08)', 'border: 1px solid rgba(255,255,255,0.2)');

// Text
h = h.replaceAll('color: var(--text-secondary);', 'color: rgba(255,255,255,0.9); font-weight: 500;');
h = h.replace('color: var(--text-primary);', 'color: #fff;');

// Button gradient
h = h.replace('background: linear-gradient(135deg, var(--color-blue), #1e5bbd);', 'background: linear-gradient(135deg, #00c6ff 0%, #0072ff 100%);');

fs.writeFileSync(tempPath, h, 'utf8');
console.log("ICY FROSTED APPLIED TO TEMP");
