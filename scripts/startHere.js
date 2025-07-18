/*  OnlyFans Automation Manager
    File: startHere.js
    Purpose: interactive setup for local development
    Created: 2025-07-25 – v1.0 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import readline from 'readline';
import { execSync } from 'child_process';
import sodium from 'libsodium-wrappers';
import { sealString } from '../src/server/security/secureKeys.js';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(question) {
  return new Promise(resolve => rl.question(question, a => resolve(a.trim())));
}

async function run() {
  const folder = await ask('Project folder name on Desktop: ');
  const dbName = await ask('Database name: ');
  const ofKey = await ask('OnlyFans API key: ');
  const oaKey = await ask('OpenAI API key: ');

  const desktop = path.join(os.homedir(), 'Desktop');
  const targetDir = path.join(desktop, folder);
  fs.mkdirSync(targetDir, { recursive: true });

  await sodium.ready;
  const { publicKey, privateKey } = sodium.crypto_box_keypair();
  const pubHex = Buffer.from(publicKey).toString('hex');
  const privHex = Buffer.from(privateKey).toString('hex');

  const sealedOf = await sealString(ofKey, pubHex);
  const sealedOa = await sealString(oaKey, pubHex);
  const dbUrl = `postgres://localhost:5432/${dbName}`;

  const env = [
    `DATABASE_URL=${dbUrl}`,
    `KEY_PUBLIC=${pubHex}`,
    `KEY_PRIVATE=${privHex}`,
    `ONLYFANS_API_KEY=${sealedOf}`,
    `OPENAI_API_KEY=${sealedOa}`,
    ''
  ].join('\n');
  fs.writeFileSync(path.join(targetDir, '.env'), env);

  fs.writeFileSync('.starthere.json', JSON.stringify({ folder: targetDir }, null, 2));

  try {
    execSync(`createdb ${dbName}`, { stdio: 'inherit' });
  } catch (err) {
    console.warn('createdb failed, continuing with init-db');
  }

  execSync('npm test', { cwd: targetDir, stdio: 'inherit' });
  execSync('npm run init-db', { cwd: targetDir, stdio: 'inherit' });
  execSync('npm start', { cwd: targetDir, stdio: 'inherit' });

  rl.close();
}

run().catch(err => {
  console.error(err);
  rl.close();
});

/*  End of File – Last modified 2025-07-25 */
