/*  OnlyFans Automation Manager
    File: spendTierNudger.js
    Purpose: Spend tier nudger (User Story B-6)
    Created: 2025‑07‑06 – v1.0
*/

import { safeGET, safePOST } from '../api/onlyfansApi.js';
import { query, isFeatureEnabled } from '../db/db.js';
import { OpenAI } from 'openai';
import { decryptEnv } from '../security/secureKeys.js';
import { logger } from '../logger.js';

let openai;

async function spendTierNudger() {
  if (!await isFeatureEnabled('spendTierNudgerEnabled')) return;
  try {
    logger.info('spendTierNudger cron started');
    if (!openai) openai = new OpenAI({ apiKey: await decryptEnv('OPENAI_API_KEY') });
    const accounts = await safeGET('/api/accounts');
    const acctId = accounts.data[0]?.id;
    if (!acctId) return;
    const lastRow = await query('SELECT value FROM settings WHERE key=$1', ['spendNudgeLastTxn']);
    let lastId = lastRow.rows[0] ? Number(lastRow.rows[0].value) : 0;
    const txns = await safeGET(`/api/${acctId}/payouts/transactions?limit=50`);
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const newTxns = txns.data.filter(t => Number(t.id) > lastId &&
      t.type === 'tip' && Number(t.amount) > 100 && new Date(t.date).getTime() >= dayAgo);
    newTxns.sort((a,b) => a.id - b.id);
    for (const t of newTxns) {
      if (!t.user_id) continue;
      const prompt = `Write a short, polite thank-you and upsell message for a fan who just tipped over $100. Address them warmly.`;
      const res = await openai.chat.completions.create({
        messages: [{ role: 'system', content: prompt }],
        model: 'openai.o3',
        max_tokens: 60,
        temperature: 0.7
      });
      const text = res.choices[0].message.content.trim();
      await safePOST(`/api/${acctId}/chats/${t.user_id}/messages`, { text });
      lastId = t.id;
      await query('INSERT INTO settings(key,value) VALUES($1,$2) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value', ['spendNudgeLastTxn', String(lastId)]);
      await new Promise(r => setTimeout(r, 1000));
    }
    logger.info('spendTierNudger cron finished');
  } catch (err) {
    logger.error(`spendTierNudger failed ${err}`);
  }
}

export const spendTierNudgerJob = { name: 'spendTierNudger', schedule: '0 0 * * *', fn: spendTierNudger };

/*  End of File – Last modified 2025-07-11 */