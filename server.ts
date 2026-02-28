import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database('gamma.db');
const uploadsDir = path.join(__dirname, 'uploads', 'knowledge-base');
fs.mkdirSync(uploadsDir, { recursive: true });

const APP_PORT = Number(process.env.PORT || 3000);
const HUBSPOT_REDIRECT_URI = process.env.HUBSPOT_REDIRECT_URI || `http://localhost:${APP_PORT}/api/integrations/hubspot/callback`;

db.pragma('foreign_keys = ON');

const randomId = () => crypto.randomUUID();
const nowIso = () => new Date().toISOString();

const encryptionKey = crypto
  .createHash('sha256')
  .update(process.env.TOKEN_ENCRYPTION_KEY || 'gamma-dev-encryption-key')
  .digest();

function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}


function decryptSecret(payload: string): string {
  const raw = Buffer.from(payload, 'base64');
  const iv = raw.subarray(0, 12);
  const authTag = raw.subarray(12, 28);
  const encrypted = raw.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

function createTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('phone', 'whatsapp', 'voice_blaster')),
      gender TEXT NOT NULL CHECK(gender IN ('Male', 'Female')),
      created TEXT NOT NULL,
      lastEdited TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS phone_numbers (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('phone', 'whatsapp')),
      provider TEXT NOT NULL CHECK(provider IN ('Twilio', 'Plivo', 'Telnyx')),
      number TEXT NOT NULL,
      sid TEXT,
      token_enc TEXT NOT NULL,
      inboundAgentId TEXT,
      outboundAgentId TEXT,
      verified INTEGER NOT NULL DEFAULT 0,
      verifiedAt TEXT,
      created TEXT NOT NULL,
      FOREIGN KEY(inboundAgentId) REFERENCES agents(id) ON DELETE SET NULL,
      FOREIGN KEY(outboundAgentId) REFERENCES agents(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS knowledge_base (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      fileName TEXT,
      filePath TEXT,
      mimeType TEXT,
      fileSize INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processed')),
      created TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      leads INTEGER NOT NULL DEFAULT 0,
      attempted INTEGER NOT NULL DEFAULT 0,
      connected INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'frozen' CHECK(status IN ('frozen', 'running', 'completed', 'failed')),
      startTime TEXT,
      endTime TEXT,
      timezone TEXT,
      callingDays TEXT,
      created TEXT NOT NULL,
      lastRan TEXT
    );

    CREATE TABLE IF NOT EXISTS calls (
      id TEXT PRIMARY KEY,
      campaignId TEXT NOT NULL,
      phoneNumber TEXT NOT NULL,
      status TEXT NOT NULL,
      direction TEXT NOT NULL DEFAULT 'outbound' CHECK(direction IN ('inbound', 'outbound')),
      duration INTEGER NOT NULL DEFAULT 0,
      attemptedTime TEXT,
      created TEXT NOT NULL,
      FOREIGN KEY(campaignId) REFERENCES campaigns(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS integrations (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL UNIQUE,
      access_token_enc TEXT NOT NULL,
      connected INTEGER NOT NULL DEFAULT 1,
      connectedAt TEXT NOT NULL
    );
  `);
}

function addColumnIfMissing(table: string, column: string, def: string) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!columns.some((col) => col.name === column)) {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`).run();
  }
}

