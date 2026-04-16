const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

(async () => {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' });
        
        console.log('--- DEFINITIVE CLEANUP ---');
        
        // Delete the duplicate workflow that has the problematic executeCommand node
        console.log('Deleting k2d workflow...');
        await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"DELETE FROM workflow_entity WHERE id = 'k2d7SbuTEeGHCDzR';\"");
        
        // Clear all published versions to force n8n to rebuild the active state from our clean import
        console.log('Clearing published versions...');
        await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"DELETE FROM workflow_published_version;\"");
        
        // Clear all webhooks to ensure a fresh registration
        console.log('Clearing webhook registry...');
        await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"DELETE FROM webhook_entity;\"");
        
        // Temporarily deactivate the scp workflow in the DB to allow a clean import
        console.log('Deactivating scp workflow...');
        await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"UPDATE workflow_entity SET active = 0 WHERE id = 'scpZdPe5Cp4MG98G';\"");

        console.log('Cleanup complete.');
        ssh.dispose();
    } catch (err) {
        console.error('Cleanup failed:', err.message);
    }
})();
