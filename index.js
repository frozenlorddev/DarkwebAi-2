const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const makeWASocket = require('@ostyado/baileys').default;
const { useMultiFileAuthState } = require('@ostyado/baileys');
const QRCode = require('qrcode');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

app.use(cors());
app.use(express.json());

// ========== Store sessions ==========
const activeSessions = new Map(); // sessionId -> { sock, phoneNumber }

// ========== Root route – embedded HTML (no public folder) ==========
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DARKWEB AI || FATAL ERROR</title>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <script src="/socket.io/socket.io.js"></script>
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
        .container {
            max-width:1000px;
            margin:0 auto;
            background:rgba(5,5,5,0.95);
            border:1px solid #ff0000;
            border-radius:20px;
            padding:2rem;
            box-shadow:0 0 30px rgba(255,0,0,0.3);
        }
        .header { text-align:center; border-bottom:1px dashed #ff0000; padding-bottom:1rem; margin-bottom:2rem; }
        .skull { font-size:3rem; text-shadow:0 0 10px red; animation:pulseRed 1.5s infinite; }
        @keyframes pulseRed { 0%{opacity:0.6;} 100%{opacity:1;} }
        h1 { font-size:1.8rem; margin:10px 0; }
        .glitch { font-size:0.8rem; color:#aa0000; background:#000; display:inline-block; padding:4px 12px; border-left:3px solid red; animation:glitchText 1s infinite; }
        @keyframes glitchText { 0%{text-shadow:-1px 0 red;} 50%{text-shadow:1px 0 darkred;} 100%{text-shadow:0 0 red;} }
        .input-group { margin:20px 0; }
        input { width:100%; background:#0a0505; border:1px solid #5a1a1a; padding:14px; color:#ff6666; font-size:1rem; border-radius:8px; }
        button { width:100%; background:linear-gradient(135deg,#aa0000,#330000); border:none; padding:14px; font-weight:bold; color:white; font-size:1rem; border-radius:8px; cursor:pointer; }
        button:hover { background:#ff0000; color:black; box-shadow:0 0 12px red; }
        .code-box, .qr-box { background:#020202; border:2px solid #ff0000; border-radius:20px; padding:1.5rem; text-align:center; margin-top:20px; display:none; }
        .code { font-size:2.2rem; letter-spacing:6px; color:#ff0000; font-weight:bold; }
        .qr { width:200px; height:200px; margin:0 auto; }
        .warning { background:#1a0505; border-left:6px solid red; padding:12px; margin:20px 0; font-size:0.75rem; }
        footer { text-align:center; margin-top:2rem; font-size:0.6rem; color:#6a1a1a; }
        .status { margin-top:10px; font-size:0.8rem; }
    </style>
</head>
<body>
<div class="container">
    <div class="header">
        <div class="skull">💀 ⚡ 💀</div>
        <h1>◤ DARKWEB AI ◥<br>⚠️ DANGER ZONE ⚠️</h1>
        <div class="glitch">[ SYSTEM BREACHED ] [ NO ESCAPE ]</div>
    </div>
    <div class="warning">💀 PAIR YOUR DEVICE – CODE WILL APPEAR BELOW 💀</div>
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
    <div id="qrBox" class="qr-box">
        <div>📷 SCAN QR CODE</div>
        <div id="qrImage" class="qr"></div>
    </div>
    <div id="statusMsg" class="status"></div>
    <footer>DARKWEB AI – TOTAL ANNIHILATION MODE</footer>
</div>
<script>
    const socket = io();
    socket.on('pairing-code', (data) => {
        document.getElementById('pairCode').innerText = data.formattedCode || data.code;
        document.getElementById('codeBox').style.display = 'block';
        document.getElementById('qrBox').style.display = 'none';
        document.getElementById('statusMsg').innerHTML = '✅ Pairing code ready! Use in WhatsApp.';
    });
    socket.on('qr-code', (data) => {
        const qrDiv = document.getElementById('qrImage');
        qrDiv.innerHTML = `<img src="${data.qr}" style="width:100%; height:auto;" />`;
        document.getElementById('qrBox').style.display = 'block';
        document.getElementById('codeBox').style.display = 'none';
        document.getElementById('statusMsg').innerHTML = '📱 Scan QR code with WhatsApp.';
    });
    socket.on('status', (data) => {
        document.getElementById('statusMsg').innerHTML = data.message;
    });
    socket.on('connected', () => {
        document.getElementById('statusMsg').innerHTML = '✅ Connected! Bot is online.';
        document.getElementById('codeBox').style.display = 'none';
        document.getElementById('qrBox').style.display = 'none';
    });
    socket.on('disconnected', () => {
        document.getElementById('statusMsg').innerHTML = '⚠️ Disconnected. Refresh to try again.';
    });
    socket.on('error', (data) => {
        document.getElementById('statusMsg').innerHTML = '❌ ' + data.message;
    });

    document.getElementById('pairBtn').addEventListener('click', async () => {
        const phone = document.getElementById('phone').value.trim();
        if (!phone.match(/^\\d{7,15}$/)) {
            alert('INVALID NUMBER. USE ONLY DIGITS, COUNTRY CODE FIRST.');
            return;
        }
        const btn = document.getElementById('pairBtn');
        btn.disabled = true;
        btn.innerText = '⏳ REQUESTING...';
        try {
            const res = await fetch('/api/start-pairing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber: phone })
            });
            const data = await res.json();
            if (!data.success) alert('Error: ' + (data.error || 'Unknown'));
        } catch (err) {
            alert('Server error: ' + err.message);
        }
        btn.disabled = false;
        btn.innerText = '⚡ EXECUTE PAIRING ⚡';
    });
    document.getElementById('copyBtn').addEventListener('click', () => {
        const code = document.getElementById('pairCode').innerText;
        navigator.clipboard.writeText(code).then(() => alert('💀 CODE COPIED 💀'));
    });
</script>
</body>
</html>`);
});

// ========== API endpoint ==========
app.post('/api/start-pairing', async (req, res) => {
    const { phoneNumber } = req.body;
    if (!phoneNumber) return res.status(400).json({ error: 'Phone number required' });
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length < 7 || cleaned.length > 15) return res.status(400).json({ error: 'Invalid phone number' });
    const sessionId = `session_${Date.now()}_${cleaned}`;
    try {
        res.json({ success: true, sessionId, message: 'Starting pairing...' });
        startWhatsAppSession(sessionId, cleaned);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ========== WhatsApp session with @ostyado/baileys (NO DELAY) ==========
async function startWhatsAppSession(sessionId, phoneNumber) {
    try {
        const { state, saveCreds } = await useMultiFileAuthState(`auth_${sessionId}`);
        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: true,
            browser: ['DARKWEB AI', 'Chrome', '116.0.0.0'],
            syncFullHistory: false,
            markOnlineOnConnect: false
        });
        activeSessions.set(sessionId, { sock, phoneNumber });

        sock.ev.on('creds.update', saveCreds);
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            if (qr) {
                const qrDataURL = await QRCode.toDataURL(qr);
                io.emit('qr-code', { sessionId, qr: qrDataURL });
                io.emit('status', { sessionId, message: 'QR code generated. Scan with WhatsApp.' });
            }
            if (connection === 'open') {
                console.log(`✅ ${phoneNumber} connected`);
                io.emit('connected', { sessionId });
                io.emit('status', { sessionId, message: 'Connected successfully!' });
            }
            if (connection === 'close') {
                console.log(`❌ ${phoneNumber} disconnected`);
                activeSessions.delete(sessionId);
                io.emit('disconnected', { sessionId });
            }
        });

        // Request pairing code immediately (no delay) if not registered
        if (phoneNumber && !sock.authState.creds.registered) {
            // We need to wait a tiny bit for the socket to be ready, but remove the 2s delay
            // Use setImmediate or just call after a short microtask
            setImmediate(async () => {
                try {
                    const pairingCode = await sock.requestPairingCode(phoneNumber);
                    const formatted = pairingCode.match(/.{1,4}/g)?.join('-') || pairingCode;
                    console.log(`Pairing code for ${phoneNumber}: ${formatted}`);
                    io.emit('pairing-code', { sessionId, code: pairingCode, formattedCode: formatted });
                    io.emit('status', { sessionId, message: 'Pairing code generated! Enter it in WhatsApp.' });
                } catch (err) {
                    console.error('Pairing error:', err);
                    io.emit('error', { sessionId, message: 'Failed to generate code: ' + err.message });
                }
            });
        }
    } catch (err) {
        console.error('Session creation error:', err);
        io.emit('error', { sessionId, message: 'Failed to create session: ' + err.message });
    }
}

// Clean up old sessions (every 5 min)
setInterval(() => {
    const now = Date.now();
    for (const [sessionId, data] of activeSessions.entries()) {
        const timestamp = parseInt(sessionId.split('_')[1]);
        if (now - timestamp > 3600000) {
            try { data.sock?.end(); } catch(e) {}
            activeSessions.delete(sessionId);
        }
    }
}, 300000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🌐 DARKWEB AI web panel: http://localhost:${PORT}`);
    console.log(`⚡ Pairing code will appear on page instantly (no delay)`);
});
