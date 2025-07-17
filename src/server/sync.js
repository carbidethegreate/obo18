/*  OnlyFans Automation Manager
    File: sync.js
    Purpose: Master sync runner (User Stories A-1, A-1.1, A-2, A-3)
    Created: 2025‑07‑06 – v1.0
*/

import { safeGET } from './api/onlyfansApi.js';
import { query } from './db/db.js';
import { pickDisplayName } from './utils/pickDisplayName.js';
import { buildCharacter } from './utils/buildCharacter.js';
import { logActivity } from './activityLog.js';

function classifyPurchase(desc) {
  if (/tip/i.test(desc)) return 'tip';
  if (/sub/i.test(desc) || /rebill/i.test(desc)) return 'subscription';
  return 'other';
}

async function upsertFan(fan, status) {
  const display = await pickDisplayName(fan.name);
  await query(
    `INSERT INTO fans(fan_id, name, display_name, username, subscription_status)
     VALUES($1,$2,$3,$4,$5)
     ON CONFLICT (fan_id) DO UPDATE
     SET name=EXCLUDED.name,
         display_name=EXCLUDED.display_name,
         username=EXCLUDED.username,
         subscription_status=EXCLUDED.subscription_status`,
    [fan.id, fan.name, display, fan.username, status]
  );
}

// 1. Master Sync
export async function runFullSync(max) {
  logActivity('Starting full sync...');
  const started = Date.now();
  /* 1.1 Fetch Fans */
  const accountRes = await safeGET('/api/accounts');
  const account = accountRes.data[0];
  if (!account) {
    console.warn('No connected account');
    return;
  }
  const acctId = account.id;
  const actives = await safeGET(`/api/${acctId}/fans/active?limit=50&offset=0`);
  const expired = await safeGET(`/api/${acctId}/fans/expired?limit=50&offset=0`);
  const activeList = actives.data;
  const expiredList = expired.data;
  logActivity(`Fetched ${activeList.length} active fans, ${expiredList.length} expired fans`);
  let fans = [...activeList, ...expiredList];
  if (typeof max === 'number') fans = fans.slice(0, max);
  const activeIds = new Set(activeList.map(f => f.id));
  const fanIds = new Set(fans.map(f => f.id));
  for (const fan of fans) {
    await upsertFan(fan, activeIds.has(fan.id) ? 'active' : 'expired');
  }

  /* 1.2 Fetch Chats */
  const chatsRes = await safeGET(`/api/${acctId}/chats`);
  let msgCount = 0;
  for (const chat of chatsRes.data) {
    if (max && !fanIds.has(chat.id)) continue;
    const msgs = await safeGET(`/api/${acctId}/chats/${chat.id}/messages?limit=25&order=asc`);
    for (const m of msgs.data) {
      await query(
        `INSERT INTO messages(msg_id, fan_id, direction, text, created_at)
         VALUES($1,$2,$3,$4,$5)
         ON CONFLICT (msg_id) DO NOTHING`,
        [m.id, chat.id, m.isOpened ? 'out' : 'in', m.text, m.created_at]
      );
      msgCount++;
    }
  }

  /* 1.3 Fetch Purchases */
  const txnsRes = await safeGET(`/api/${acctId}/payouts/transactions?limit=50`);
  let txnCount = 0;
  for (const t of txnsRes.data) {
    const type = classifyPurchase(t.description || '');
    await query(
      `INSERT INTO transactions(txn_id, fan_id, type, amount, created_at)
       VALUES($1,$2,$3,$4,$5)
       ON CONFLICT (txn_id) DO NOTHING`,
      [t.id, t.user_id || null, type, t.amount, t.date]
    );
    txnCount++;
  }
  logActivity(`Inserted ${msgCount} messages, ${txnCount} transactions`);
  /* 1.4 Build Characters */
  for (const fan of fans) {
    const msgs = await query('SELECT text FROM messages WHERE fan_id=$1 ORDER BY created_at DESC LIMIT 30', [fan.id]);
    const purchases = await query('SELECT type, amount FROM transactions WHERE fan_id=$1 ORDER BY created_at DESC LIMIT 10', [fan.id]);
    const profile = await buildCharacter(msgs.rows, purchases.rows);
    await query('UPDATE fans SET character_profile=$1 WHERE fan_id=$2', [profile, fan.id]);
  }
  const dur = Date.now() - started;
  logActivity(`Sync complete (${dur} ms)`);
}

export async function refreshFan(fanId) {
  logActivity(`Refreshing fan ${fanId}...`);
  const started = Date.now();
  const accountRes = await safeGET('/api/accounts');
  const account = accountRes.data[0];
  if (!account) return;
  const acctId = account.id;
  const fanRes = await safeGET(`/api/users/${fanId}`);
  await upsertFan(fanRes.data, fanRes.data.subscription_status);
  const msgs = await safeGET(`/api/${acctId}/chats/${fanId}/messages?limit=25&order=desc`);
  for (const m of msgs.data) {
    await query(
      `INSERT INTO messages(msg_id, fan_id, direction, text, created_at) VALUES($1,$2,$3,$4,$5) ON CONFLICT (msg_id) DO NOTHING`,
      [m.id, fanId, m.isOpened ? 'out' : 'in', m.text, m.created_at]
    );
  }
  const txns = await safeGET(`/api/${acctId}/payouts/transactions?limit=50`);
  for (const t of txns.data.filter(t => t.user_id == fanId)) {
    const type = classifyPurchase(t.description || '');
    await query(
      `INSERT INTO transactions(txn_id, fan_id, type, amount, created_at) VALUES($1,$2,$3,$4,$5) ON CONFLICT (txn_id) DO NOTHING`,
      [t.id, fanId, type, t.amount, t.date]
    );
  }
  const histMsgs = await query('SELECT text FROM messages WHERE fan_id=$1 ORDER BY created_at DESC LIMIT 30', [fanId]);
  const histTxns = await query('SELECT type, amount FROM transactions WHERE fan_id=$1 ORDER BY created_at DESC LIMIT 10', [fanId]);
  const profile = await buildCharacter(histMsgs.rows, histTxns.rows);
  await query('UPDATE fans SET updated_at=NOW(), character_profile=$2 WHERE fan_id=$1', [fanId, profile]);
  logActivity(`Fan ${fanId} refreshed (${Date.now() - started} ms)`);
}

export async function backfillMessages() {
  logActivity('Backfilling all messages...');
  const started = Date.now();
  const accountRes = await safeGET('/api/accounts');
  const account = accountRes.data[0];
  if (!account) return;
  const acctId = account.id;
  const chatsRes = await safeGET(`/api/${acctId}/chats`);
  for (const chat of chatsRes.data) {
    let page = 0;
    while (true) {
      const msgs = await safeGET(`/api/${acctId}/chats/${chat.id}/messages?limit=50&offset=${page * 50}&order=asc`);
      if (!msgs.data.length) break;
      for (const m of msgs.data) {
        await query(
          `INSERT INTO messages(msg_id, fan_id, direction, text, created_at) VALUES($1,$2,$3,$4,$5) ON CONFLICT (msg_id) DO NOTHING`,
          [m.id, chat.id, m.isOpened ? 'out' : 'in', m.text, m.created_at]
        );
      }
      if (msgs.data.length < 50) break;
      page++;
    }
  }
  logActivity(`Backfill complete (${Date.now() - started} ms)`);
}

/*  End of File – Last modified 2025‑07‑17 */
