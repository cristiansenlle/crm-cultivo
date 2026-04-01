const fs = require('fs');

const blockRegex = /[\s]*<div class="status-row">\s*<div class="status-indicator" id="waStatusDot"[^>]*><\/div>\s*<span id="waStatusText">[^<]*<\/span>\s*<\/div>/g;

fs.readdirSync('.').forEach(f => {
    if (f.endsWith('.html')) {
        let code = fs.readFileSync(f, 'utf8');
        if (blockRegex.test(code)) {
            let newCode = code.replace(blockRegex, '');
            fs.writeFileSync(f, newCode);
            console.log('Cleaned HTML:', f);
        }
    }
});

let mainJs = fs.readFileSync('main.js', 'utf8');
const jsCheckBlockRegex = /[\s]*async function checkBotStatus\(\) \{[\s\S]*?checkBotStatus\(\);/g;
if (jsCheckBlockRegex.test(mainJs)) {
    mainJs = mainJs.replace(jsCheckBlockRegex, '');
    fs.writeFileSync('main.js', mainJs);
    console.log('Cleaned JS: main.js');
}
