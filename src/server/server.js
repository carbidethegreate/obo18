/*  OnlyFans Automation Manager
    File: server.js
    Purpose: Express entry-point (orchestrates API endpoints for all stories)
    Created: 2025-07-06 – v1.0
*/

import 'dotenv/config';
import fs from 'fs';
import path from 'path';            // ← add this line back
import { fileURLToPath } from 'url';
import express from 'express';
import { graphqlHTTP } from 'express-graphql';

import initDb from '../../scripts/initDb.js';
import { runFullSync, refreshFan, backfillMessages } from './sync.js';
import { safeGET, safePOST, safePUT, safePATCH, safeDELETE } from './api/onlyfansApi.js';
import { startCronJobs } from './cron/index.js';
import { runVariantExperiment } from './cron/experiment.js';
import { startAuth, pollAuth, submitTwoFactor } from './api/auth.js';
import { query } from './db/db.js';
import { schema } from './graphql/schema.js';
import { logActivity, getActivityLog } from './activityLog.js';

//
// 1. Ensure .env exists or exit
//
const cwd = process.cwd();
const envPath = path.resolve(cwd, '.env');
const examplePath = path.resolve(cwd, '.env.example');

if (!fs.existsSync(envPath)) {
  if (!process.env.DATABASE_URL) {
    if (fs.existsSync(examplePath)) {
      fs.copyFileSync(examplePath, envPath);
    } else {
      fs.writeFileSync(envPath,
        'DATABASE_URL=postgres://username:password@localhost:5432/your_db_name\n'
      );
    }
    console.log('Created .env file. Please edit it to add your database credentials.');
    process.exit(1);
  } else {
    console.warn('.env file not found, using DATABASE_URL from environment.');
  }
}

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is not set. Please update .env.');
  process.exit(1);
}

//
// 2. Optional: auto-init DB on startup
//
if (process.env.INIT_DB_ON_STARTUP === 'true') {
  await initDb().catch(err => {
    console.error('Database init failed', err);
    process.exit(1);
  });
}

//
// 3. Create Express app and JSON middleware
//
const app = express();
app.use(express.json());

//
// 4. Health check
//
app.get('/health', (_, res) => {
  res.json({ status: 'ok' });
});

//
// 5. GraphQL endpoint
//
app.use('/graphql',
  graphqlHTTP({
    schema,
    graphiql: true
  })
);

//
// 6. OnlyFans auth endpoints
//
app.post('/api/auth/start', async (req, res) => {
  try {
    const { email, password } = req.body;
    const data = await startAuth(email, password);
    res.json(data);
  } catch {
    res.status(500).json({ error: 'auth start failed' });
  }
});

app.get('/api/auth/:id', async (req, res) => {
  try {
    const data = await pollAuth(req.params.id);
    res.json(data);
  } catch {
    res.status(500).json({ error: 'auth poll failed' });
  }
});
// Duplicate endpoint removed. Use the withAccount version below.
// app.get('/api/profile-visitors', async (req,res)=>{
//   try{
//     const acct=await getCurrentAccount()
//     const data=await safeGET(`/api/${acct.id}/statistics/reach/profile-visitors`)
//     res.json({count:data.data?.count||0})
//   }catch(e){res.status(500).json({error:'fail'})}
// })
app.post('/api/auth/:id/2fa', async (req, res) => {
  try {
    const { code } = req.body;
    const data = await submitTwoFactor(req.params.id, code);
    res.json(data);
  } catch {
    res.status(500).json({ error: '2fa failed' });
  }
});

//
// 7. Data sync endpoints
//
app.post('/api/sync', async (req, res) => {
  try {
    const max = req.query.max ? Number(req.query.max) : undefined;
    await runFullSync(max);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'sync failed' });
  }
});

app.post('/api/fans/:id/sync', async (req, res) => {
  try {
    await refreshFan(req.params.id);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'fan sync failed' });
  }
});

app.post('/api/messages/backfill', async (_, res) => {
  try {
    await backfillMessages();
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'backfill failed' });
  }
});

app.get('/api/log', (_, res) => {
  res.json({ log: getActivityLog() });
});

//
// 8. OnlyFans REST wrappers (balances, messages, mass messages, posts, queue, vault)
//
const withAccount = handler => async (req, res) => {
  try {
    const accounts = await safeGET('/api/accounts');
    const acctId = accounts.data[0]?.id;
    if (!acctId) return res.status(400).json({ error: 'no account' });
    await handler(req, res, acctId);
  } catch {
    res.status(500).json({ error: 'operation failed' });
  }
};

app.get('/api/balances', withAccount(async (_, res, acct) => {
  const bal = await safeGET(`/api/${acct}/payouts/balances`);
  res.json(bal);
}));

