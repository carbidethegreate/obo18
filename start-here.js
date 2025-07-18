/*  OnlyFans Automation Manager
    File: start-here.js
    Purpose: interactive one-click setup script
    Created: 2025-07-18 – v1.0 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import readline from 'readline';
import { execSync } from 'child_process';
import { createRequire } from 'module';
import { sealString } from './src/server/security/secureKeys.js';

const require = createRequire(import.meta.url);
let sodium;
try {
  sodium = require('libsodium-wrappers');
} catch (err) {
  console.error(
    'libsodium-wrappers is missing. Please run `npm install` or `npm test` first.'
  );
  process.exit(1);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(q) {
  return new Promise(resolve => rl.question(q, a => resolve(a.trim())));
}

async function run() {
  const folder = await ask('Project folder name on Desktop: ');
  const dbName = await ask('PostgreSQL database name: ');
  const ofKey = await ask('OnlyFans API key: ');
  const oaKey = await ask('OpenAI API key: ');

  const targetDir = path.join(os.homedir(), 'Desktop', folder);
  fs.mkdirSync(targetDir, { recursive: true });

  console.log(`\nCopying project files to ${targetDir}...`);
  fs.cpSync('.', targetDir, {
    recursive: true,
    dereference: true,
    filter: src => !src.includes(`node_modules${path.sep}`)
  });

  await sodium.ready;
  const { publicKey, privateKey } = sodium.crypto_box_keypair();
  const pubHex = Buffer.from(publicKey).toString('hex');
  const privHex = Buffer.from(privateKey).toString('hex');

  const sealedOf = await sealString(ofKey, pubHex);
  const sealedOa = await sealString(oaKey, pubHex);

  const env =
    `DATABASE_URL=postgres://localhost:5432/${dbName}\n` +
    `KEY_PUBLIC=${pubHex}\nKEY_PRIVATE=${privHex}\n` +
    `ONLYFANS_API_KEY=${sealedOf}\nOPENAI_API_KEY=${sealedOa}\n`;
  fs.writeFileSync(path.join(targetDir, '.env'), env);

  fs.writeFileSync('.starthere.json', JSON.stringify({ folder: targetDir }, null, 2));

  console.log('Creating PostgreSQL database (if needed)...');
  try {
    execSync(`createdb ${dbName}`, { stdio: 'inherit' });
  } catch (e) {
    console.warn('Database creation skipped or failed, continuing...');
  }

  console.log('Installing dependencies and running tests...');
  execSync('npm test', { cwd: targetDir, stdio: 'inherit' });

  console.log('Initializing the database...');
  execSync('npm run init-db', { cwd: targetDir, stdio: 'inherit' });

  console.log('Starting the application...');
  execSync('npm start', { cwd: targetDir, stdio: 'inherit' });

  console.log('\nSetup complete! Your OnlyFans Automation Manager is now running.');
  console.log('Open http://localhost:3000 in your browser.');
  rl.close();
}

run().catch(err => {
  console.error(err);
  rl.close();
});

/*  End of File – Last modified 2025-08-06 */
