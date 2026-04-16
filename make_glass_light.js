const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else {
            if(file.endsWith('.tsx')) results.push(file);
        }
    });
    return results;
}

const files = walk(path.join(__dirname, 'next-app', 'src'));
let replacementsCount = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf-8');
    const original = content;

    // Direct Exact Replacements
    content = content.replace(/text-white\/60/g, "text-foreground opacity-60");
    content = content.replace(/hover:text-white/g, "hover:text-foreground");
    content = content.replace(/text-white/g, "text-foreground");

    content = content.replace(/text-gray-400/g, "text-brand-slate-600 dark:text-gray-400");
    content = content.replace(/text-brand-slate-400/g, "text-brand-slate-600 dark:text-slate-400");
    
    content = content.replace(/bg-black\/20/g, "bg-black/[0.03] dark:bg-black/20");
    content = content.replace(/bg-black\/30/g, "bg-black/[0.05] dark:bg-black/30");
    content = content.replace(/bg-black\/40/g, "bg-black/[0.08] dark:bg-black/40");
    content = content.replace(/bg-black\/50/g, "bg-black/10 dark:bg-black/50");

    content = content.replace(/hover:bg-black\/30/g, "hover:bg-black/[0.1] dark:hover:bg-black/30");
    content = content.replace(/hover:bg-white\/5/g, "hover:bg-black/5 dark:hover:bg-white/5");

    // Correcciones para Botones
    content = content.replace(/bg-emerald-600 hover:bg-emerald-500 text-foreground/g, "bg-emerald-600 hover:bg-emerald-500 text-white");
    content = content.replace(/bg-indigo-600 text-foreground/g, "bg-indigo-600 text-white");
    content = content.replace(/bg-blue-600 text-foreground/g, "bg-blue-600 text-white");
    content = content.replace(/bg-purple-600 text-foreground/g, "bg-purple-600 text-white");
    content = content.replace(/bg-orange-600 hover:bg-orange-500 text-foreground/g, "bg-orange-600 hover:bg-orange-500 text-white");
    content = content.replace(/bg-red-500 hover:bg-red-600 text-foreground/g, "bg-red-500 hover:bg-red-600 text-white");
    
    // Corregir layout html dark class (como si fuera un file replace)
    if(file.endsWith('layout.tsx')) {
        content = content.replace('antialiased dark"', 'antialiased"');
    }

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf-8');
        console.log(`Updated UI Light Compatibility: ${path.basename(file)}`);
        replacementsCount++;
    }
});

console.log(`\nOperation Complete. Transmuted ${replacementsCount} TSX modules.`);
