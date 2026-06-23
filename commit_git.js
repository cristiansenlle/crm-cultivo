const git = require('isomorphic-git');
const fs = require('fs');

async function run() {
  const dir = 'C:/Users/crist/.gemini/antigravity/crm cannabis';
  try {
    const status = await git.statusMatrix({ fs, dir });
    for (const row of status) {
      const [filepath, head, workdir, stage] = row;
      if (workdir === 0) { // deleted
        await git.remove({ fs, dir, filepath });
      } else if (workdir === 2) { // modified or added
        await git.add({ fs, dir, filepath });
      }
    }
    
    let sha = await git.commit({
      fs,
      dir,
      author: {
        name: 'Cristian Senlle',
        email: 'cristiansenlle@example.com',
      },
      message: 'Clean up temp files and secure repo'
    });
    console.log('Commit SHA:', sha);
  } catch (err) {
    console.error('Git Error:', err);
  }
}
run();
