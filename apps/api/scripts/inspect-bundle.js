const https = require('https');

https.get('https://avarta-ap-workspace-web-beryl.vercel.app/assets/index-COD4waRN.js', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const chunkMatches = data.match(/assets\/[a-zA-Z0-9_\-\.]+\.js/g);
    console.log('Referenced chunks:', [...new Set(chunkMatches)]);
    
    // Check for git commit or build hash or version
    const versionMatch = data.match(/version[":\s]+([0-9a-fA-F\.]+)/g);
    console.log('Version matches:', versionMatch);
  });
});
