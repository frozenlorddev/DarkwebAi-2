const express = require('express');
const cors = require('cors');
const makeWASocket = require('@ostyado/baileys').default;
const { useMultiFileAuthState } = require('@ostyado/baileys');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ========== Embedded HTML (dangerous red/black theme) ==========
const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>DARKWEB AI – PAIR YOUR DEVICE</title>
    <style>
        body {
            background: #000;
            color: #ff3333;
            font-family: 'Courier New', monospace;
            text-align: center;
            padding: 2rem;
        }
        .container {
            max-width: 500px;
            margin: 0 auto;
            background: #0a0505;
            border: 2px solid #ff0000;
            border-radius: 20px;
            padding: 2rem;
            box-shadow: 0 0 20px rgba(255,0,0,0.3);
        }
        h1 { font-size: 2rem; margin-bottom: 0.5rem; text-shadow: 0 0 5px red; }
        .skull { font-size: 3rem; }
        input, button {
            width: 100%;
            padding: 12px;
            margin: 10px 0;
            background: #111;
            border: 1px solid #ff3333;
            color: #ff6666;
            border-radius: 8px;
            font-size: 1rem;
        }
        button {
            background: linear-gradient(135deg, #aa0000, #330000);
            color: white;
            font-weight: bold;
            cursor: pointer;
        }
        button:hover { background: #ff0000; color: black; }
        .code-box {
            margin-top: 20px;
            padding: 15px;
            background: #020202;
            border: 2px solid #ff0000;
            border-radius: 16px;
            display: none;
        }
        .code {
            font-size: 2rem;
            letter-spacing: 6px;
            font-weight: bold;
            color: #ff0000;
        }
        .warning {
            background: #1a0505;
            border-left: 4px solid red;
            padding: 8px;
            margin: 15px 0;
            font-size: 0.8rem;
        }
        footer {
            margin-top: 20px;
            font-size: 0.7rem;
            color: #6a1a1a;
        }
    </style>
</head>
<body>
<div class="container">
    <div class="skull">💀 ⚡ 💀</div>
    <h1>◤ DARKWEB AI ◥</h1>
    <div class="warning">⚠️ ENTER YOUR WHATSAPP NUMBER ⚠️</div>
    <input type="tel" id="phone" placeholder="254712345678 (country code)" />
    <button id="pairBtn">⚡ GENERATE PAIRING CODE ⚡</button>
    <div id="codeBox" class="code-box">
        <div>🔻 YOUR PAIRING CODE 🔻</div>
        <div class="code" id="codeValue"></div>
        <button id="copyBtn" style="background:#220000; margin-top:10px;">⎘ COPY</button>
        <div style="font-size:0.7rem; margin-top:8px;">WhatsApp → Linked Devices → Link with phone number</div>
    </div>
    <footer>DARKWEB AI – TOTAL ANNIHILATION MODE</footer>
</div>
<script>
    document.getElementById('pairBtn').onclick = async () => {
        const phone = document.getElementById('phone').value.trim();
        if (!phone.match(/^\\d{7,15}$/)) {
            alert('Invalid number. Use only digits, country code first (e.g., 254712345678)');
            return;
        }
        const btn = document.getElementById('pairBtn');
        btn.disabled = true;
        btn.innerText = '⏳ REQUESTING CODE...';
        try {
            const res = await fetch('/api/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone })
            });
            const data = await res.json();
            if (data.code) {
                document.getElementById('codeValue').innerText = data.code;
                document.getElementById('codeBox').style.display = 'block';
            } else {
                alert('Error: ' + (data.error || 'Unknown error'));
            }
        } catch (err) {
            alert('Server error: ' + err.message);
        }
        btn.disabled = false;
        btn.innerText = '⚡ GENERATE PAIRING CODE ⚡';
    };
    document.getElementById('copyBtn').onclick = () => {
        const code = document.getElementById('codeValue').innerText;
        navigator.clipboard.writeText(code).then(() => alert('💀 Code copied!'));
    };
</script>
</body>
</html>`;

app.get('/', (req, res) => res.send(html));

// ========== API endpoint: returns pairing code ==========
app.post('/api/connect', async (req, res) => {
    const { phone } = req.body;
    const cleaned = phone.replace(/\D/g, '');
    if (!cleaned || cleaned.length < 7 || cleaned.length > 15) {
        return res.status(400).json({ error: 'Invalid phone number' });
    }
    const sessionId = `session_${Date.now()}_${cleaned}`;
    try {
        const code = await startWhatsAppSessionAndGetCode(sessionId, cleaned);
        res.json({ success: true, code });
    } catch (err) {
        console.error('Pairing error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ========== WhatsApp session (no delay, returns code) ==========
async function startWhatsAppSessionAndGetCode(sessionId, phoneNumber) {
    return new Promise(async (resolve, reject) => {
        try {
            const { state, saveCreds } = await useMultiFileAuthState(`auth_${sessionId}`);
            const sock = makeWASocket({
                auth: state,
                printQRInTerminal: true,
                logger: require('pino')({ level: 'silent' }),
                browser: ['DARKWEB AI', 'Chrome', '116.0.0.0'],
                syncFullHistory: false,
                markOnlineOnConnect: false
            });
            let resolved = false;

            sock.ev.on('creds.update', saveCreds);
            sock.ev.on('connection.update', async (update) => {
                const { connection } = update;
                if (connection === 'open' && !resolved) {
                    try {
                        if (!sock.authState.creds.registered) {
                            const code = await sock.requestPairingCode(phoneNumber);
                            resolved = true;
                            // Keep session alive (optional)
                            // activeSessions.set(sessionId, sock);
                            resolve(code);
                        } else {
                            reject(new Error('Already registered. Use a different number or delete session.'));
                        }
                    } catch (err) {
                        reject(err);
                    }
                }
            });
            setTimeout(() => {
                if (!resolved) reject(new Error('Connection timeout (30s) – WhatsApp may be blocking Render IP'));
            }, 30000);
        } catch (err) {
            reject(err);
        }
    });
}

app.listen(PORT, () => {
    console.log(`\n◤━━━━〔 DARKWEB AI 〕━━━━◥`);
    console.log(`      ⚠️  SYSTEM ONLINE  ⚠️`);
    console.log(`🌐 Web panel: http://localhost:${PORT}`);
    console.log(`🤖 Waiting for pairing requests...`);
    console.log(`◣━━━━━━━━━━━━━━━━━━━━━━◢\n`);
});
