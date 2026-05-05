// index.js – DARKWEB AI with embedded scary frontend
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const Pino = require('pino');
const makeWASocket = require('@whiskeysockets/baileys').default;
const { useMultiFileAuthState } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');

// ========== CONFIGURATION (adjust as needed) ==========
const config = {
    PORT: process.env.PORT || 3000,
    DEFAULT_PREFIX: '.',
    BOT_NAME: 'DARKWEB AI',
    MAX_SESSIONS: 10,
    GROUP_INVITE_CODE: '', // optional
};

// ========== UTILITIES (simplified) ==========
function formatUptime(secs) {
    const d = Math.floor(secs / 86400);
    const h = Math.floor((secs % 86400) / 3600);
    const m = Math.floor((secs % 3600) / 60);
    if (d) return `${d}d ${h}h`;
    if (h) return `${h}h ${m}m`;
    if (m) return `${m}m`;
    return `${secs}s`;
}

// ========== DATABASE MOCK (replace with real DB functions) ==========
// In production, replace these with your actual database calls
const db = {
    getSetting: async (key, def) => def,
    setSetting: async (key, val) => {},
    getAllBans: async () => [],
    setBan: async (phone, level, reason) => {},
    getAllPaired: async () => [],
    setPairedUser: async (phone, code) => {},
    cleanupExpiredTempBans: async () => {},
};

// ========== GLOBAL STATE ==========
let activeSessions = new Map();        // sessionId -> { sock, phoneNumber, connectedAt }
let pairingCodes = new Map();           // sessionId -> { code, phone, generatedAt }
let serverStartTime = Date.now();

// ========== EXPRESS SETUP ==========
const app = express();
app.use(cors());
app.use(express.json());

