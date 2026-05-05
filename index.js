// index.js – main entry for DARKWEB AI (pairing code shown on website)
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

// Import modules
const config = require('./config');
const { getNumber, rudeReply, formatUptime, sleep, DATA_DIR } = require('./utils');
const { isOwner, isPremium, addPremium, removePremium, getPremiumList } = require('./premium');
const {
    getBan, setBan, removeBan, getAllBans,
    getSetting, setSetting,
    getPairedUser, setPairedUser, getAllPaired,
    getTempBan, setTempBan, removeTempBan, cleanupExpiredTempBans
} = require('./database');
const { handleCommand } = require('./commands');

// ========== GLOBAL STATE ==========
let activeSessions = new Map();       // sessionId -> { sock, phoneNumber, connectedAt, pendingPairingCode }
let serverStartTime = Date.now();
let PREFIX = config.DEFAULT_PREFIX;
let BOT_NAME = config.BOT_NAME;

// In‑memory copies of persistent data (synced with database on changes)
let bans = new Map();
let pairedUsers = new Map();
let settings = {
    welcome: false,
    antilink: 'off',
    antileft: false,
    antibot: false,
    antigroupmention: 'off',
    antitagall: 'off',
    reactall: false,
    antibug: false,
    tempbans: new Map()
};

// Load initial data from database
(async () => {
    const banList = await getAllBans();
    bans.clear();
    for (const b of banList) bans.set(b.phone_number, { level: b.level, reason: b.reason, date: b.banned_at });
    const pairedList = await getAllPaired();
    pairedUsers.clear();
    for (const p of pairedList) pairedUsers.set(p.phone_number, { code: p.code, paired_at: p.paired_at });
    settings.welcome = await getSetting('welcome', false);
    settings.antilink = await getSetting('antilink', 'off');
    settings.antileft = await getSetting('antileft', false);
    settings.antibot = await getSetting('antibot', false);
    settings.antigroupmention = await getSetting('antigroupmention', 'off');
    settings.antitagall = await getSetting('antitagall', 'off');
    settings.reactall = await getSetting('reactall', false);
    settings.antebug = await getSetting('antebug', false);
})();

// Helper to save settings to database
async function saveSettingsToDb() {
    await setSetting('welcome', settings.welcome);
    await setSetting('antilink', settings.antilink);
    await setSetting('antileft', settings.antileft);
    await setSetting('antibot', settings.antibot);
    await setSetting('antigroupmention', settings.antigroupmention);
    await setSetting('antitagall', settings.antitagall);
    await setSetting('reactall', settings.reactall);
    await setSetting('antebug', settings.antebug);
}

// ========== EXPRESS SETUP (no public folder) ==========
const app = express();
app.use(cors());
app.use(express.json());

// API routes
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

// Updated /api/connect – returns pairing code in response
app.post('/api/connect', async (req, res) => {
    const { phone } = req.body;
    if (!phone || !/^\d{7,15}$/.test(phone)) {
        return res.status(400).json({ error: 'Invalid phone number' });
    }
    const sessionId = `session_${Date.now()}_${phone}`;
    
    // Start session and wait for pairing code
    try {
        const code = await startWhatsAppSessionAndGetCode(sessionId, phone);
        res.json({ success: true, sessionId, code: code, message: 'Pairing code generated' });
    } catch (err) {
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
    if (!phone || password !== 'admin123') return res.status(403).json({ error: 'Unauthorized' });
    for (const [id, data] of activeSessions.entries()) {
        if (data.phoneNumber === phone) {
            try { await data.sock?.end(); } catch(e) {}
            activeSessions.delete(id);
            const authPath = path.join(__dirname, `auth_${id}`);
            if (fs.existsSync(authPath)) fs.rmSync(authPath, { recursive: true, force: true });
            if (pairedUsers.has(phone)) pairedUsers.delete(phone);
            await setPairedUser(phone, null);
            return res.json({ ok: true });
        }
    }
    res.json({ ok: false, error: 'Session not found' });
});

// Root endpoint – beautiful darkweb form that displays the code
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DARKWEB AI – Pair WhatsApp</title>
    <style>
        body {
            background: #030705;
            color: #0f0;
            font-family: 'Courier New', monospace;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
        }
        .container {
            background: #07100c;
            border: 1px solid #0a4a2a;
            border-radius: 12px;
            padding: 2rem;
            width: 90%;
            max-width: 500px;
            text-align: center;
            box-shadow: 0 0 20px rgba(0,255,0,0.2);
        }
        h1 {
            font-size: 1.5rem;
            margin-bottom: 0.5rem;
            text-shadow: 0 0 5px #0f0;
        }
        input {
            width: 100%;
            padding: 12px;
            margin: 15px 0;
            background: #021007;
            border: 1px solid #0a4a2a;
            color: #0f0;
            border-radius: 8px;
            font-size: 1rem;
            box-sizing: border-box;
        }
        button {
            background: linear-gradient(135deg, #0f0, #0a6e2f);
            color: #000;
            border: none;
            padding: 12px;
            width: 100%;
            border-radius: 8px;
            font-weight: bold;
            cursor: pointer;
            font-size: 1rem;
        }
        button:hover {
            filter: brightness(1.1);
        }
        #codeBox {
            margin-top: 20px;
            padding: 15px;
            background: #010a05;
            border: 1px solid #0f0;
            border-radius: 12px;
            display: none;
        }
        .code-value {
            font-size: 2rem;
            font-weight: bold;
            letter-spacing: 0.2em;
            color: #0f0;
            text-shadow: 0 0 6px #0f0;
            word-break: break-all;
        }
        .status {
            margin-top: 15px;
            font-size: 0.8rem;
            color: #5f9e6e;
        }
        .footer {
            margin-top: 20px;
            font-size: 0.7rem;
            color: #2a5a2a;
        }
        .instruction {
            text-align: left;
            background: #021007;
            padding: 10px;
            border-radius: 8px;
            margin-top: 20px;
            font-size: 0.75rem;
        }
    </style>
</head>
<body>
<div class="container">
    <h1>◤ DARKWEB AI ◥</h1>
    <p>Enter your WhatsApp number</p>
    <input type="tel" id="phone" placeholder="254712345678" autocomplete="off">
    <button onclick="pair()">⚡ GENERATE PAIRING CODE ⚡</button>
    <div id="status" class="status"></div>
    <div id="codeBox">
        <div style="font-size:0.7rem;">🔑 YOUR PAIRING CODE</div>
        <div class="code-value" id="pairingCode"></div>
        <button onclick="copyCode()" style="margin-top:10px; background:#0a2a0a; color:#0f0;">⎘ COPY CODE</button>
    </div>
    <div class="instruction">
        <strong>📱 How to use:</strong><br>
        1. Copy the 8‑digit code above.<br>
        2. Open WhatsApp → Settings → Linked Devices → Link a Device.<br>
        3. Tap "Link with phone number" and enter the code.<br>
        4. Done! Now add the bot to any group and make it admin.
    </div>
    <div class="footer">DARKWEB AI – Where secrets become power</div>
</div>
<script>
    async function pair() {
        const phone = document.getElementById('phone').value.trim();
        const statusDiv = document.getElementById('status');
        const codeBox = document.getElementById('codeBox');
        const codeSpan = document.getElementById('pairingCode');
        if (!phone.match(/^\\d{7,15}$/)) {
            statusDiv.innerHTML = '❌ Invalid number. Use country code + digits (e.g., 254712345678)';
            return;
        }
        statusDiv.innerHTML = '⏳ Generating pairing code...';
        codeBox.style.display = 'none';
        try {
            const res = await fetch('/api/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone })
            });
            const data = await res.json();
            if (data.success && data.code) {
                const formatted = data.code.match(/.{1,4}/g)?.join('-') || data.code;
                codeSpan.innerText = formatted;
                codeBox.style.display = 'block';
                statusDiv.innerHTML = '✅ Pairing code ready! Use it in WhatsApp.';
            } else {
                statusDiv.innerHTML = '❌ Error: ' + (data.error || 'unknown');
            }
        } catch (err) {
            statusDiv.innerHTML = '❌ Server error';
        }
    }
    function copyCode() {
        const code = document.getElementById('pairingCode').innerText;
        navigator.clipboard?.writeText(code.replace(/-/g, ''));
        alert('Code copied!');
    }
