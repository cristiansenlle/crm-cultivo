const fs = require('fs');
const path = require('path');

const dir = 'c:/Users/Cristian/.gemini/antigravity/crm cannabis/';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

const masterMenuLinks = [
    { href: 'index.html', icon: 'ph-squares-four', text: 'Panel Principal' },
    { href: 'cultivo.html', icon: 'ph-thermometer', text: 'Salas de Cultivo' },
    { href: 'tareas.html', icon: 'ph-check-square', text: 'Gestor de Tareas' },
    { href: 'insumos.html', icon: 'ph-warehouse', text: 'Bodega e Insumos' },
    { href: 'pos.html', icon: 'ph-shopping-cart', text: 'Punto de Venta (POS)' },
    { href: 'analytics.html', icon: 'ph-chart-line-up', text: 'Finanzas & ROI' },
    { href: 'agronomy.html', icon: 'ph-projector-screen-chart', text: 'Timeline Agronómico' },
    { href: 'protocolos.html', icon: 'ph-book-open', text: 'Protocolos & Recetas' }
];

for (const file of files) {
    const filePath = path.join(dir, file);
    let html = fs.readFileSync(filePath, 'utf8');

    // Find the boundaries of the <nav class="nav-menu">
    const navStartMatch = html.match(/<nav class="nav-menu">/);
    if (!navStartMatch) {
       console.log(\`No nav-menu found in \${file}, skipping.\`);
       continue;
    }
    
    // Quick split logic to replace the whole nav content
    const split1 = html.split('<nav class="nav-menu">');
    const split2 = split1[1].split('</nav>');
    
    let injectedNav = '\\n';
    for (const link of masterMenuLinks) {
        let text = link.text;
        if (text === 'Timeline Agronómico') {
            text = 'Timeline\\n                    Agronómico';
        }
        
        let activeClass = link.href === file ? ' active' : '';
        injectedNav += \`                <a href="\${link.href}" class="nav-item\${activeClass}"><i class="ph \${link.icon}"></i> \${text}</a>\\n\`;
    }
    injectedNav += '            ';
    
    const finalHtml = split1[0] + '<nav class="nav-menu">' + injectedNav + '</nav>' + split2.slice(1).join('</nav>');
    fs.writeFileSync(filePath, finalHtml);
    console.log(\`Patched navigation in \${file}\`);
}
