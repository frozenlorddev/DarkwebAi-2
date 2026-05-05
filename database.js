// database.js – safe fallback: JSON only unless DATABASE_URL works
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { DATA_DIR } = require('./utils');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

let pool = null;
let dbEnabled = false;

if (process.env.DATABASE_URL) {
    try {
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });
        // Test connection
        pool.connect().then(client => {
            client.release();
            console.log('✅ PostgreSQL (Neon) connected');
            dbEnabled = true;
            initTables().catch(console.error);
        }).catch(err => {
            console.warn('⚠️ PostgreSQL connection failed, using JSON fallback:', err.message);
            pool = null;
        });
    } catch(e) {
        console.warn('⚠️ PostgreSQL init error, using JSON fallback:', e.message);
        pool = null;
    }
} else {
    console.log('💾 No DATABASE_URL, using JSON file storage');
}

async function initTables() {
    if (!pool) return;
    const client = await pool.connect();
    await client.query(`
        CREATE TABLE IF NOT EXISTS bans (
            phone_number TEXT PRIMARY KEY,
            level INTEGER DEFAULT 1,
            reason TEXT,
            banned_at TIMESTAMP DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT,
            updated_at TIMESTAMP DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS paired_users (
            phone_number TEXT PRIMARY KEY,
            code TEXT,
            paired_at TIMESTAMP DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS temp_bans (
            phone_number TEXT PRIMARY KEY,
            expires_at TIMESTAMP,
            reason TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        );
    `);
    client.release();
}

// ========== BANS ==========
async function getBan(phone) {
    if (dbEnabled && pool) {
        const res = await pool.query('SELECT * FROM bans WHERE phone_number = $1', [phone]);
        return res.rows[0] || null;
    }
    const bans = loadJSON('bans.json');
    return bans[phone] || null;
}
async function setBan(phone, level, reason) {
    if (dbEnabled && pool) {
        await pool.query(
            `INSERT INTO bans (phone_number, level, reason) VALUES ($1,$2,$3)
             ON CONFLICT (phone_number) DO UPDATE SET level=$2, reason=$3, banned_at=NOW()`,
            [phone, level, reason]
        );
        return;
    }
    const bans = loadJSON('bans.json');
    bans[phone] = { level, reason, banned_at: new Date().toISOString() };
    saveJSON('bans.json', bans);
}
async function removeBan(phone) {
    if (dbEnabled && pool) {
        await pool.query('DELETE FROM bans WHERE phone_number = $1', [phone]);
        return;
    }
    const bans = loadJSON('bans.json');
    delete bans[phone];
    saveJSON('bans.json', bans);
}
async function getAllBans() {
    if (dbEnabled && pool) {
        const res = await pool.query('SELECT phone_number, level, reason, banned_at FROM bans');
        return res.rows;
    }
    const bans = loadJSON('bans.json');
    return Object.entries(bans).map(([phone, data]) => ({ phone_number: phone, ...data }));
}

// ========== SETTINGS ==========
async function getSetting(key, defaultValue = null) {
    if (dbEnabled && pool) {
        const res = await pool.query('SELECT value FROM settings WHERE key = $1', [key]);
        if (res.rows.length) {
            try { return JSON.parse(res.rows[0].value); } catch { return res.rows[0].value; }
        }
        return defaultValue;
    }
    const settings = loadJSON('settings.json');
    const val = settings[key];
    if (val !== undefined) {
        try { return JSON.parse(val); } catch { return val; }
    }
    return defaultValue;
}
async function setSetting(key, value) {
    const stringVal = typeof value === 'object' ? JSON.stringify(value) : String(value);
    if (dbEnabled && pool) {
        await pool.query(
            `INSERT INTO settings (key, value) VALUES ($1,$2)
             ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=NOW()`,
            [key, stringVal]
        );
        return;
    }
    const settings = loadJSON('settings.json');
    settings[key] = stringVal;
    saveJSON('settings.json', settings);
}

