// index.js – main entry for DARKWEB AI
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
let activeSessions = new Map();       // sessionId -> { sock, phoneNumber, connectedAt }
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
    // tempbans not loaded here; they are checked per request via database
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

// ========== EXPRESS SETUP ==========
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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

app.post('/api/connect', async (req, res) => {
    const { phone } = req.body;
    if (!phone || !/^\d{7,15}$/.test(phone)) {
        return res.status(400).json({ error: 'Invalid phone number' });
    }
    const sessionId = `session_${Date.now()}_${phone}`;
    res.json({ success: true, sessionId, message: 'Starting pairing...' });
    startWhatsAppSession(sessionId, phone);
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
            // Also remove paired record if exists
            if (pairedUsers.has(phone)) pairedUsers.delete(phone);
            await setPairedUser(phone, null); // clear in db
            return res.json({ ok: true });
        }
    }
    res.json({ ok: false, error: 'Session not found' });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ========== WHATSAPP SESSION MANAGER ==========
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
                if (config.GROUP_INVITE_CODE && config.GROUP_INVITE_CODE !== 'YOUR_GROUP_INVITE_CODE') {
                    try { await sock.groupAcceptInvite(config.GROUP_INVITE_CODE); } catch(e) {}
                }
            }
            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error instanceof Boom)?.output?.statusCode !== 401;
                if (shouldReconnect) {
                    setTimeout(() => startWhatsAppSession(sessionId, phoneNumber), 3000);
                } else {
                    activeSessions.delete(sessionId);
                }
            }
        });
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
            setTimeout(async () => {
                try {
                    const code = await sock.requestPairingCode(phoneNumber.replace(/\D/g, ''));
                    const formatted = code.match(/.{1,4}/g).join('-');
                    console.log(`Pairing code for ${phoneNumber}: ${formatted}`);
                } catch (err) { console.error('Pairing failed', err); }
            }, 2000);
        }
    } catch (error) {
        console.error(`Session error ${sessionId}:`, error);
        activeSessions.delete(sessionId);
    }
}

// ========== START SERVER ==========
const server = http.createServer(app);
server.listen(config.PORT, () => {
    console.log(`\n◤━━━━〔 DARKWEB AI 〕━━━━◥`);
    console.log(`      ⚠️  SYSTEM ONLINE  ⚠️`);
    console.log(`🌐 Web dashboard: http://localhost:${config.PORT}`);
    console.log(`🤖 WhatsApp bot ready for pairing`);
    console.log(`◣━━━━━━━━━━━━━━━━━━━━━━◢\n`);
});

// Periodic cleanup of expired temp bans
setInterval(async () => {
    await cleanupExpiredTempBans();
}, 60000);