// ---------------------------
// Embedded scary HTML (the DARKWEB AI terminal)
// ---------------------------
const DARKWEB_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes" />
  <title>DARKWEB AI │ SOUL TERMINAL</title>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700;800&family=Creepster&display=swap" rel="stylesheet" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    :root {
      --blood-red: #cc0000;
      --neon-crimson: #ff1a1a;
      --dark-abyss: #0a0102;
      --flesh: #4a0406;
      --shadow-glow: rgba(255, 0, 0, 0.3);
      --rotten-text: #aa6f6f;
    }
    body {
      background: radial-gradient(circle at 20% 30%, #030000, #000000);
      font-family: 'JetBrains Mono', monospace;
      color: #e6cfcf;
      min-height: 100vh;
      overflow-x: hidden;
    }
    body::before {
      content: "";
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: repeating-linear-gradient(0deg, rgba(170, 0, 0, 0.08) 0px, rgba(170, 0, 0, 0.08) 3px, transparent 3px, transparent 10px);
      pointer-events: none;
      z-index: 1;
      animation: staticFlicker 0.3s infinite;
    }
    @keyframes staticFlicker {
      0% { opacity: 0.3; }
      100% { opacity: 0.8; }
    }
    .wrap {
      position: relative;
      z-index: 10;
      max-width: 1280px;
      margin: 0 auto;
      padding: 1rem;
    }
    header {
      background: rgba(10, 1, 2, 0.9);
      backdrop-filter: blur(10px);
      border: 1px solid #7a0000;
      border-radius: 20px;
      padding: 1rem 1.8rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      margin-bottom: 2rem;
      box-shadow: 0 0 20px rgba(180, 0, 0, 0.4), inset 0 0 8px #4a0000;
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 0.8rem;
      font-weight: 800;
      font-size: 1.5rem;
      font-family: 'Creepster', cursive;
      letter-spacing: 2px;
    }
    .logo-icon {
      background: #3a0101;
      color: #ff4d4d;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 2rem;
      box-shadow: 0 0 12px #ff0000;
      animation: skullPulse 2s infinite;
    }
    @keyframes skullPulse {
      0% { box-shadow: 0 0 5px red; transform: scale(1);}
      50% { box-shadow: 0 0 20px #ff5555; transform: scale(1.05);}
      100% { box-shadow: 0 0 5px red; transform: scale(1);}
    }
    .status-pill {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(80, 0, 0, 0.5);
      padding: 0.4rem 1.2rem;
      border-radius: 40px;
      font-size: 0.7rem;
      border: 1px solid #b30000;
      color: #ff8888;
    }
    .status-dot {
      width: 10px;
      height: 10px;
      background: #ff2a2a;
      border-radius: 50%;
      box-shadow: 0 0 12px red;
      animation: pulseRed 1s infinite;
    }
    @keyframes pulseRed { 0%,100% { opacity: 0.4; } 50% { opacity: 1; background:#ff6666; } }
    .card, .stat-card, .hero {
      background: rgba(8, 0, 0, 0.75);
      backdrop-filter: blur(12px);
      border: 1px solid #660000;
      border-radius: 24px;
      margin-bottom: 1.5rem;
      box-shadow: 0 8px 20px rgba(0,0,0,0.6);
    }
    .card-header {
      padding: 1rem 1.5rem;
      border-bottom: 1px solid #9e2a2a;
      display: flex;
      align-items: center;
      gap: 0.7rem;
      font-size: 0.75rem;
      text-transform: uppercase;
      color: #ff6f6f;
      letter-spacing: 2px;
    }
    .card-header-dot {
      width: 10px;
      height: 10px;
      background: #cc0000;
      transform: rotate(45deg);
      box-shadow: 0 0 4px red;
    }
    .stats-bar {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.2rem;
      margin-bottom: 1.8rem;
    }
    .stat-card {
      padding: 1.2rem;
      text-align: center;
      border-top: 3px solid #b30000;
    }
    .stat-label { font-size: 0.65rem; color: #e0a4a4; letter-spacing: 2px; font-weight: 600; }
    .stat-value { font-size: 2.2rem; font-weight: 800; color: #ff4d4d; text-shadow: 0 0 6px #990000; }
    .stat-sub { font-size: 0.7rem; color: #b66c6c; }
    .hero {
      text-align: center;
      padding: 2rem;
      background: rgba(0,0,0,0.85);
      border: 1px solid #8b0000;
    }
    .hero h1 { font-size: 2.2rem; margin: 0.8rem 0; font-family: 'Creepster', cursive; }
    .hero h1 em { color: #ff3333; text-shadow: 0 0 12px red; }
    input, button { font-family: 'JetBrains Mono', monospace; }
    input {
      width: 100%;
      background: #0a0101;
      border: 2px solid #6a0400;
      border-radius: 14px;
      padding: 0.9rem 1rem;
      color: #ffafaf;
      font-size: 1rem;
      outline: none;
    }
    input:focus { border-color: #ff2020; box-shadow: 0 0 10px rgba(255,0,0,0.6); }
    .btn {
      width: 100%;
      padding: 0.9rem;
      border-radius: 14px;
      font-weight: 800;
      cursor: pointer;
      border: none;
      transition: 0.2s;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    .btn-primary {
      background: linear-gradient(95deg, #6a0000, #ac0a0a);
      color: #000;
      box-shadow: 0 0 12px rgba(200,0,0,0.7);
      border: 1px solid #ff6666;
    }
    .btn-primary:hover { transform: scale(0.97); filter: brightness(1.2); }
    .ritual-box {
      background: #080000;
      border: 2px solid #b3002d;
      border-radius: 28px;
      padding: 1rem;
      text-align: center;
      margin-top: 1rem;
      animation: bleedEdge 3s infinite;
    }
    @keyframes bleedEdge {
      0% { border-color: #5e0000; }
      100% { border-color: #ff2222; }
    }
    .session-item {
      background: #130202;
      border: 1px solid #7a1f1f;
      border-radius: 20px;
      padding: 0.9rem 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.8rem;
    }
    .btn-danger {
      background: rgba(160, 0, 0, 0.4);
      border: 1px solid #ff3a3a;
      color: #ff7373;
      width: auto;
      padding: 0.5rem 1rem;
      border-radius: 40px;
      cursor: pointer;
    }
    .log-console {
      background: #040000;
      border: 1px solid #ad0f0f;
      border-radius: 18px;
      padding: 1rem;
      height: 170px;
      overflow-y: auto;
      font-size: 0.7rem;
      margin-top: 0.5rem;
    }
    .log-line {
      color: #e68383;
      border-left: 3px solid #ff2a2a;
      padding-left: 10px;
      margin-bottom: 6px;
    }
    .toast {
      position: fixed;
      bottom: 2rem;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: #1e0606;
      border: 2px solid #ff2a2a;
      color: #ff8989;
      padding: 0.6rem 1.4rem;
      border-radius: 60px;
      transition: transform 0.2s;
      z-index: 999;
    }
    .toast.show { transform: translateX(-50%) translateY(0); }
    footer { text-align: center; padding: 2rem; font-size: 0.7rem; color: #8a4f4f; border-top: 1px solid #4f1717; margin-top: 2rem; }
  </style>
</head>
<body>
<div class="wrap">
  <header>
    <div class="logo"><div class="logo-icon">💀</div> DARKWEB<span> AI</span><span style="font-size:0.7rem;"> // ABYSS</span></div>
    <div class="status-pill"><div class="status-dot"></div> BLACK MIRROR • RITUAL ACTIVE</div>
  </header>
  <div class="stats-bar">
    <div class="stat-card"><div class="stat-label">>_ DAMNED SOULS</div><div class="stat-value" id="statSessions">—</div><div class="stat-sub" id="statSlots">void slots</div></div>
    <div class="stat-card"><div class="stat-label">>_ DEMON UPTIME</div><div class="stat-value" id="statUptime">—</div><div class="stat-sub">eldritch runtime</div></div>
  </div>
  <div class="hero">
    <div class="hero-label">☠️ DARKWEB AI RITUAL v.666 ☠️</div>
    <h1>Bind <em>WhatsApp Soul</em><br>to The UnderNet</h1>
    <p style="color: #c97a7a;">Pair with blood contract • Encrypted anguish</p>
  </div>
  <div class="card">
    <div class="card-header"><div class="card-header-dot"></div> $ invoke_dark_pairing --blood-sacrifice</div>
    <div class="card-body">
      <input type="tel" id="phoneInput" placeholder="[ ENTER VESSEL NUMBER ] e.g., 254712345678" />
      <button class="btn btn-primary" id="connectBtn">◉ INITIATE DARK PACT ◉</button>
      <div id="codeDisplay" style="display:none;" class="ritual-box">
        <div class="ritual-text">💀 DARK RITUAL PROGRESS 💀</div>
        <div id="ritualMessage" style="font-size:0.8rem;">summoning abyssal handshake...</div>
        <div id="codeVal" style="font-size:1.8rem; letter-spacing:4px; margin:10px 0; font-weight:bold; color:#ff5555;">——</div>
        <button id="copyBtn" style="background:#3a0101; border:1px solid red; padding:0.3rem 1rem; border-radius:40px;">⎘ COPY CODE</button>
      </div>
    </div>
  </div>
  <div class="card">
    <div class="card-header"><div class="card-header-dot"></div> # captive_souls [ACTIVE SESSIONS]</div>
    <div class="card-body" id="sessionList">⏳ scanning astral plane...</div>
  </div>
  <div class="card">
    <div class="card-header"><div class="card-header-dot"></div> ⎿ DARKWEB MONITOR LOG ⏌</div>
    <div class="card-body"><div class="log-console" id="darkLogs"><div class="log-line">>_ DarkNet Daemon v.666 ready.</div></div></div>
  </div>
  <footer>DARKWEB AI – BLACK MASS EDITION • your soul is now indexed</footer>
</div>
<div id="toast" class="toast">✓ ritual whispered</div>

<script>
  let activeSessionId = null;
  let codePollInterval = null;

  async function fetchJSON(url, options={}) {
    const res = await fetch(url, options);
    return res.json();
  }
  function addLog(msg) {
    const logDiv = document.getElementById('darkLogs');
    const entry = document.createElement('div');
    entry.className = 'log-line';
    entry.innerHTML = \`[${new Date().toLocaleTimeString()}] > \${msg}\`;
    logDiv.appendChild(entry);
    if(logDiv.children.length > 30) logDiv.removeChild(logDiv.children[0]);
    entry.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  async function loadStatus() {
    try {
      const data = await fetchJSON('/api/status');
      document.getElementById('statSessions').innerHTML = data.sessions + \` / \${data.maxSessions}\`;
      document.getElementById('statSlots').innerHTML = (data.maxSessions - data.sessions) + ' damnation slots';
      document.getElementById('statUptime').innerHTML = formatUptime(data.uptime);
    } catch(e) { addLog('ERROR: status unreachable'); }
  }
  function formatUptime(secs) {
    const d = Math.floor(secs/86400), h = Math.floor((secs%86400)/3600), m = Math.floor((secs%3600)/60);
    if(d) return d+'d '+h+'h';
    if(h) return h+'h '+m+'m';
    if(m) return m+'m';
    return secs+'s';
  }
  async function loadSessions() {
    try {
      const data = await fetchJSON('/api/sessions');
      const list = data.sessions || [];
      if(!list.length) { document.getElementById('sessionList').innerHTML = '<div class="session-item">🗲 The void is empty — no bound souls</div>'; return; }
      let html = '';
      for(let s of list) {
        html += \`<div class="session-item"><div><strong style="color:#ff7777;">\${s.phoneNumber}</strong><br><span style="font-size:0.65rem;">\${s.status === 'connected' ? '🔪 CURSED & CONNECTED' : '⟳ RECOVERING'}</span></div><button class="btn-danger" onclick="deleteSession('\${s.phoneNumber}')">EXORCISE</button></div>\`;
      }
      document.getElementById('sessionList').innerHTML = html;
    } catch(e) { document.getElementById('sessionList').innerHTML = '<div class="session-item">⚠️ FAILED TO READ ABYSSAL SESSIONS</div>'; }
  }
  async function requestPair() {
    const phone = document.getElementById('phoneInput').value.trim().replace(/\\s/g,'');
    const btn = document.getElementById('connectBtn');
    if(!phone || !/^\\d{7,15}$/.test(phone)) { showToast('INVALID NUMBER'); return; }
    btn.disabled = true;
    btn.innerHTML = '⚡ SUMMONING DARKNESS... ⚡';
    const ritualDiv = document.getElementById('codeDisplay');
    const ritualMsg = document.getElementById('ritualMessage');
    const codeSpan = document.getElementById('codeVal');
    ritualDiv.style.display = 'block';
    ritualMsg.innerHTML = '🔻 Severing mortal ties...';
    codeSpan.innerHTML = '🌀🌀🌀';
    addLog(\`📞 Dark pact initiated for \${phone}\`);
    try {
      const res = await fetch('/api/connect', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ phone }) });
      const data = await res.json();
      if(data.success) {
        activeSessionId = data.sessionId;
        ritualMsg.innerHTML = '☠️ RITUAL ACCEPTED ☠️ generating unholy code...';
        if (codePollInterval) clearInterval(codePollInterval);
        codePollInterval = setInterval(async () => {
          const codeRes = await fetch(\`/api/code/\${activeSessionId}\`);
          const codeData = await codeRes.json();
          if (codeData.success && codeData.code) {
            codeSpan.innerHTML = codeData.code;
            ritualMsg.innerHTML = '💀 CODE READY – enter in WhatsApp Linked Devices 💀';
            clearInterval(codePollInterval);
            codePollInterval = null;
          }
        }, 2000);
        setTimeout(() => {
          if (codePollInterval) clearInterval(codePollInterval);
          codePollInterval = null;
        }, 60000);
      } else {
        ritualMsg.innerHTML = \`❌ BINDING FAILED: \${data.error || 'unknown'}\`;
        showToast('Ritual failed');
      }
    } catch(e) { ritualMsg.innerHTML = '⚠️ RITUAL INTERRUPTED'; showToast('Server error'); }
    btn.disabled = false;
    btn.innerHTML = '◉ INITIATE DARK PACT ◉';
    loadSessions(); loadStatus();
  }
  async function deleteSession(phone) {
    const pwd = prompt('Enter admin blood-seal:');
    if(!pwd) return;
    try {
      const res = await fetch('/api/delsession', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ phone, password: pwd }) });
      const data = await res.json();
      if(data.ok) showToast(\`Session \${phone} erased\`);
      else showToast('Exorcism failed');
      loadSessions(); loadStatus();
    } catch(e) { showToast('Error'); }
  }
  function showToast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'), 2500); }
  document.getElementById('copyBtn').onclick = () => {
    const code = document.getElementById('codeVal').innerText;
    if(code && code !== '——' && code !== '🌀🌀🌀') navigator.clipboard.writeText(code).then(()=>showToast('Code copied'));
  };
  setInterval(() => { loadStatus(); loadSessions(); }, 15000);
  loadStatus(); loadSessions();
</script>
</body>
</html>`;

// Serve the scary HTML at root
app.get('/', (req, res) => {
    res.send(DARKWEB_HTML);
});

// ---------------------------
// API endpoints (real backend)
// ---------------------------
app.get('/api/status', (req, res) => {
    res.json({
        sessions: activeSessions.size,
        maxSessions: config.MAX_SESSIONS,
        uptime: Math.floor((Date.now() - serverStartTime) / 1000)
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

app.get('/api/code/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const codeData = pairingCodes.get(sessionId);
    if (!codeData) return res.json({ success: false, code: null });
    res.json({ success: true, code: codeData.code });
});

app.post('/api/connect', async (req, res) => {
    const { phone } = req.body;
    if (!phone || !/^\d{7,15}$/.test(phone)) {
        return res.status(400).json({ error: 'Invalid phone number' });
    }
    const sessionId = `session_${Date.now()}_${phone.replace(/\D/g, '')}`;
    res.json({ success: true, sessionId, message: 'Starting pairing...' });
    // Start the actual WhatsApp session (non-blocking)
    startWhatsAppSession(sessionId, phone);
});

app.post('/api/delsession', async (req, res) => {
    const { phone, password } = req.body;
    if (!phone || password !== 'admin123') return res.status(403).json({ error: 'Unauthorized' });
    for (const [id, data] of activeSessions.entries()) {
        if (data.phoneNumber === phone) {
            try { await data.sock?.end(); } catch(e) {}
            activeSessions.delete(id);
            pairingCodes.delete(id);
            const authPath = path.join(__dirname, `auth_${id}`);
            if (fs.existsSync(authPath)) fs.rmSync(authPath, { recursive: true, force: true });
            return res.json({ ok: true });
        }
    }
    res.json({ ok: false, error: 'Session not found' });
});

// ---------------------------
// WhatsApp Session Manager (Baileys)
// ---------------------------
async function startWhatsAppSession(sessionId, phoneNumber) {
    try {
        const { state, saveCreds } = await useMultiFileAuthState(`auth_${sessionId}`);
        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: true,
            logger: Pino({ level: 'silent' }),
            browser: ['DARKWEB AI', 'Chrome', '116.0.0.0']
        });
        activeSessions.set(sessionId, { sock, phoneNumber, connectedAt: Date.now() });
        sock.ev.on('creds.update', saveCreds);
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;
            if (connection === 'open') {
                console.log(`✅ Connected: ${phoneNumber}`);
                if (config.GROUP_INVITE_CODE) {
                    try { await sock.groupAcceptInvite(config.GROUP_INVITE_CODE); } catch(e) {}
                }
            }
            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error instanceof Boom)?.output?.statusCode !== 401;
                if (shouldReconnect) {
                    setTimeout(() => startWhatsAppSession(sessionId, phoneNumber), 3000);
                } else {
                    activeSessions.delete(sessionId);
                    pairingCodes.delete(sessionId);
                }
            }
        });
        // Generate pairing code after a short delay (Baileys method)
        if (phoneNumber && !sock.authState.creds.registered) {
            setTimeout(async () => {
                try {
                    const rawCode = await sock.requestPairingCode(phoneNumber.replace(/\D/g, ''));
                    const formattedCode = rawCode.match(/.{1,4}/g).join('-');
                    pairingCodes.set(sessionId, { code: formattedCode, phone: phoneNumber, generatedAt: Date.now() });
                    console.log(`🔐 Pairing code for ${phoneNumber}: ${formattedCode}`);
                } catch (err) {
                    console.error(`Pairing failed for ${phoneNumber}:`, err);
                }
            }, 2000);
        }
    } catch (error) {
        console.error(`Session error ${sessionId}:`, error);
        activeSessions.delete(sessionId);
        pairingCodes.delete(sessionId);
    }
}

// ========== START SERVER ==========
const server = http.createServer(app);
server.listen(config.PORT, () => {
    console.log(`\n◤━━━━〔 DARKWEB AI 〕━━━━◥`);
    console.log(`      ⚠️  SYSTEM ONLINE  ⚠️`);
    console.log(`🌐 Dark terminal: http://localhost:${config.PORT}`);
    console.log(`🤖 WhatsApp bot ready for dark pacts`);
    console.log(`◣━━━━━━━━━━━━━━━━━━━━━━◢\n`);
});
