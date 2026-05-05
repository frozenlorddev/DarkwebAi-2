// config.js
const path = require('path');

module.exports = {
    // Server
    PORT: process.env.PORT || 3000,
    
    // Owners (phone numbers without '+')
    OWNERS: ['254700000001', '254700000002'], // CHANGE THESE
    
    // Default bot settings
    DEFAULT_PREFIX: '.',
    BOT_NAME: 'DARKWEB AI',
    
    // Group auto‑join after pairing (the invite code part after https://chat.whatsapp.com/)
    GROUP_INVITE_CODE: 'YOUR_GROUP_INVITE_CODE', // CHANGE
    
    // Optional: default image for command responses (URL or local path)
    RESPONSE_IMAGE_URL: null, // e.g., 'https://example.com/hacker-skull.jpg'
    
    // Optional: default group icon when hijacking
    HIJACK_ICON_URL: null,
    
    // Max concurrent WhatsApp sessions (for web pairing)
    MAX_SESSIONS: 30,
    
    // Directories
    DATA_DIR: path.join(__dirname, 'data'),
    AUTH_DIR: path.join(__dirname, 'auth_sessions')
};