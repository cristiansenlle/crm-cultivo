const fs = require('fs');
const path = require('path');
const directoryPath = __dirname;

fs.readdir(directoryPath, function (err, files) {
    if (err) return console.log('Unable to scan directory: ' + err); 

    files.forEach(function (file) {
        if (file.endsWith('.html')) {
            const filePath = path.join(directoryPath, file);
            let content = fs.readFileSync(filePath, 'utf8');
            let og = content;

            // 1. Precise fix for \n inside <nav>
            content = content.replace(/<nav class="nav-menu">\\n/g, '<nav class="nav-menu">\n');
            
            // 2. Precise fix for Agronómico
            content = content.replace(/Timeline\\n\s+Agronómico/g, 'Timeline Agronómico');

            // 3. Remove System Status block safely by anchoring against the end of the span and exactly ONE closing div
            content = content.replace(/<div class="system-status">[\s\S]*?<span id="globalStatusText">.*?<\/span>[\s]*<\/div>/g, '');
            
            // 4. Remove older status widget similarly
            content = content.replace(/<div class="status-indicator">[\s\S]*?<span id="globalStatusText">.*?<\/span>[\s]*<\/div>/g, '');

            if (content !== og) {
                fs.writeFileSync(filePath, content);
                console.log('SAFELY Fixed:', file);
            }
        }
    });
});
