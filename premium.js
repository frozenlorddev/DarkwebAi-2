// premium.js – premium user management for DARKWEB AI
const fs = require('fs');
const path = require('path');
const { DATA_DIR } = require('./utils');
const { OWNERS } = require('./config');

const PREMIUM_FILE = path.join(DATA_DIR, 'premium.json');
let premiumUsers = new Set();

// Load premium users from JSON file
function loadPremium() {
    try {
        if (fs.existsSync(PREMIUM_FILE)) {
            const data = fs.readFileSync(PREMIUM_FILE, 'utf8');
            const arr = JSON.parse(data);
            premiumUsers = new Set(arr);
        } else {
            premiumUsers = new Set();
        }
    } catch (err) {
        console.error('Failed to load premium users:', err);
        premiumUsers = new Set();
    }
}

// Save premium users to JSON file
function savePremium() {
    try {
        fs.writeFileSync(PREMIUM_FILE, JSON.stringify([...premiumUsers], null, 2));
    } catch (err) {
        console.error('Failed to save premium users:', err);
    }
}

// Initialize on module load
loadPremium();

// Check if a number is an owner (hardcoded in config)
function isOwner(number) {
    return OWNERS.includes(number);
}

// Check if a number is premium (includes owners automatically)
function isPremium(number) {
    return premiumUsers.has(number) || isOwner(number);
}

// Add a premium user (owner only)
function addPremium(number) {
    if (!premiumUsers.has(number)) {
        premiumUsers.add(number);
        savePremium();
        return true;
    }
    return false;
}

// Remove a premium user (owner only)
function removePremium(number) {
    if (premiumUsers.has(number)) {
        premiumUsers.delete(number);
        savePremium();
        return true;
    }
    return false;
}

// Get all premium users (excluding owners for privacy)
function getPremiumList() {
    return [...premiumUsers];
}

// Get all premium users including owners (for owner display)
function getAllPrivilegedUsers() {
    return [...new Set([...premiumUsers, ...OWNERS])];
}

module.exports = {
    isOwner,
    isPremium,
    addPremium,
    removePremium,
    getPremiumList,
    getAllPrivilegedUsers
};