// config.js
const path = require('path');

module.exports = {
    // Server
    PORT: process.env.PORT || 3000,
    
    // Owners (phone numbers without '+')
    OWNERS: ['254739261187', '254799984735'], // CHANGE THESE
    
    // Default bot settings
    DEFAULT_PREFIX: '.',
    BOT_NAME: 'DARKWEB AI',
    
    // Group auto‑join after pairing (the invite code part after https://chat.whatsapp.com/)
    GROUP_INVITE_CODE: 'YOUR_GROUP_INVITE_CODE', // CHANGE
    
    // Optional: default image for command responses (URL or local path)
    RESPONSE_IMAGE_URL: "https://i.ibb.co/DPrNC52B/upload-1777985873997-01e4cb53-jpg.jpg", // e.g., 'https://example.com/hacker-skull.jpg'
    
    // Optional: default group icon when hijacking
    HIJACK_ICON_URL: "https://i.ibb.co/jkK36GTG/upload-1777985986928-d3d86f39-jpg.jpg",
    
    // Max concurrent WhatsApp sessions (for web pairing)
    MAX_SESSIONS: 30,
    
    // Directories
    DATA_DIR: path.join(__dirname, 'data'),
    AUTH_DIR: path.join(__dirname, 'auth_sessions')
};