</script>
</body>
</html>
    `);
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
            let pairingCodeResolved = false;
            sock.ev.on('creds.update', saveCreds);
            sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect } = update;
                if (connection === 'open' && !pairingCodeResolved) {
                    // Already connected? Shouldn't happen before pairing code, but just in case
                    if (!pairingCodeResolved) {
                        pairingCodeResolved = true;
                        activeSessions.set(sessionId, { sock, phoneNumber, connectedAt: Date.now() });
                        resolve(null); // no code, but session exists
                    }
                }
                if (connection === 'close') {
                    const shouldReconnect = (lastDisconnect?.error instanceof Boom)?.output?.statusCode !== 401;
                    if (shouldReconnect) {
                        setTimeout(() => startWhatsAppSessionAndGetCode(sessionId, phoneNumber), 3000);
                    } else {
                        activeSessions.delete(sessionId);
                    }
                }
            });
            // Listen for messages (not needed for pairing)
            sock.ev.on('messages.upsert', async ({ messages }) => {
                const msg = messages[0];
                if (!msg.message || msg.key.fromMe) return;
                const sender = msg.key.remoteJid;
                const participant = msg.key.participant || sender;
                const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
                await handleCommand(sock, sender, msg, text, participant, {
                    prefix: PREFIX,
                    setPrefix: (newPrefix) => { PREFIX = newPrefix; },
                    setBotName: (newName) => { BOT_NAME = newName; },
                    bans, pairedUsers, settings,
                    saveBans: async () => { for (const [k,v] of bans) await setBan(k, v.level, v.reason); },
                    saveSettings: saveSettingsToDb,
                    savePaired: async () => { for (const [k,v] of pairedUsers) await setPairedUser(k, v.code); }
                });
            });
            if (phoneNumber && !sock.authState.creds.registered) {
                // Request pairing code
                const code = await sock.requestPairingCode(phoneNumber.replace(/\D/g, ''));
                if (!pairingCodeResolved) {
                    pairingCodeResolved = true;
                    activeSessions.set(sessionId, { sock, phoneNumber, connectedAt: Date.now() });
                    resolve(code);
                }
            } else {
                // Already registered? shouldn't happen
                reject(new Error('Already registered, no pairing needed'));
            }
        } catch (error) {
            reject(error);
        }
    });
}

// ========== START SERVER ==========
const server = http.createServer(app);
server.listen(config.PORT, () => {
    console.log(`\n◤━━━━〔 DARKWEB AI 〕━━━━◥`);
    console.log(`      ⚠️  SYSTEM ONLINE  ⚠️`);
    console.log(`🌐 Web server: http://localhost:${config.PORT}`);
    console.log(`🤖 WhatsApp bot ready for pairing`);
    console.log(`◣━━━━━━━━━━━━━━━━━━━━━━◢\n`);
});

// Periodic cleanup of expired temp bans
setInterval(async () => {
    await cleanupExpiredTempBans();
}, 60000);
