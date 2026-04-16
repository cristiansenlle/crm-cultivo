const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
async function run() {
    await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' });
    
    // Upload files to their appropriate directories
    await ssh.putFile('c:/Users/Cristian/.gemini/antigravity/crm cannabis/components_AuthMiddleware.tsx', '/opt/crm-cannabis-next/src/components/layout/AuthMiddleware.tsx');
    await ssh.putFile('c:/Users/Cristian/.gemini/antigravity/crm cannabis/app_login_page.tsx', '/opt/crm-cannabis-next/src/app/login/page.tsx');
    
    // Download Root Layout to Inject Middleware
    await ssh.getFile('app_layout.tsx', '/opt/crm-cannabis-next/src/app/layout.tsx');
    console.log("Layout descargado para inyectar Middleware");
    
    // Verify topbar signOut logic
    const { stdout } = await ssh.execCommand('grep -rn "SignOut" /opt/crm-cannabis-next/src/components/layout/Topbar.tsx');
    console.log("Logout Button Config:\n", stdout);

    ssh.dispose();
}
run().catch(console.error);
