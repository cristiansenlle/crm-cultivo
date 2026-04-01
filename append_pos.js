const fs = require('fs');

let pos = fs.readFileSync('pos.html', 'utf8');

if (!pos.includes('Protocolos & Recetas')) {
    // We split by </nav> and insert the link right before it
    const parts = pos.split('</nav>');
    if (parts.length > 1) {
        const link = '                <a href="protocolos.html" class="nav-item"><i class="ph ph-book-open"></i> Protocolos & Recetas</a>\n            ';
        pos = parts[0] + link + '</nav>' + parts.slice(1).join('</nav>');
        fs.writeFileSync('pos.html', pos);
        console.log('Successfully injected Protocolos link into pos.html');
    }
} else {
    console.log('Already has Protocolos link');
}
