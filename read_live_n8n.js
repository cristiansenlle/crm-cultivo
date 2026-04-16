const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();
ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' }).then(async () => {
   const res = await ssh.execCommand(`sqlite3 /root/.n8n/database.sqlite "SELECT nodes FROM workflow_entity WHERE id='9ASt18aP8tJss5mI';"`);
   if (res.stdout) {
       fs.writeFileSync('THE_TRUTH_live_nodes_agronomy.json', res.stdout);
       console.log('Saved to THE_TRUTH_live_nodes_agronomy.json. Length:', res.stdout.length);
   } else {
       console.error('Failed to fetch. Stderr:', res.stderr);
   }
   ssh.dispose();
});
