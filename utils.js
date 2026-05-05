// utils.js – helper functions for DARKWEB AI
const fs = require('fs');
const path = require('path');

// Data directory for JSON storage (used by database.js)
const DATA_DIR = path.join(__dirname, 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Extract phone number from WhatsApp JID
function getNumber(jid) {
    return jid?.split('@')[0] || 'unknown';
}

// Check if a user is admin in a group
async function isAdmin(sock, groupJid, participantJid) {
    try {
        const meta = await sock.groupMetadata(groupJid);
        const p = meta.participants.find(p => p.id === participantJid);
        return p?.admin === 'admin' || p?.admin === 'superadmin';
    } catch (error) {
        return false;
    }
}

// Check if the bot itself is admin in a group
async function botIsAdmin(sock, groupJid) {
    const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
    return await isAdmin(sock, groupJid, botJid);
}

// Check if a message contains a link
function containsLink(text) {
    return /(https?:\/\/[^\s]+|www\.[^\s]+|\b\w+\.(com|org|net|io|me|xyz)\b)/i.test(text);
}

// Check if a message contains @everyone or @all
function containsTagAll(text) {
    return /@(everyone|all)/i.test(text);
}

// Check if a message mentions too many people (mass mention)
function isGroupMention(msg) {
    return msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 5;
}

// Rude response generator – adds random insult before the actual message
function rudeReply(baseText, isError = false) {
    const insults = [
        "Listen here, useless human: ",
        "Pathetic. ",
        "Wow, you really tried that? ",
        "Moron. ",
        "Even a baby could do better. ",
        "You must be braindead. ",
        "Are you serious? ",
        "I've seen smarter rocks. ",
        "Your IQ is negative. ",
        "Don't quit your day job – oh wait, you have none. ",
        "Failed successfully. ",
        "Congratulations, you're still worthless. ",
        "Try again? No, don't bother. ",
        "You're the reason God created bugs. ",
        "I'd explain it to you, but I left my crayons at home. "
    ];
    const randomInsult = insults[Math.floor(Math.random() * insults.length)];
    if (isError) return `❌ ${randomInsult}${baseText}`;
    return `💀 ${randomInsult}${baseText}`;
}

// Format uptime seconds to readable string
function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
}

// Sleep/delay function
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    DATA_DIR,
    getNumber,
    isAdmin,
    botIsAdmin,
    containsLink,
    containsTagAll,
    isGroupMention,
    rudeReply,
    formatUptime,
    sleep
};