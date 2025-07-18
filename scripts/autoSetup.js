/*  OnlyFans Automation Manager
    File: autoSetup.js
    Purpose: automated CLI setup helper
    Created: 2025-07-18 – v1.0 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function wait(message) {
  return new Promise(resolve => rl.question(message, () => resolve()));
}

async function run() {
  const desktop = path.join(process.env.HOME || process.env.USERPROFILE || '.', 'Desktop');
  const targetDir = path.join(desktop, 'obo2');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const cwdName = path.basename(process.cwd());
  if (cwdName !== 'obo2') {
    console.log('Please run this script from the "obo2" folder located on your Desktop.');
    rl.close();
    return;
  }

  await wait('Step 1: Install dependencies and run tests. Press Enter to continue...');
  execSync('npm test', { stdio: 'inherit' });

  await wait('Step 2: Initialize the database. Press Enter to continue...');
  execSync('npm run init-db', { stdio: 'inherit' });

  await wait('Step 3: Start the server. Press Enter to continue...');
  execSync('npm start', { stdio: 'inherit' });

  const openCmd = process.platform === 'win32'
    ? 'start "" http://localhost:3000'
    : process.platform === 'darwin'
      ? 'open http://localhost:3000'
      : 'xdg-open http://localhost:3000';
  execSync(openCmd);
  rl.close();
}

run().catch(err => {
  console.error(err);
  rl.close();
});

/*  End of File – Last modified 2025-07-18 */

