const git = require('isomorphic-git');
const fs = require('fs');
const http = require('isomorphic-git/http/node');

async function run() {
  const dir = 'C:/Users/crist/.gemini/antigravity/crm cannabis';
  
  try {
    console.log('Force Pushing to origin...');
    let pushResult = await git.push({
      fs,
      http,
      dir,
      remote: 'origin',
      ref: 'main',
      force: true
    });
    console.log('Push Result:', pushResult);
    
    console.log('Done!');
  } catch (err) {
    console.error('Git Error:', err);
  }
}
run();