function runMigrations() {
  addColumnIfMissing('phone_numbers', 'verified', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfMissing('phone_numbers', 'verifiedAt', 'TEXT');
  addColumnIfMissing('phone_numbers', 'inboundAgentId', 'TEXT');
  addColumnIfMissing('phone_numbers', 'outboundAgentId', 'TEXT');
  addColumnIfMissing('phone_numbers', 'token_enc', "TEXT NOT NULL DEFAULT ''");
  try {
    db.prepare("UPDATE phone_numbers SET token_enc = token WHERE token_enc = '' AND token IS NOT NULL").run();
  } catch {
    // old schema might not include token; ignore
  }

  addColumnIfMissing('knowledge_base', 'fileName', 'TEXT');
  addColumnIfMissing('knowledge_base', 'filePath', 'TEXT');
  addColumnIfMissing('knowledge_base', 'mimeType', 'TEXT');
  addColumnIfMissing('knowledge_base', 'fileSize', 'INTEGER DEFAULT 0');

  addColumnIfMissing('campaigns', 'startTime', 'TEXT');
  addColumnIfMissing('campaigns', 'endTime', 'TEXT');
  addColumnIfMissing('campaigns', 'timezone', 'TEXT');
  addColumnIfMissing('campaigns', 'callingDays', 'TEXT');
  addColumnIfMissing('campaigns', 'leads', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfMissing('campaigns', 'attempted', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfMissing('campaigns', 'connected', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfMissing('campaigns', 'lastRan', 'TEXT');

  addColumnIfMissing('calls', 'direction', "TEXT NOT NULL DEFAULT 'outbound'");
}

createTables();
runMigrations();

async function verifyTelephonyCredentials(provider: string, sid: string | undefined, token: string, number?: string) {
  if (provider === 'Twilio') {
    if (!sid) {
      throw new Error('Twilio SID is required');
    }
    const auth = Buffer.from(`${sid}:${token}`).toString('base64');
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}.json`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!response.ok) {
      throw new Error('Twilio credential verification failed');
    }
    return;
  }

  if (provider === 'Telnyx') {
    if (!number) {
      throw new Error('Phone number is required for Telnyx verification');
    }
    const response = await fetch(`https://api.telnyx.com/v2/phone_numbers?filter[phone_number]=${encodeURIComponent(number)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      throw new Error('Telnyx credential verification failed');
    }
    return;
  }

  if (provider === 'Plivo') {
    if (!sid) {
      throw new Error('Plivo Auth ID is required in SID field');
    }
    const auth = Buffer.from(`${sid}:${token}`).toString('base64');
    const response = await fetch(`https://api.plivo.com/v1/Account/${encodeURIComponent(sid)}/`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!response.ok) {
      throw new Error('Plivo credential verification failed');
    }
    return;
  }

  throw new Error('Unsupported provider');
}

function calculateConcurrency(calls: Array<{ attemptedTime: string; duration: number }>): number {
  const events: Array<{ t: number; d: number }> = [];
  for (const call of calls) {
    const start = new Date(call.attemptedTime).getTime();
    if (Number.isNaN(start)) continue;
    const end = start + Math.max(call.duration, 1) * 1000;
    events.push({ t: start, d: 1 });
    events.push({ t: end, d: -1 });
  }

  events.sort((a, b) => a.t - b.t || b.d - a.d);
  let current = 0;
  let max = 0;
  for (const event of events) {
    current += event.d;
    max = Math.max(max, current);
  }
  return max;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '12mb' }));
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  app.get('/api/stats', (_req, res) => {
    const totalCalls = db.prepare('SELECT COUNT(*) as total FROM calls').get() as { total: number };
    const duration = db.prepare('SELECT COALESCE(SUM(duration), 0) as totalDuration FROM calls').get() as { totalDuration: number };
    const inbound = db.prepare("SELECT COUNT(*) as count, COALESCE(SUM(duration),0) as sum FROM calls WHERE direction = 'inbound'").get() as { count: number; sum: number };
    const outbound = db.prepare("SELECT COUNT(*) as count, COALESCE(SUM(duration),0) as sum FROM calls WHERE direction = 'outbound'").get() as { count: number; sum: number };
    const callsForConcurrency = db.prepare('SELECT attemptedTime, duration FROM calls WHERE attemptedTime IS NOT NULL').all() as Array<{ attemptedTime: string; duration: number }>;

    const dailyTrend = db
      .prepare(`
        SELECT
          strftime('%Y-%m-%d', attemptedTime) AS day,
          SUM(CASE WHEN direction='inbound' THEN 1 ELSE 0 END) AS inbound,
          SUM(CASE WHEN direction='outbound' THEN 1 ELSE 0 END) AS outbound
        FROM calls
        WHERE attemptedTime IS NOT NULL
        GROUP BY day
        ORDER BY day DESC
        LIMIT 14
      `)
      .all()
      .reverse();

    const campaignStats = db.prepare('SELECT id, name, leads, attempted, connected, status FROM campaigns ORDER BY created DESC').all();

    res.json({
      totalCalls: totalCalls.total,
      totalMinutes: Math.round(duration.totalDuration / 60),
      inboundCalls: inbound.count,
      outboundCalls: outbound.count,
      inboundMinutes: Math.round(inbound.sum / 60),
      outboundMinutes: Math.round(outbound.sum / 60),
      concurrency: calculateConcurrency(callsForConcurrency),
      campaignStats,
      dailyTrend,
    });
  });

  app.get('/api/agents', (_req, res) => {
    const rows = db.prepare('SELECT id, name, type, gender, created, lastEdited FROM agents ORDER BY created DESC').all();
    res.json(rows);
  });

  app.post('/api/agents', (req, res) => {
    const { name, type, gender } = req.body as { name?: string; type?: string; gender?: string };
    if (!name || !type || !gender) return res.status(400).json({ error: 'name, type and gender are required' });
    if (!['phone', 'whatsapp', 'voice_blaster'].includes(type)) return res.status(400).json({ error: 'Invalid agent type' });
    if (!['Male', 'Female'].includes(gender)) return res.status(400).json({ error: 'Invalid gender' });

    const id = randomId();
    const now = nowIso();
    db.prepare('INSERT INTO agents (id, name, type, gender, created, lastEdited) VALUES (?, ?, ?, ?, ?, ?)').run(id, name.trim(), type, gender, now, now);
    res.status(201).json({ id, name: name.trim(), type, gender, created: now, lastEdited: now });
  });

  app.delete('/api/agents/:id', (req, res) => {
    db.prepare('UPDATE phone_numbers SET inboundAgentId = NULL WHERE inboundAgentId = ?').run(req.params.id);
    db.prepare('UPDATE phone_numbers SET outboundAgentId = NULL WHERE outboundAgentId = ?').run(req.params.id);
    const info = db.prepare('DELETE FROM agents WHERE id = ?').run(req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Agent not found' });
    return res.status(204).send();
  });

  app.get('/api/phone-numbers', (_req, res) => {
    const rows = db
      .prepare('SELECT id, type, provider, number, sid, inboundAgentId, outboundAgentId, verified, verifiedAt, created FROM phone_numbers ORDER BY created DESC')
      .all();
    res.json(rows);
  });

  app.post('/api/phone-numbers/verify', async (req, res) => {
    const { provider, sid, token, number } = req.body as { provider?: string; sid?: string; token?: string; number?: string };
    if (!provider || !token) return res.status(400).json({ success: false, error: 'provider and token are required' });
    try {
      await verifyTelephonyCredentials(provider, sid, token, number);
      return res.json({ success: true });
    } catch (error: any) {
      return res.status(400).json({ success: false, error: error.message || 'Verification failed' });
    }
  });

  app.post('/api/phone-numbers', async (req, res) => {
    const { type, provider, number, sid, token, inboundAgentId, outboundAgentId } = req.body as Record<string, string>;
    if (!type || !provider || !number || !token) return res.status(400).json({ error: 'type, provider, number and token are required' });
    if (!['phone', 'whatsapp'].includes(type)) return res.status(400).json({ error: 'Invalid number type' });
    if (!['Twilio', 'Plivo', 'Telnyx'].includes(provider)) return res.status(400).json({ error: 'Invalid provider' });

    try {
      await verifyTelephonyCredentials(provider, sid, token, number);
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Credential validation failed' });
    }

    const id = randomId();
    const created = nowIso();
    const verifiedAt = nowIso();
    const tokenEnc = encryptSecret(token);

    db.prepare(
      'INSERT INTO phone_numbers (id, type, provider, number, sid, token_enc, inboundAgentId, outboundAgentId, verified, verifiedAt, created) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)'
    ).run(id, type, provider, number, sid || null, tokenEnc, inboundAgentId || null, outboundAgentId || null, verifiedAt, created);

    res.status(201).json({ id, type, provider, number, sid: sid || null, inboundAgentId: inboundAgentId || null, outboundAgentId: outboundAgentId || null, verified: 1, verifiedAt, created });
  });

  app.patch('/api/phone-numbers/:id/verify', async (req, res) => {
    const row = db.prepare('SELECT provider, sid, number, token_enc FROM phone_numbers WHERE id = ?').get(req.params.id) as any;
    if (!row) return res.status(404).json({ error: 'Phone number not found' });

    try {
      const token = decryptSecret(row.token_enc);
      await verifyTelephonyCredentials(row.provider, row.sid || undefined, token, row.number);
      const verifiedAt = nowIso();
      db.prepare('UPDATE phone_numbers SET verified = 1, verifiedAt = ? WHERE id = ?').run(verifiedAt, req.params.id);
      return res.json({ success: true, verifiedAt });
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Verification failed' });
    }
  });

  app.delete('/api/phone-numbers/:id', (req, res) => {
    const info = db.prepare('DELETE FROM phone_numbers WHERE id = ?').run(req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Phone number not found' });
    return res.status(204).send();
  });

  app.get('/api/knowledge-base', (_req, res) => {
    const rows = db.prepare('SELECT id, name, description, fileName, mimeType, fileSize, status, created FROM knowledge_base ORDER BY created DESC').all();
    res.json(rows);
  });

  app.post('/api/knowledge-base', (req, res) => {
    const { name, description = '', fileName, fileContentBase64, mimeType } = req.body as Record<string, string>;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const allowed = new Set(['.pdf', '.docx', '.txt', '.md']);
    let savedPath: string | null = null;
    let size = 0;
    let status: 'pending' | 'processed' = 'pending';

    if (fileName || fileContentBase64) {
      if (!fileName || !fileContentBase64) return res.status(400).json({ error: 'fileName and fileContentBase64 are both required when uploading' });
      const ext = path.extname(fileName).toLowerCase();
      if (!allowed.has(ext)) return res.status(400).json({ error: 'Only PDF, DOCX, TXT and MD files are allowed' });
      const buffer = Buffer.from(fileContentBase64, 'base64');
      size = buffer.length;
      if (size > 10 * 1024 * 1024) return res.status(400).json({ error: 'File exceeds 10MB limit' });

      const diskName = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
      savedPath = path.join('uploads', 'knowledge-base', diskName);
      fs.writeFileSync(path.join(__dirname, savedPath), buffer);
      status = 'processed';
    }

    const id = randomId();
    const created = nowIso();
    db.prepare('INSERT INTO knowledge_base (id, name, description, fileName, filePath, mimeType, fileSize, status, created) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
      id,
      name.trim(),
      description,
      fileName || null,
      savedPath,
      mimeType || null,
      size,
      status,
      created
    );

    res.status(201).json({ id, name: name.trim(), description, fileName: fileName || null, mimeType: mimeType || null, fileSize: size, status, created });
  });

  app.delete('/api/knowledge-base/:id', (req, res) => {
    const row = db.prepare('SELECT filePath FROM knowledge_base WHERE id = ?').get(req.params.id) as { filePath?: string } | undefined;
    if (!row) return res.status(404).json({ error: 'Knowledge base item not found' });
    if (row.filePath) {
      const absolute = path.join(__dirname, row.filePath);
      if (fs.existsSync(absolute)) fs.unlinkSync(absolute);
    }
    db.prepare('DELETE FROM knowledge_base WHERE id = ?').run(req.params.id);
    return res.status(204).send();
  });

  app.get('/api/integrations/hubspot/status', (_req, res) => {
    const row = db.prepare("SELECT connected, connectedAt FROM integrations WHERE provider = 'hubspot'").get() as any;
    res.json({ connected: !!row?.connected, connectedAt: row?.connectedAt || null });
  });

  app.get('/api/integrations/hubspot/connect', (_req, res) => {
    const clientId = process.env.HUBSPOT_CLIENT_ID;
    if (!clientId) return res.status(500).json({ error: 'HUBSPOT_CLIENT_ID is not configured' });
    const state = crypto.randomBytes(8).toString('hex');
    const scopes = encodeURIComponent('crm.objects.contacts.read crm.objects.contacts.write oauth');
    const redirectUri = encodeURIComponent(HUBSPOT_REDIRECT_URI);
    return res.redirect(`https://app.hubspot.com/oauth/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${redirectUri}&scope=${scopes}&state=${state}`);
  });

  app.get('/api/integrations/hubspot/callback', async (req, res) => {
    const code = String(req.query.code || '');
    if (!code) return res.status(400).send('Missing authorization code');

    const clientId = process.env.HUBSPOT_CLIENT_ID;
    const clientSecret = process.env.HUBSPOT_CLIENT_SECRET;
    if (!clientId || !clientSecret) return res.status(500).send('HubSpot credentials are not configured');

    const body = new URLSearchParams({ grant_type: 'authorization_code', client_id: clientId, client_secret: clientSecret, redirect_uri: HUBSPOT_REDIRECT_URI, code });
    const tokenResponse = await fetch('https://api.hubapi.com/oauth/v1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!tokenResponse.ok) {
      const msg = await tokenResponse.text();
      return res.status(400).send(`HubSpot token exchange failed: ${msg}`);
    }

    const tokenPayload = (await tokenResponse.json()) as { access_token: string };
    const encrypted = encryptSecret(tokenPayload.access_token);
    db.prepare(
      `INSERT INTO integrations (id, provider, access_token_enc, connected, connectedAt)
       VALUES (?, 'hubspot', ?, 1, ?)
       ON CONFLICT(provider) DO UPDATE SET access_token_enc = excluded.access_token_enc, connected = 1, connectedAt = excluded.connectedAt`
    ).run(randomId(), encrypted, nowIso());

    return res.send('HubSpot connected successfully. You can close this tab.');
  });

  app.get('/api/campaigns', (_req, res) => {
    const rows = db.prepare('SELECT * FROM campaigns ORDER BY created DESC').all();
    res.json(rows);
  });

  app.get('/api/campaigns/:id', (req, res) => {
    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    const logs = db.prepare('SELECT * FROM calls WHERE campaignId = ? ORDER BY created DESC').all(req.params.id);
    return res.json({ ...campaign, logs });
  });

  app.post('/api/campaigns', (req, res) => {
    const { name, startTime, endTime, timezone, callingDays, leads = 0 } = req.body as Record<string, string | number>;
    if (!name) return res.status(400).json({ error: 'Campaign name is required' });

    const id = randomId();
    const created = nowIso();
    db.prepare('INSERT INTO campaigns (id, name, leads, attempted, connected, status, startTime, endTime, timezone, callingDays, created, lastRan) VALUES (?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?, NULL)').run(
      id,
      String(name).trim(),
      Number(leads || 0),
      'frozen',
      String(startTime || ''),
      String(endTime || ''),
      String(timezone || ''),
      String(callingDays || ''),
      created
    );

    const row = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id);
    return res.status(201).json(row);
  });

  app.post('/api/campaigns/:id/run', (req, res) => {
    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id) as any;
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    const requestedLeads = Number(req.body?.leads ?? campaign.leads ?? 0);
    const leadsToProcess = Math.max(requestedLeads, 1);
    const statuses = ['completed', 'failed', 'completed', 'completed'];

    let attempted = 0;
    let connected = 0;

    const insertCall = db.prepare('INSERT INTO calls (id, campaignId, phoneNumber, status, direction, duration, attemptedTime, created) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    for (let i = 0; i < leadsToProcess; i += 1) {
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const duration = status === 'completed' ? Math.floor(Math.random() * 240) + 20 : Math.floor(Math.random() * 20);
      const attemptedTime = new Date(Date.now() - i * 60_000).toISOString();
      insertCall.run(randomId(), campaign.id, `+1555${String(100000 + i).slice(-6)}`, status, 'outbound', duration, attemptedTime, nowIso());
      attempted += 1;
      if (status === 'completed') connected += 1;
    }

    const lastRan = nowIso();
    db.prepare('UPDATE campaigns SET status = ?, attempted = attempted + ?, connected = connected + ?, lastRan = ?, leads = MAX(leads, ?) WHERE id = ?').run(
      'running',
      attempted,
      connected,
      lastRan,
      leadsToProcess,
      campaign.id
    );

    const updated = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaign.id);
    return res.json(updated);
  });

  app.delete('/api/campaigns/:id', (req, res) => {
    const info = db.prepare('DELETE FROM campaigns WHERE id = ?').run(req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Campaign not found' });
    return res.status(204).send();
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(APP_PORT, '0.0.0.0', () => {
    console.log(`Gamma Server running on http://localhost:${APP_PORT}`);
  });
}

startServer();
