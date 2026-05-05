const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const Pino = require('pino');
const axios = require('axios');
const makeWASocket = require('@whiskeysockets/baileys').default;
const { useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');

// ========== CONFIG ==========
const PORT = process.env.PORT || 3000;
const OWNERS = ['254700000001', '254700000002']; // CHANGE
const DEVELOPER_NUMBERS = ['254700000001', '254700000002'];
const GROUP_INVITE_CODE = 'YOUR_GROUP_INVITE_CODE'; // CHANGE
const MAX_SESSIONS = 30;
let PREFIX = '.';
let BOT_NAME = 'DARKWEB AI';
let BOT_IMAGE_URL = null;

// ========== STORAGE (in-memory, can use JSON later) ==========
let activeSessions = new Map(); // sessionId -> { sock, phoneNumber, connectedAt }
let pairingRequests = new Map(); // sessionId -> pending promise resolvers

// ========== EXPRESS ==========
const app = express();
app.use(cors());
app.use(express.json());

// ---------- API ROUTES ----------
app.get('/api/status', (req, res) => {
    res.json({
        sessions: activeSessions.size,
        maxSessions: MAX_SESSIONS,
        uptime: Math.floor((Date.now() - global.startTime) / 1000)
    });
});

app.get('/api/sessions', (req, res) => {
    const sessions = Array.from(activeSessions.entries()).map(([id, data]) => ({
        sessionId: id,
        phoneNumber: data.phoneNumber,
        status: data.sock?.user ? 'connected' : 'reconnecting',
        connectedAt: data.connectedAt
    }));
    res.json({ sessions });
});

app.post('/api/connect', async (req, res) => {
    const { phone } = req.body;
    const cleaned = phone.replace(/\D/g, '');
    if (!cleaned || cleaned.length < 7 || cleaned.length > 15) {
        return res.status(400).json({ error: 'Invalid phone number' });
    }
    const sessionId = `session_${Date.now()}_${cleaned}`;

    try {
        const code = await startWhatsAppSessionAndGetCode(sessionId, cleaned);
        res.json({ success: true, code: code });
    } catch (err) {
        console.error('Pairing error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/join-group', async (req, res) => {
    const { phoneNumber, inviteCode } = req.body;
    if (!phoneNumber || !inviteCode) return res.json({ ok: false, error: 'Missing info' });
    for (const [id, data] of activeSessions.entries()) {
        if (data.phoneNumber === phoneNumber && data.sock) {
            try {
                await data.sock.groupAcceptInvite(inviteCode);
                return res.json({ ok: true });
            } catch (err) {
                return res.json({ ok: false, error: err.message });
            }
        }
    }
    res.json({ ok: false, error: 'Session not found' });
});

app.post('/api/delsession', async (req, res) => {
    const { phone, password } = req.body;
    if (password !== 'admin123') return res.status(403).json({ error: 'Unauthorized' });
    for (const [id, data] of activeSessions.entries()) {
        if (data.phoneNumber === phone) {
            try { await data.sock?.end(); } catch(e) {}
            activeSessions.delete(id);
            const authPath = path.join(__dirname, `auth_${id}`);
            if (fs.existsSync(authPath)) fs.rmSync(authPath, { recursive: true, force: true });
            return res.json({ ok: true });
        }
    }
    res.json({ ok: false, error: 'Session not found' });
});

// ---------- Root: embed dangerous hacking theme ----------
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DARKWEB AI || FATAL ERROR</title>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      background:#000;
      font-family:'JetBrains Mono',monospace;
      color:#ff3333;
      min-height:100vh;
      padding:20px;
      position:relative;
    }
    body::before {
      content:"💀💀💀";
      font-size:200px;
      position:fixed;
      bottom:0;
      right:0;
      opacity:0.03;
      pointer-events:none;
      z-index:0;
    }
    .container {
      max-width:1000px;
      margin:0 auto;
      background:rgba(5,5,5,0.95);
      border:1px solid #ff0000;
      border-radius:20px;
      padding:2rem;
      position:relative;
      z-index:3;
      box-shadow:0 0 30px rgba(255,0,0,0.3);
    }
    .header { text-align:center; border-bottom:1px dashed #ff0000; padding-bottom:1rem; margin-bottom:2rem; }
    .skull { font-size:3rem; text-shadow:0 0 10px red; animation:pulseRed 1.5s infinite; }
    @keyframes pulseRed { 0%{opacity:0.6;} 100%{opacity:1;} }
    h1 { font-size:1.8rem; margin:10px 0; }
    .glitch { font-size:0.8rem; color:#aa0000; background:#000; display:inline-block; padding:4px 12px; border-left:3px solid red; animation:glitchText 1s infinite; }
    @keyframes glitchText { 0%{text-shadow:-1px 0 red;} 50%{text-shadow:1px 0 darkred;} 100%{text-shadow:0 0 red;} }
    .stats { display:flex; gap:1rem; margin-bottom:2rem; flex-wrap:wrap; }
    .stat-box { background:#0a0505; border:1px solid #5a1a1a; flex:1; padding:1rem; text-align:center; border-radius:12px; }
    .stat-value { font-size:2rem; font-weight:bold; color:#ff4444; }
    .terminals { background:#010101; border-left:4px solid red; padding:12px; font-size:0.8rem; margin-bottom:20px; color:#aa5555; }
    .input-group { margin:20px 0; }
    input { width:100%; background:#0a0505; border:1px solid #5a1a1a; padding:14px; color:#ff6666; font-size:1rem; border-radius:8px; }
    button { width:100%; background:linear-gradient(135deg,#aa0000,#330000); border:none; padding:14px; font-weight:bold; color:white; font-size:1rem; border-radius:8px; cursor:pointer; transition:0.2s; }
    button:hover { background:#ff0000; color:black; box-shadow:0 0 12px red; }
    .code-box { background:#020202; border:2px solid #ff0000; border-radius:20px; padding:1.5rem; text-align:center; margin-top:20px; display:none; }
    .code { font-size:2.2rem; letter-spacing:6px; color:#ff0000; font-weight:bold; }
    .warning { background:#1a0505; border-left:6px solid red; padding:12px; margin:20px 0; font-size:0.75rem; }
    .session-item { background:#0a0505; border:1px solid #5a1a1a; border-radius:12px; padding:10px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; }
    .delete-btn { background:#5a0000; border:none; padding:5px 12px; color:white; width:auto; }
    footer { text-align:center; margin-top:2rem; font-size:0.6rem; color:#6a1a1a; }
  </style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="skull">💀 ⚡ 💀</div>
    <h1>◤ DARKWEB AI ◥<br>⚠️ DANGER ZONE ⚠️</h1>
    <div class="glitch">[ SYSTEM BREACHED ] [ NO ESCAPE ]</div>
  </div>
  <div class="terminals">>_ READY FOR PAIRING</div>
  <div class="stats">
    <div class="stat-box"><div class="stat-label">>_ ACTIVE SESSIONS</div><div class="stat-value" id="statSessions">—</div></div>
    <div class="stat-box"><div class="stat-label">>_ UPTIME</div><div class="stat-value" id="statUptime">—</div></div>
    <div class="stat-box"><div class="stat-label">>_ MAX SLOTS</div><div class="stat-value">30</div></div>
  </div>
  <div class="warning">💀 THIS PANEL GRANTS ABSOLUTE CONTROL. MISUSE WILL BE LOGGED. 💀</div>
  <div class="input-group">
    <input type="tel" id="phone" placeholder="254712345678 (country code + number)" />
    <button id="pairBtn">⚡ EXECUTE PAIRING ⚡</button>
  </div>
  <div id="codeBox" class="code-box">
    <div>🔻 PAIRING CODE 🔻</div>
    <div class="code" id="pairCode"></div>
    <button id="copyBtn" style="margin-top:10px; background:#220000;">⎘ COPY CODE</button>
    <div style="font-size:0.7rem; margin-top:8px;">WhatsApp → Linked Devices → Link with number</div>
  </div>
  <div style="margin-top:30px;">
    <div style="border-bottom:1px solid red; margin-bottom:10px;">[ ACTIVE WEAPONS (SESSIONS) ]</div>
    <div id="sessionList">⏳ LOADING TARGETS...</div>
  </div>
  <footer>DARKWEB AI – TOTAL ANNIHILATION MODE // DEVELOPERS: ${DEVELOPER_NUMBERS.join(', ')}</footer>
</div>
<script>
  async function fetchJSON(url, opts) {
    const res = await fetch(url, opts);
    return res.json();
  }
  async function loadStatus() {
    try {
      const d = await fetchJSON('/api/status');
      document.getElementById('statSessions').innerText = d.sessions || 0;
      document.getElementById('statUptime').innerText = formatTime(d.uptime || 0);
    } catch(e) { console.warn(e); }
  }
  function formatTime(sec) {
    const h = Math.floor(sec/3600), m = Math.floor((sec%3600)/60);
    return h>0 ? h+'h '+m+'m' : m+'m';
  }
  async function loadSessions() {
    try {
      const d = await fetchJSON('/api/sessions');
      const list = d.sessions || [];
      if(!list.length) { document.getElementById('sessionList').innerHTML = '<div class="session-item">💀 NO ACTIVE SESSIONS 💀</div>'; return; }
      let html = '';
      for(let s of list) {
        html += \`<div class="session-item"><span><strong>\${s.phoneNumber}</strong> \${s.status === 'connected' ? '✅' : '⟳'}</span><button class="delete-btn" onclick="deleteSession('\${s.phoneNumber}')">DELETE</button></div>\`;
      }
      document.getElementById('sessionList').innerHTML = html;
    } catch(e) { document.getElementById('sessionList').innerHTML = '<div class="session-item">⚠️ FAILED TO FETCH</div>'; }
  }
  async function deleteSession(phone) {
    const pwd = prompt('ENTER ADMIN PASSWORD TO WIPE:');
    if(!pwd) return;
    try {
      const res = await fetch('/api/delsession', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ phone, password: pwd }) });
      const data = await res.json();
      alert(data.ok ? 'SESSION TERMINATED' : 'FAILED: '+data.error);
      loadSessions(); loadStatus();
    } catch(e) { alert('ERROR'); }
  }
  document.getElementById('pairBtn').addEventListener('click', async () => {
    const phone = document.getElementById('phone').value.trim();
    if(!phone.match(/^\\d{7,15}$/)) { alert('INVALID NUMBER. USE ONLY DIGITS, COUNTRY CODE FIRST.'); return; }
    const btn = document.getElementById('pairBtn');
    btn.disabled = true; btn.innerText = '⏳ REQUESTING...';
    try {
      const res = await fetch('/api/connect', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ phone }) });
      const data = await res.json();
      if(data.code) {
        document.getElementById('pairCode').innerText = data.code;
        document.getElementById('codeBox').style.display = 'block';
      } else alert('ERROR: ' + (data.error || 'UNKNOWN'));
      loadSessions(); loadStatus();
    } catch(e) { alert('SERVER ERROR: ' + e.message); }
    btn.disabled = false; btn.innerText = '⚡ EXECUTE PAIRING ⚡';
  });
  document.getElementById('copyBtn').addEventListener('click', () => {
    const code = document.getElementById('pairCode').innerText;
    navigator.clipboard.writeText(code).then(() => alert('💀 CODE COPIED 💀'));
  });
  setInterval(() => { loadStatus(); loadSessions(); }, 15000);
  loadStatus(); loadSessions();
</script>
</body>
</html>`);
});

// ========== WHATSAPP SESSION MANAGER (returns pairing code) ==========
async function startWhatsAppSessionAndGetCode(sessionId, phoneNumber) {
    return new Promise(async (resolve, reject) => {
        try {
            const { state, saveCreds } = await useMultiFileAuthState(`auth_${sessionId}`);
            const sock = makeWASocket({
                auth: state,
                printQRInTerminal: true,
                logger: Pino({ level: 'silent' }),
                browser: ['DARKWEB AI', 'Chrome', '116.0.0.0']
            });
            let resolved = false;
            sock.ev.on('creds.update', saveCreds);
            sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect } = update;
                if (connection === 'open' && !resolved) {
                    // already connected without pairing? shouldn't happen for new number
                }
                if (connection === 'close') {
                    const shouldReconnect = (lastDisconnect?.error instanceof Boom)?.output?.statusCode !== 401;
                    if (!shouldReconnect && !resolved) reject(new Error('Connection closed'));
                }
            });
            // Request pairing code after socket is ready
            setTimeout(async () => {
                try {
                    if (!sock.authState.creds.registered) {
                        const code = await sock.requestPairingCode(phoneNumber);
                        if (!resolved) {
                            resolved = true;
                            activeSessions.set(sessionId, { sock, phoneNumber, connectedAt: Date.now() });
                            resolve(code);
                        }
                    } else {
                        if (!resolved) reject(new Error('Already registered'));
                    }
                } catch (err) {
                    if (!resolved) reject(err);
                }
            }, 3000);
        } catch (err) {
            reject(err);
        }
    });
}

// ========== START SERVER ==========
global.startTime = Date.now();
const server = http.createServer(app);
server.listen(PORT, () => {
    console.log(`\n◤━━━━〔 DARKWEB AI 〕━━━━◥`);
    console.log(`      ⚠️  SYSTEM ONLINE  ⚠️`);
    console.log(`🌐 Web panel: http://localhost:${PORT}`);
    console.log(`🤖 WhatsApp pairing ready`);
    console.log(`◣━━━━━━━━━━━━━━━━━━━━━━◢\n`);
});
