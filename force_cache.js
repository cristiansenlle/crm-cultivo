const fs = require('fs');
const filesToUpload = ['cultivo.html', 'index.html', 'tareas.html', 'pos.html', 'insumos.html', 'protocolos.html', 'analytics.html', 'login.html'];
const version = Date.now();
for (const file of filesToUpload) {
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        content = content.replace(/href="style\.css(\\?[^"]*)?"/g, 'href="style.css?v=' + version + '"');
        content = content.replace(/src="main\.js(\\?[^"]*)?"/g, 'src="main.js?v=' + version + '"');
        fs.writeFileSync(file, content);
        console.log("Exito con " + file);
    }
}
