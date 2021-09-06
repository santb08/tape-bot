const { exec } = require('child_process');
const path = require('path');

require('dotenv').config({
  path: path.resolve(__dirname, '../../.env.prod'),
});

exec('webpack', (error, stdout, stderr) => {
  if (error) {
    console.error(`error: ${error.message}`);
  }

  if (stderr) {
    console.error(`stderr: ${stderr}`);
    return;
  }

  console.log(`stdout: ${stdout}`);
});
