import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database('gamma.db');

// Initialize Database & Migrations
db.exec(`
  CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    gender TEXT NOT NULL,
    lastEdited TEXT NOT NULL,
    created TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS phone_numbers (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    provider TEXT NOT NULL,
    number TEXT NOT NULL,
    sid TEXT,
    token TEXT NOT NULL,
    inboundAgentId TEXT,
    outboundAgentId TEXT,
    verified INTEGER DEFAULT 0,
    verifiedAt TEXT,
    created TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS knowledge_base (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL,
    created TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    leads INTEGER NOT NULL DEFAULT 0,
    attempted INTEGER NOT NULL DEFAULT 0,
    connected INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    startTime TEXT,
    endTime TEXT,
    callingDays TEXT,
    timezone TEXT,
    created TEXT NOT NULL,
    lastRan TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS calls (
    id TEXT PRIMARY KEY,
    campaignId TEXT NOT NULL,
    phoneNumber TEXT NOT NULL,
    status TEXT NOT NULL,
    duration INTEGER DEFAULT 0,
    attemptedTime TEXT,
    created TEXT NOT NULL,
    FOREIGN KEY(campaignId) REFERENCES campaigns(id)
  );
`);

// Migration: Add missing columns if they don't exist
try {
  db.prepare('ALTER TABLE phone_numbers ADD COLUMN verified INTEGER DEFAULT 0').run();
  db.prepare('ALTER TABLE phone_numbers ADD COLUMN verifiedAt TEXT').run();
} catch (e) {}

try {
  db.prepare('ALTER TABLE campaigns ADD COLUMN startTime TEXT').run();
  db.prepare('ALTER TABLE campaigns ADD COLUMN endTime TEXT').run();
  db.prepare('ALTER TABLE campaigns ADD COLUMN callingDays TEXT').run();
  db.prepare('ALTER TABLE campaigns ADD COLUMN timezone TEXT').run();
} catch (e) {}

try {
  db.prepare('ALTER TABLE campaigns ADD COLUMN leads INTEGER DEFAULT 0').run();
  db.prepare('ALTER TABLE campaigns ADD COLUMN attempted INTEGER DEFAULT 0').run();
  db.prepare('ALTER TABLE campaigns ADD COLUMN connected INTEGER DEFAULT 0').run();
} catch (e) {}

