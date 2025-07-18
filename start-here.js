/*  OnlyFans Automation Manager
    File: start-here.js
    Purpose: quick start script to create project folder and encrypted .env
    Created: 2025-07-18 – v1.0 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import readline from 'readline';
import sodium from 'libsodium-wrappers';
import { sealString } from './src/server/security/secureKeys.js';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(q) {
  return new Promise(resolve => rl.question(q, a => resolve(a.trim())));
}

async function run() {
  const folder = await ask('Desktop folder name: ');
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

  const env = `DATABASE_URL=${dbUrl}\nKEY_PUBLIC=${pubHex}\nKEY_PRIVATE=${privHex}\nONLYFANS_API_KEY=${sealedOf}\nOPENAI_API_KEY=${sealedOa}\n`;
  fs.writeFileSync(path.join(targetDir, '.env'), env);

  console.log('Setup complete.');
  console.log(`Database URL: ${dbUrl}`);
  rl.close();
}

run().catch(err => {
  console.error(err);
  rl.close();
});

/*  End of File – Last modified 2025-07-18 */
