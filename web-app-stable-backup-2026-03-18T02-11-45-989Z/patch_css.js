const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function patchCSS() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        console.log('Fetching remote style.css...');
        let cssContent = await ssh.execCommand('cat /opt/crm-cannabis/style.css');
        let css = cssContent.stdout;

        // 1. Fix the double scrollbar
        // Replace overflow-x: hidden; with overflow: hidden; in body
        css = css.replace('overflow-x: hidden;', 'overflow: hidden;');

        // Make sure .app-container is height: 100vh
        css = css.replace('min-height: 100vh;', 'height: 100vh; overflow: hidden;');

        // 2. Fix the button text wrap
        css = css.replace(/\\.btn-primary \\{\\n    background-color: var\\(--color-green\\);/g, '.btn-primary {\\n    background-color: var(--color-green);\\n    white-space: nowrap;');

        // Upload patched file
        // Write locally first
        const fs = require('fs');
        fs.writeFileSync('patched_style.css', css);

        console.log('Uploading patched style.css...');
        await ssh.putFile('patched_style.css', '/opt/crm-cannabis/style.css');

        console.log('✅ Style pushed successfully.');
        ssh.dispose();
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

patchCSS();