// Seed data if empty
const agentCount = db.prepare('SELECT count(*) as count FROM agents').get() as { count: number };
if (agentCount.count === 0) {
  const insertAgent = db.prepare('INSERT INTO agents (id, name, type, gender, lastEdited, created) VALUES (?, ?, ?, ?, ?, ?)');
  insertAgent.run('1', 'Test Agent', 'phone', 'Female', '2/27/2026 03:16 PM', '2/27/2026 02:08 PM');
  insertAgent.run('2', 'Rajesh (multi-lingual)', 'phone', 'Male', '2/25/2026 06:25 PM', '2/23/2026 06:12 PM');

  const insertPhone = db.prepare('INSERT INTO phone_numbers (id, type, provider, number, sid, token, verified, verifiedAt, created) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  insertPhone.run('1', 'phone', 'Plivo', '+918031138753', null, 'token_plivo_1', 1, '2/27/2026 02:22 PM', '2/27/2026 02:22 PM');
  insertPhone.run('2', 'phone', 'Twilio', '+18392255038', 'sid_twilio_1', 'token_twilio_1', 1, '1/30/2026 11:49 AM', '1/30/2026 11:49 AM');

  const insertKB = db.prepare('INSERT INTO knowledge_base (id, name, description, status, created) VALUES (?, ?, ?, ?, ?)');
  insertKB.run('1', 'HR policies', 'No description provided.', 'processed', '2/27/2026');

  const insertCampaign = db.prepare('INSERT INTO campaigns (id, name, leads, attempted, connected, status, startTime, endTime, callingDays, timezone, created, lastRan) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  insertCampaign.run('1', 'DEMO1', 2, 0, 0, 'frozen', '9:00 AM', '5:00 PM', 'Mon to Fri', 'Asia/Calcutta', '2/28/2026 11:07 AM', '2/28/2026 11:07 AM');
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API ROUTES ---

  // Stats
  app.get('/api/stats', (req, res) => {
    const totalCalls = db.prepare('SELECT count(*) as count FROM calls').get() as { count: number };
    const totalMinutes = db.prepare('SELECT sum(duration) as sum FROM calls').get() as { sum: number };
    const agentsCount = db.prepare('SELECT count(*) as count FROM agents').get() as { count: number };
    res.json({
      totalCalls: totalCalls.count,
      totalMinutes: Math.round((totalMinutes.sum || 0) / 60),
      agentsCount: agentsCount.count,
      inboundCalls: 0,
      outboundCalls: totalCalls.count,
      inboundMinutes: 0,
      outboundMinutes: Math.round((totalMinutes.sum || 0) / 60),
    });
  });

  // Agents
  app.get('/api/agents', (req, res) => {
    const agents = db.prepare('SELECT * FROM agents').all();
    res.json(agents);
  });

  app.post('/api/agents', (req, res) => {
    const { name, type, gender } = req.body;
    const id = Math.random().toString(36).substr(2, 9);
    const now = new Date().toLocaleString();
    db.prepare('INSERT INTO agents (id, name, type, gender, lastEdited, created) VALUES (?, ?, ?, ?, ?, ?)').run(id, name, type, gender, now, now);
    res.status(201).json({ id, name, type, gender, lastEdited: now, created: now });
  });

  app.delete('/api/agents/:id', (req, res) => {
    db.prepare('DELETE FROM agents WHERE id = ?').run(req.params.id);
    res.status(204).send();
  });

  // Phone Numbers
  app.get('/api/phone-numbers', (req, res) => {
    const numbers = db.prepare('SELECT * FROM phone_numbers').all();
    res.json(numbers);
  });

  app.post('/api/phone-numbers/verify', (req, res) => {
    // Standalone verification simulation
    const { provider, sid, token } = req.body;
    if (!token || (provider === 'Twilio' && !sid)) {
      return res.status(400).json({ success: false, error: 'Missing credentials' });
    }
    // Simulate network delay
    setTimeout(() => res.json({ success: true }), 500);
  });

  app.post('/api/phone-numbers', (req, res) => {
    const { type, provider, number, sid, token } = req.body;
    const id = Math.random().toString(36).substr(2, 9);
    const now = new Date().toLocaleString();
    // Simulate verification before saving
    const verified = 1; 
    db.prepare('INSERT INTO phone_numbers (id, type, provider, number, sid, token, verified, verifiedAt, created) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, type, provider, number, sid, token, verified, now, now);
    res.status(201).json({ id, type, provider, number, sid, token, verified, verifiedAt: now, created: now });
  });

  app.patch('/api/phone-numbers/:id/verify', (req, res) => {
    const now = new Date().toLocaleString();
    db.prepare('UPDATE phone_numbers SET verified = 1, verifiedAt = ? WHERE id = ?').run(now, req.params.id);
    res.json({ success: true, verifiedAt: now });
  });

  app.delete('/api/phone-numbers/:id', (req, res) => {
    db.prepare('DELETE FROM phone_numbers WHERE id = ?').run(req.params.id);
    res.status(204).send();
  });

  // Knowledge Base
  app.get('/api/knowledge-base', (req, res) => {
    const kb = db.prepare('SELECT * FROM knowledge_base').all();
    res.json(kb);
  });

  app.post('/api/knowledge-base', (req, res) => {
    const { name, description } = req.body;
    const id = Math.random().toString(36).substr(2, 9);
    const now = new Date().toLocaleDateString();
    db.prepare('INSERT INTO knowledge_base (id, name, description, status, created) VALUES (?, ?, ?, ?, ?)').run(id, name, description, 'processed', now);
    res.status(201).json({ id, name, description, status: 'processed', created: now });
  });

  app.delete('/api/knowledge-base/:id', (req, res) => {
    db.prepare('DELETE FROM knowledge_base WHERE id = ?').run(req.params.id);
    res.status(204).send();
  });

  // Campaigns
  app.get('/api/campaigns', (req, res) => {
    const campaigns = db.prepare('SELECT * FROM campaigns').all();
    res.json(campaigns);
  });

  app.get('/api/campaigns/:id', (req, res) => {
    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    const logs = db.prepare('SELECT * FROM calls WHERE campaignId = ?').all();
    res.json({ ...campaign, logs });
  });

  app.post('/api/campaigns', (req, res) => {
    const { name, startTime, endTime, callingDays, timezone } = req.body;
    const id = Math.random().toString(36).substr(2, 9);
    const now = new Date().toLocaleString();
    db.prepare('INSERT INTO campaigns (id, name, leads, attempted, connected, status, startTime, endTime, callingDays, timezone, created, lastRan) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, name, 0, 0, 0, 'frozen', startTime, endTime, callingDays, timezone, now, now);
    res.status(201).json({ id, name, leads: 0, attempted: 0, connected: 0, status: 'frozen', startTime, endTime, callingDays, timezone, created: now, lastRan: now });
  });

  app.delete('/api/campaigns/:id', (req, res) => {
    db.prepare('DELETE FROM calls WHERE campaignId = ?').run(req.params.id);
    db.prepare('DELETE FROM campaigns WHERE id = ?').run(req.params.id);
    res.status(204).send();
  });

  // --- VITE / STATIC SERVING ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Gamma Server running on http://localhost:${PORT}`);
  });
}

startServer();
