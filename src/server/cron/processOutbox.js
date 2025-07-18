/*  OnlyFans Automation Manager
    File: processOutbox.js
    Purpose: send drafts and adjust tone (User Stories C-3→C-6)
    Created: 2025-07-06 – v1.0
*/
import { safeGET, safePOST } from '../api/onlyfansApi.js';
import { query, isFeatureEnabled } from '../db/db.js';
import { logger } from '../logger.js';
import { rateSentiment } from './sendQuestionnaire.js';

async function processOutbox() {
  if (!await isFeatureEnabled('generateRepliesEnabled')) return;
  try {
    logger.info('processOutbox cron start');
    const accounts = await safeGET('/api/accounts');
    const acctId = accounts.data[0]?.id;
    if (!acctId) return;
    const rows = await query('SELECT * FROM queue WHERE type=$1 AND publish_at<=NOW() ORDER BY queue_id LIMIT 5', ['draft']);
    for (const r of rows.rows) {
      const { fanId, text } = r.payload;
      await safePOST(`/api/${acctId}/chats/${fanId}/messages`, { text });
      await query('INSERT INTO messages(msg_id, fan_id, direction, text, created_at) VALUES(DEFAULT,$1,$2,$3,NOW())', [fanId, 'out', text]);
      await query('DELETE FROM queue WHERE queue_id=$1', [r.queue_id]);
      const s = await rateSentiment(text);
      const setting = await query('SELECT value FROM settings WHERE key=$1', ['replyTemp']);
      let temp = setting.rows[0] ? Number(setting.rows[0].value) : 0.7;
      temp = Math.min(1, Math.max(0.1, temp + s * 0.05));
      await query('INSERT INTO settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value', ['replyTemp', String(temp)]);
      await new Promise(r => setTimeout(r, 1000));
    }
    logger.info('processOutbox cron finished');
  } catch (err) {
    logger.error(`processOutbox failed ${err}`);
  }
}

export const processOutboxJob = { name: 'processOutbox', schedule: '*/5 * * * *', fn: processOutbox };

/*  End of File – Last modified 2025-07-11 */