app.post('/api/fans/:id/messages', withAccount(async (req, res, acct) => {
  const { text, mediaId } = req.body;
  await safePOST(`/api/${acct}/chats/${req.params.id}/messages`, {
    text,
    mediaFiles: mediaId ? [mediaId] : []
  });
  res.json({ ok: true });
}));

app.post('/api/mass-messages', withAccount(async (req, res, acct) => {
  const result = await safePOST(`/api/${acct}/mass-messaging`, req.body);
  res.json(result);
}));

app.get('/api/mass-messages', withAccount(async (_, res, acct) => {
  const result = await safeGET(`/api/${acct}/mass-messaging`);
  res.json(result);
}));

app.delete('/api/mass-messages/:id', withAccount(async (req, res, acct) => {
  await safeDELETE(`/api/${acct}/mass-messaging/${req.params.id}`);
  res.json({ ok: true });
}));

app.get('/api/posts', withAccount(async (_, res, acct) => {
  const result = await safeGET(`/api/${acct}/posts`);
  res.json(result);
}));

app.post('/api/posts', withAccount(async (req, res, acct) => {
  const result = await safePOST(`/api/${acct}/posts`, req.body);
  res.json(result);
}));

app.delete('/api/posts/:id', withAccount(async (req, res, acct) => {
  await safeDELETE(`/api/${acct}/posts/${req.params.id}`);
  res.json({ ok: true });
}));

app.get('/api/queue', withAccount(async (_, res, acct) => {
  const items = await safeGET(`/api/${acct}/queue`);
  res.json(items);
}));

app.put('/api/queue/:id', withAccount(async (req, res, acct) => {
  await safePUT(`/api/${acct}/queue/${req.params.id}`, {});
  res.json({ ok: true });
}));

app.get('/api/vault/lists', withAccount(async (_, res, acct) => {
  const lists = await safeGET(`/api/${acct}/media/vault/lists`);
  res.json(lists);
}));

app.post('/api/vault/lists', withAccount(async (req, res, acct) => {
  const result = await safePOST(`/api/${acct}/media/vault/lists`, req.body);
  res.json(result);
}));

app.put('/api/vault/lists/:id', withAccount(async (req, res, acct) => {
  const result = await safePUT(
    `/api/${acct}/media/vault/lists/${req.params.id}`,
    req.body
  );
  res.json(result);
}));

app.delete('/api/vault/lists/:id', withAccount(async (req, res, acct) => {
  await safeDELETE(`/api/${acct}/media/vault/lists/${req.params.id}`);
  res.json({ ok: true });
}));

//
// 9. Database-driven endpoints (LTV, settings, experiments, GDPR export)
//
app.get('/api/ltv', async (_, res) => {
  try {
    const result = await query('SELECT * FROM ltv_view');
    res.json({ rows: result.rows });
  } catch {
    res.status(500).json({ error: 'ltv fetch failed' });
  }
});

app.get('/api/fans', async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 100;
    const result = await query(
      `SELECT fan_id, display_name, username, subscription_status,
        COALESCE((SELECT SUM(amount) FROM transactions t WHERE t.fan_id=f.fan_id),0) AS spend_total,
        COALESCE((SELECT COUNT(*) FROM messages m WHERE m.fan_id=f.fan_id),0) AS msg_total
       FROM fans f
       ORDER BY fan_id
       LIMIT $1`,
      [limit]
    );
    res.json({ rows: result.rows });
  } catch {
    res.status(500).json({ error: 'fans fetch failed' });
  }
});

app.get('/api/settings', async (_, res) => {
  try {
    const rows = await query('SELECT key, value FROM settings');
    const obj = {};
    rows.rows.forEach(r => obj[r.key] = r.value === 'true');
    res.json(obj);
  } catch {
    res.status(500).json({ error: 'settings fetch failed' });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const { key, value } = req.body;
    await query(
      'INSERT INTO settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value',
      [key, String(value)]
    );
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'settings update failed' });
  }
});

app.post('/api/experiments', async (req, res) => {
  try {
    const { text } = req.body;
    const id = await runVariantExperiment(text);
    if (!id) return res.status(400).json({ error: 'no account' });
    res.json({ id });
  } catch {
    res.status(500).json({ error: 'experiment failed' });
  }
});

app.get('/api/experiments', async (_, res) => {
  try {
    const rows = await query('SELECT * FROM experiments');
    res.json(rows.rows);
  } catch {
    res.status(500).json({ error: 'experiments fetch failed' });
  }
});

