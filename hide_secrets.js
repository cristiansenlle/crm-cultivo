const fs = require('fs');
const path = require('path');

const SECTRETS_REGEX = [
    /gsk_[a-zA-Z0-9]{20,}/g, // Groq
    /HIDDEN_SECRET_BY_AI/g, // Contabo SSH
    // JWTS y Supabase keys (muy largas, empiezan con ey o un jwt comun).
    /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_\-\.]+/g,
    /sbp_[a-zA-Z0-9]{30,}/g // Supabase personal access token si las hay
];

const DIR = __dirname;
let count = 0;

function walkDir(dir) {
    if (dir.includes('.git') || dir.includes('node_modules')) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            walkDir(fullPath);
        } else if (file.endsWith('.js') || file.endsWith('.json') || file.endsWith('.html') || file.endsWith('.ts') || file.endsWith('.txt')) {
            try {
                let content = fs.readFileSync(fullPath, 'utf8');
                let modified = false;
                
                for (const regex of SECTRETS_REGEX) {
                    if (regex.test(content)) {
                        content = content.replace(regex, 'HIDDEN_SECRET_BY_AI');
                        modified = true;
                    }
                }
                
                if (modified) {
                    fs.writeFileSync(fullPath, content, 'utf8');
                    count++;
                }
            } catch(e) {}
        }
    }
}

walkDir(DIR);
console.log(`Se ocultaron secretos en ${count} archivos locales.`);
