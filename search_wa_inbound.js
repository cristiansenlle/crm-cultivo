const fs = require('fs');
const path = require('path');

function searchFiles(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.lstatSync(fullPath).isDirectory()) return;
        if (file.endsWith('.json')) {
            try {
                const content = fs.readFileSync(fullPath, 'utf8');
                if (content.includes('wa-inbound')) {
                    console.log('MATCH:', fullPath);
                }
            } catch (err) {}
        }
    });
}

console.log('Searching in /opt/crm-cannabis/ ...');
searchFiles('/opt/crm-cannabis/');
console.log('Searching in /root/ ...');
searchFiles('/root/');