app.get('/api/profile-visitors', withAccount(async (_, res, acct) => {
  const data = await safeGET(`/api/${acct}/statistics/reach/profile-visitors`);
  res.json({ count: data.data?.count || 0 });
}));

// GDPR export & delete
app.delete('/gdpr/export/:fanId', async (req, res) => {
  try {
    const fanId = req.params.fanId;
    const fan = await query('SELECT * FROM fans WHERE fan_id=$1', [fanId]);
    const messages = await query('SELECT * FROM messages WHERE fan_id=$1', [fanId]);
    const txns = await query('SELECT * FROM transactions WHERE fan_id=$1', [fanId]);
    res.json({ fan: fan.rows[0], messages: messages.rows, transactions: txns.rows });
    await query('DELETE FROM messages WHERE fan_id=$1', [fanId]);
    await query('DELETE FROM transactions WHERE fan_id=$1', [fanId]);
    await query('DELETE FROM fans WHERE fan_id=$1', [fanId]);
  } catch {
    res.status(500).json({ error: 'gdpr export failed' });
  }
});

// Tracking links & subscribers
app.get('/api/tracking-links', withAccount(async (_, res, acct) => {
  const data = await safeGET(`/api/${acct}/tracking-links`);
  res.json(data.data || []);
}));

app.get('/api/tracking-links/:id/subscribers', withAccount(async (req, res, acct) => {
  const data = await safeGET(`/api/${acct}/tracking-links/${req.params.id}/subscribers`);
  res.json(data.data || []);
}));

// Profiles search & fetch
app.get('/api/profiles/search', async (req, res) => {
  try {
    const q = req.query.search || '';
    const data = await safeGET(`/api/search?search=${encodeURIComponent(q)}`);
    res.json(data.data || []);
  } catch {
    res.status(500).json({ error: 'profile search failed' });
  }
});

app.get('/api/profiles/:username', async (req, res) => {
  try {
    const data = await safeGET(`/api/profiles/${encodeURIComponent(req.params.username)}`);
    res.json(data);
  } catch {
    res.status(500).json({ error: 'profile fetch failed' });
  }
});

// Saved-for-later endpoints (messages & posts)
app.get('/api/saved-messages', withAccount(async (_, res, acct) => {
  const data = await safeGET(`/api/${acct}/saved-for-later/messages`);
  res.json(data.data || []);
}));

app.get('/api/saved-messages/settings', withAccount(async (_, res, acct) => {
  const data = await safeGET(`/api/${acct}/saved-for-later/messages/settings`);
  res.json(data);
}));

app.post('/api/saved-messages/settings', withAccount(async (req, res, acct) => {
  const data = await safePATCH(`/api/${acct}/saved-for-later/messages`, req.body);
  res.json(data);
}));

app.post('/api/saved-messages/disable', withAccount(async (_, res, acct) => {
  const data = await safePATCH(`/api/${acct}/saved-for-later/messages/disable`, {});
  res.json(data);
}));

app.get('/api/saved-posts', withAccount(async (_, res, acct) => {
  const data = await safeGET(`/api/${acct}/saved-for-later/posts`);
  res.json(data.data || []);
}));

app.get('/api/saved-posts/settings', withAccount(async (_, res, acct) => {
  const data = await safeGET(`/api/${acct}/saved-for-later/posts/settings`);
  res.json(data);
}));

app.post('/api/saved-posts/settings', withAccount(async (req, res, acct) => {
  const data = await safePATCH(`/api/${acct}/saved-for-later/posts`, req.body);
  res.json(data);
}));

app.post('/api/saved-posts/disable', withAccount(async (_, res, acct) => {
  const data = await safePATCH(`/api/${acct}/saved-for-later/posts/disable`, {});
  res.json(data);
}));

// Questionnaire fetch
app.get('/api/questionnaire', async (_, res) => {
  try {
    const rows = await query('SELECT * FROM questionnaire_answers');
    res.json(rows.rows);
  } catch {
    res.status(500).json({ error: 'questionnaire fetch failed' });
  }
});

// Global error handler
app.use((err, _, res, __) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

//
// 10. Static file serving for Vue app
//
const __filename2 = fileURLToPath(import.meta.url);
const __dirname2 = path.dirname(__filename2);

app.use(express.static(path.resolve(__dirname2, '../../dist')));

app.get('*', (req, res) => {
  const indexHtml = path.resolve(__dirname2, '../../dist/index.html');
  if (fs.existsSync(indexHtml)) {
    res.sendFile(indexHtml);
  } else {
    res.status(404).send('Build not found. Please run `npm run build`.');
  }
});

//
// 11. Start cron jobs and server
//
const PORT = process.env.PORT || 3000;
startCronJobs();
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

/*  End of File – Last modified 2025-07-20 */