// ========== PAIRED USERS ==========
async function getPairedUser(phone) {
    if (dbEnabled && pool) {
        const res = await pool.query('SELECT code, paired_at FROM paired_users WHERE phone_number = $1', [phone]);
        return res.rows[0] || null;
    }
    const paired = loadJSON('paired.json');
    return paired[phone] || null;
}
async function setPairedUser(phone, code) {
    if (code === null) {
        if (dbEnabled && pool) {
            await pool.query('DELETE FROM paired_users WHERE phone_number = $1', [phone]);
        } else {
            const paired = loadJSON('paired.json');
            delete paired[phone];
            saveJSON('paired.json', paired);
        }
        return;
    }
    if (dbEnabled && pool) {
        await pool.query(
            `INSERT INTO paired_users (phone_number, code) VALUES ($1,$2)
             ON CONFLICT (phone_number) DO UPDATE SET code=$2, paired_at=NOW()`,
            [phone, code]
        );
        return;
    }
    const paired = loadJSON('paired.json');
    paired[phone] = { code, paired_at: new Date().toISOString() };
    saveJSON('paired.json', paired);
}
async function getAllPaired() {
    if (dbEnabled && pool) {
        const res = await pool.query('SELECT phone_number, code, paired_at FROM paired_users');
        return res.rows;
    }
    const paired = loadJSON('paired.json');
    return Object.entries(paired).map(([phone, data]) => ({ phone_number: phone, ...data }));
}

// ========== TEMP BANS ==========
async function getTempBan(phone) {
    if (dbEnabled && pool) {
        const res = await pool.query('SELECT * FROM temp_bans WHERE phone_number = $1 AND expires_at > NOW()', [phone]);
        return res.rows[0] || null;
    }
    const tempBans = loadJSON('tempbans.json');
    const entry = tempBans[phone];
    if (entry && new Date(entry.expires_at) > new Date()) return entry;
    return null;
}
async function setTempBan(phone, durationMinutes, reason = null) {
    const expiresAt = new Date(Date.now() + durationMinutes * 60000);
    if (dbEnabled && pool) {
        await pool.query(
            `INSERT INTO temp_bans (phone_number, expires_at, reason) VALUES ($1,$2,$3)
             ON CONFLICT (phone_number) DO UPDATE SET expires_at=$2, reason=$3, created_at=NOW()`,
            [phone, expiresAt, reason]
        );
        return;
    }
    const tempBans = loadJSON('tempbans.json');
    tempBans[phone] = { expires_at: expiresAt.toISOString(), reason };
    saveJSON('tempbans.json', tempBans);
}
async function removeTempBan(phone) {
    if (dbEnabled && pool) {
        await pool.query('DELETE FROM temp_bans WHERE phone_number = $1', [phone]);
        return;
    }
    const tempBans = loadJSON('tempbans.json');
    delete tempBans[phone];
    saveJSON('tempbans.json', tempBans);
}
async function cleanupExpiredTempBans() {
    if (dbEnabled && pool) {
        await pool.query('DELETE FROM temp_bans WHERE expires_at <= NOW()');
        return;
    }
    const tempBans = loadJSON('tempbans.json');
    let changed = false;
    const now = new Date();
    for (const [phone, data] of Object.entries(tempBans)) {
        if (new Date(data.expires_at) <= now) {
            delete tempBans[phone];
            changed = true;
        }
    }
    if (changed) saveJSON('tempbans.json', tempBans);
}

// ========== JSON HELPERS ==========
function loadJSON(filename) {
    const filePath = path.join(DATA_DIR, filename);
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
        return {};
    }
}
function saveJSON(filename, data) {
    const filePath = path.join(DATA_DIR, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

module.exports = {
    getBan, setBan, removeBan, getAllBans,
    getSetting, setSetting,
    getPairedUser, setPairedUser, getAllPaired,
    getTempBan, setTempBan, removeTempBan, cleanupExpiredTempBans
};
