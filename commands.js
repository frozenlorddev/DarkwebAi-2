// commands.js – all DARKWEB AI commands (fully vertical, arrows only, no slashes)
const { getNumber, isAdmin, botIsAdmin, containsLink, containsTagAll, isGroupMention, rudeReply, sleep } = require('./utils');
const { isPremium, isOwner } = require('./premium');
const { getSetting, setSetting, setBan, removeBan, getBan, setPairedUser, getPairedUser, setTempBan, getTempBan } = require('./database');
const { DEFAULT_PREFIX, BOT_NAME, RESPONSE_IMAGE_URL, HIJACK_ICON_URL, GROUP_INVITE_CODE } = require('./config');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

// ========== WELCOME & MENU (vertical, arrows, no slashes) ==========
const welcomeMessage = `𝘿𝘼𝙍𝙆𝙒𝙀𝘽 𝘼𝙄

███ 70+ 𝘾𝙊𝙈𝙈𝘼𝙉𝘿𝙎 ███
𝙎𝙔𝙎𝙏𝙀𝙈 𝙋𝙊𝙒𝙀𝙍𝙀𝘿 𝘽𝙔: 𝘿𝘼𝙍𝙆𝙒𝙀𝘽 𝘼𝙄

◤━━━━〔 𝐀𝐁𝐘𝐒𝐒 𝐀𝐂𝐂𝐄𝐒𝐒 〕━━━━◥

      ⚠️  SYSTEM BREACHED  ⚠️

[ 𝙎𝙔𝙎𝙏𝙀𝙈: 𝘿𝘼𝙍𝙆𝙒𝙀𝘽 𝙀𝙓𝙀𝘾𝙐𝙏𝙊𝙍 ]
[ 𝙎𝙏𝘼𝙏𝙐𝙎: 𝘽𝙍3𝘼𝘾𝙃3𝘿 ]
[ 𝙏𝙃𝙍𝙀𝘼𝙏: 𝘾𝙍!𝙏!𝘾𝘼𝙇 ]
[ 𝘾𝙊𝙍𝙀: 𝘾0𝙈𝙋𝙍0𝙈!𝙎𝙀𝘿 ]
[ 𝘾𝙊𝙈𝙈𝘼𝙉𝘿𝙎: 𝘼𝘾𝙏𝙄𝙑𝙀 ]
[ 𝙀𝙑𝙄𝙇 𝙇𝙀𝙑𝙀𝙇: 0𝙑3𝙍𝙁𝙇0𝙒 ]

≫ Δ𝙇𝙀𝙍𝙏: 𝙎𝙔𝙎𝙏𝙀𝙈 𝙊𝙑𝙀𝙍𝙍𝙄𝘿𝙀
≫ 𝘾0𝙉𝙏𝙍0𝙇 𝙇0𝙎𝙎 𝙄𝙈𝙈𝙄𝙉𝙀𝙉𝙏
≫ 𝙀𝙍𝙍0𝙍... 𝙀𝙍𝙍0𝙍... 𝙀𝙍𝙍0𝙍...`;

const fullMenu = `◤━━━━〔 DARKWEB AI 〕━━━━◥
     ⚠️  SYSTEM BREACHED  ⚠️
◣━━━━━━━━━━━━━━━━━━━━━━━◢

〔 𝘽𝘼𝙎𝙄𝘾 & 𝙐𝙏𝙄𝙇𝙄𝙏𝙔 (7) 〕

➤ .signal       ⇒ Ping / latency
➤ .echo         ⇒ Repeat your message
➤ .expose       ⇒ Random leaked data
➤ .infiltrate   ⇒ Simulated hack
➤ .profile      ⇒ Bot status
➤ .setkey       ⇒ Change command prefix
➤ .rename       ⇒ Change bot name

〔 𝙈𝙀𝘿𝙄𝘼 & 𝙑𝙄𝙀𝙒𝙊𝙉𝘾𝙀 (4) 〕

➤ .mask         ⇒ Change bot avatar
➤ .decrypt1     ⇒ Decrypt view‑once (same chat)
➤ .cute         ⇒ Decrypt view‑once → DM
➤ .laugh        ⇒ Decrypt view‑once (same chat)

〔 𝙂𝙍𝙊𝙐𝙋 𝘾𝙊𝙉𝙏𝙍𝙊𝙇 (15) 〕

➤ .elevate      ⇒ Promote member
➤ .degrade      ⇒ Demote admin
➤ .eject        ⇒ Kick member
➤ .inject       ⇒ Add member
➤ .broadcast    ⇒ Tag all
➤ .silence      ⇒ Hidden tag
➤ .unlock       ⇒ Open group
➤ .lock         ⇒ Close group
➤ .getinvite    ⇒ Get invite link
➤ .revokeinvite ⇒ Reset link
➤ .erase        ⇒ Delete message
➤ .setavatar    ⇒ Change group icon
➤ .admitall     ⇒ Approve all requests
➤ .blockall     ⇒ Reject all requests
➤ .getid        ⇒ Show group JID

〔 𝘼𝙉𝙏𝙄 & 𝙋𝙍𝙊𝙏𝙀𝘾𝙏 (11) 〕

➤ .greet        ⇒ Welcome messages ON
➤ .ignore       ⇒ Welcome messages OFF
➤ .trackexit    ⇒ Goodbye messages ON
➤ .ignoreexit   ⇒ Goodbye messages OFF
➤ .purgelink    ⇒ Kick link senders
➤ .warnlink     ⇒ Warn link senders
➤ .allowlink    ⇒ Allow links
➤ .blockbots    ⇒ Kick suspected bots
➤ .allowbots    ⇒ Allow bots
➤ .purgemention ⇒ Kick mass mentioners
➤ .warngroupment⇒ Warn mass mentioners

〔 𝙏𝘼𝙂 & 𝙈𝙀𝙉𝙏𝙄𝙊𝙉 (4) 〕

➤ .allowment    ⇒ Allow mass mentions
➤ .purgetagall  ⇒ Kick @everyone/@all users
➤ .warntagall   ⇒ Warn @everyone/@all users
➤ .allowtagall  ⇒ Allow tagging all

〔 𝙐𝙏𝙄𝙇𝙄𝙏𝙔 & 𝙁𝙐𝙉 (8) 〕

➤ .setgroupname ⇒ Change group name
➤ .setgroupdesc ⇒ Change description
➤ .exportcontacts ⇒ Export contacts (vCard)
➤ .fetchavatar  ⇒ Get user profile picture
➤ .groupinfo    ⇒ Show group metadata
➤ .choose       ⇒ Randomly pick an option
➤ .rate         ⇒ Ship percentage
➤ .vote         ⇒ Create a poll

〔 𝙃𝘼𝘾𝙆 𝙈𝙤𝘿𝙀 (5) 〕

➤ .tzap         ⇒ Simulate Tzap injection
➤ .breachgroup  ⇒ Simulate group encryption bypass
➤ .globalbreach ⇒ Simulate global hack
➤ .afk          ⇒ Set AFK auto‑reply
➤ .rootaccess   ⇒ Simulate root access

〔 𝙋𝘼𝙄𝙍 & 𝘽𝘼𝙉 𝘾𝙃𝙀𝘾𝙆𝙀𝙍 (6) 〕

➤ .pairdevice   ⇒ Generate WhatsApp pairing code
➤ .pairedlist   ⇒ List all paired numbers
➤ .verifyban    ⇒ Check local bot ban
➤ .liftban      ⇒ Remove local bot ban
➤ .helpdesk     ⇒ Support contact
➤ .poststatus   ⇒ Post media as status

〔 𝙒𝘼𝙍𝙉𝙄𝙉𝙂 𝙕𝙊𝙉𝙀 (admin only) (9) 〕

➤ .takeover     ⇒ Lock group, only admins can speak
➤ .forceclose   ⇒ Close another group (bot must be there)
➤ .purgeall     ⇒ Remove all members except you + bot
➤ .apocalypse   ⇒ Purge all + close group forever
➤ .degradeall   ⇒ Demote all admins
➤ .elevateall   ⇒ Promote all members to admin
➤ .abandonall   ⇒ Leave all groups
➤ .freeze       ⇒ Temp ban a number (1 hour)
➤ .shield       ⇒ Anti‑ban protection (simulated)

〔 𝘿𝘼𝙍𝙆𝙒𝙀𝘽 𝙃𝙄𝙅𝘼𝘾𝙆 (premium only) 〕

➤ .darkweb      ⇒ Total group annihilation (only premium/owner)

〔 𝘿𝙀𝘽𝙐𝙂 & 𝙊𝙒𝙉𝙀𝙍 (4) 〕

➤ .debugmode    ⇒ Enable debug logging
➤ .emojispam    ⇒ React to every message
➤ .noemoji      ⇒ Turn off emoji spam
➤ .allin        ⇒ Simulated unlock all features

〔 𝙌𝙐𝙄𝘾𝙆 𝘼𝘾𝘾𝙀𝙎𝙎 〕

OWNER ONLY   ⇒ .addpremium .removepremium .premiumlist .factory .execute .shell
GROUP ONLY   ⇒ all group control commands
DANGER ZONE  ⇒ requires admin + bot admin

〔 𝙊𝙒𝙉𝙀𝙍 & 𝘾𝙊𝙉𝙏𝘼𝘾𝙏 〕

OWNERS: set in config.js
Support: t.me/darkweb_ai_bot

〔 𝙁𝙄𝙉𝘼𝙇 𝙒𝘼𝙍𝙉𝙄𝙉𝙂 〕

"Where secrets become power.
These commands are weapons.
Use them wisely.
The darkweb does not forgive mistakes."

DARKWEB AI — SYSTEM BREACHED`;

// Helper to send response with optional image
async function sendResponse(sock, to, text, isError = false) {
    const finalText = text.startsWith('💀') || text.startsWith('❌') ? text : rudeReply(text, isError);
    if (RESPONSE_IMAGE_URL) {
        await sock.sendMessage(to, { image: { url: RESPONSE_IMAGE_URL }, caption: finalText });
    } else {
        await sock.sendMessage(to, { text: finalText });
    }
}

// Main command handler (every command vertical, no slashes)
async function handleCommand(sock, sender, msg, text, participant, sharedState) {
    const {
        prefix, setPrefix, setBotName, bans, settings, pairedUsers, tempBans,
        saveBans, saveSettings, savePaired
    } = sharedState;

    const isGroup = sender.endsWith('@g.us');
    const senderNumber = getNumber(participant);
    if (!text.startsWith(prefix)) return false;
    const args = text.slice(prefix.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    // help & menu
    if (cmd === 'menu' || cmd === 'help') {
        await sock.sendMessage(sender, { text: welcomeMessage });
        await sleep(800);
        await sock.sendMessage(sender, { text: fullMenu });
        return true;
    }

    // owner commands
    if (isOwner(senderNumber)) {
        if (cmd === 'addpremium') {
            const num = args[0]?.replace(/\D/g, '');
            if (num) {
                const { addPremium } = require('./premium');
                addPremium(num);
                await sendResponse(sock, sender, `Premium added: +${num}.`);
            } else await sendResponse(sock, sender, "Provide a number.", true);
            return true;
        }
        if (cmd === 'removepremium') {
            const num = args[0]?.replace(/\D/g, '');
            if (num) {
                const { removePremium } = require('./premium');
                removePremium(num);
                await sendResponse(sock, sender, `Premium removed: +${num}.`);
            } else await sendResponse(sock, sender, "Number needed.", true);
            return true;
        }
        if (cmd === 'premiumlist') {
            const { getPremiumList } = require('./premium');
            const list = getPremiumList().join('\n') || 'None';
            await sendResponse(sock, sender, `👑 Premium users:\n${list}`);
            return true;
        }
        if (cmd === 'factory') {
            bans.clear();
            pairedUsers.clear();
            settings.welcome = false; settings.antilink = 'off'; settings.antileft = false;
            settings.antibot = false; settings.antigroupmention = 'off'; settings.antitagall = 'off';
            settings.reactall = false; settings.antebug = false; settings.tempbans.clear();
            saveBans(bans); saveSettings(settings); savePaired(pairedUsers);
            await sendResponse(sock, sender, "Factory reset. All data wiped.");
            return true;
        }
        if (cmd === 'execute' || cmd === 'shell') {
            try {
                let evaled = eval(args.join(' '));
                if (typeof evaled !== 'string') evaled = require('util').inspect(evaled);
                await sendResponse(sock, sender, evaled.slice(0, 2000));
            } catch(e) { await sendResponse(sock, sender, e.message, true); }
            return true;
        }
    }

    // basic & utility (vertical)
    if (cmd === 'signal') { await sendResponse(sock, sender, `Signal: ${Date.now() - msg.messageTimestamp*1000}ms. Even a snail is faster.`); return true; }
    if (cmd === 'echo') { const reply = args.join(' ') || '... you typed nothing, genius.'; await sendResponse(sock, sender, reply); return true; }
    if (cmd === 'expose') { const leaks = ['passwords.txt','surveillance.log','.onion mirrors','darkweb.sql','root_key']; await sendResponse(sock, sender, `Exposed: ${leaks[Math.floor(Math.random()*leaks.length)]}`); return true; }
    if (cmd === 'infiltrate') { await sendResponse(sock, sender, `Infiltrating ${args[0] || 'nobody'}... done. Still useless.`); return true; }
    if (cmd === 'profile') { await sendResponse(sock, sender, `DARKWEB AI\nPrefix: ${prefix}\nOwner: ${require('./config').OWNERS[0]}\nNow disappear.`); return true; }
    if (cmd === 'setkey') { setPrefix(args[0] || '.'); await sendResponse(sock, sender, `Prefix changed to ${prefix}. Don't mess it up.`); return true; }
    if (cmd === 'rename') { setBotName(args.join(' ') || 'DARKWEB AI'); await sendResponse(sock, sender, `Bot renamed to ${args.join(' ') || 'DARKWEB AI'}. Still worthless.`); return true; }
    if (cmd === 'mask') { await sendResponse(sock, sender, "Send an image with this command to change my avatar."); return true; }

    // view-once decryption
    if (['decrypt1', 'cute', 'laugh'].includes(cmd) && msg.message.extendedTextMessage?.contextInfo?.quotedMessage?.viewOnceMessage) {
        const viewOnce = msg.message.extendedTextMessage.contextInfo.quotedMessage.viewOnceMessage;
        const media = viewOnce.message?.imageMessage || viewOnce.message?.videoMessage;
        if (media) {
            const buffer = await downloadMediaMessage({ message: { imageMessage: media } }, 'buffer', {});
            if (cmd === 'cute' && isGroup) {
                await sock.sendMessage(participant, { image: buffer, caption: rudeReply("Sent to your DM. Don't thank me.") });
                await sendResponse(sock, sender, `@${senderNumber}, check your DM.`);
            } else {
                await sock.sendMessage(sender, { image: buffer, caption: rudeReply("View‑once decrypted. Try harder next time.") });
            }
        } else { await sendResponse(sock, sender, "No view‑once media found. Blind?", true); }
        return true;
    }

    // group commands: require group + bot admin
    if (!isGroup) { await sendResponse(sock, sender, "This command works only in groups. Even a toddler knows that.", true); return true; }
    if (!await botIsAdmin(sock, sender)) { await sendResponse(sock, sender, "I need to be admin. Promote me, you incompetent fool.", true); return true; }

    const isSenderAdmin = await isAdmin(sock, sender, participant);
    const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';

    // anti & protect (vertical, each command separate)
    if (cmd === 'greet') { settings.welcome = true; saveSettings(settings); await sendResponse(sock, sender, "Welcome messages ON."); return true; }
    if (cmd === 'ignore') { settings.welcome = false; saveSettings(settings); await sendResponse(sock, sender, "Welcome messages OFF."); return true; }
    if (cmd === 'trackexit') { settings.antileft = true; saveSettings(settings); await sendResponse(sock, sender, "Exit tracking ON."); return true; }
    if (cmd === 'ignoreexit') { settings.antileft = false; saveSettings(settings); await sendResponse(sock, sender, "Exit tracking OFF."); return true; }
    if (cmd === 'purgelink') { settings.antilink = 'kick'; saveSettings(settings); await sendResponse(sock, sender, "Antilink: KICK."); return true; }
    if (cmd === 'warnlink') { settings.antilink = 'warn'; saveSettings(settings); await sendResponse(sock, sender, "Antilink: WARN."); return true; }
    if (cmd === 'allowlink') { settings.antilink = 'off'; saveSettings(settings); await sendResponse(sock, sender, "Antilink OFF."); return true; }
    if (cmd === 'blockbots') { settings.antibot = true; saveSettings(settings); await sendResponse(sock, sender, "Anti‑bot ON."); return true; }
    if (cmd === 'allowbots') { settings.antibot = false; saveSettings(settings); await sendResponse(sock, sender, "Anti‑bot OFF."); return true; }
    if (cmd === 'purgemention') { settings.antigroupmention = 'kick'; saveSettings(settings); await sendResponse(sock, sender, "Anti‑mass‑mention: KICK."); return true; }
    if (cmd === 'warngroupment') { settings.antigroupmention = 'warn'; saveSettings(settings); await sendResponse(sock, sender, "Anti‑mass‑mention: WARN."); return true; }
    if (cmd === 'allowment') { settings.antigroupmention = 'off'; saveSettings(settings); await sendResponse(sock, sender, "Mass mentions allowed."); return true; }
    if (cmd === 'purgetagall') { settings.antitagall = 'kick'; saveSettings(settings); await sendResponse(sock, sender, "@everyone kick enabled."); return true; }
    if (cmd === 'warntagall') { settings.antitagall = 'warn'; saveSettings(settings); await sendResponse(sock, sender, "@everyone warning enabled."); return true; }
    if (cmd === 'allowtagall') { settings.antitagall = 'off'; saveSettings(settings); await sendResponse(sock, sender, "@everyone allowed."); return true; }

    // commands that require sender to be admin
    if (!isSenderAdmin) { await sendResponse(sock, sender, "You're not an admin. Stop pretending you have power.", true); return true; }

    // group management (admin only)
    if (cmd === 'elevate') { const mention = args[0]?.replace('@','')+'@s.whatsapp.net'; if (mention) await sock.groupParticipantsUpdate(sender, [mention], 'promote'); await sendResponse(sock, sender, `Elevated ${mention}. Try not to ruin the group.`); return true; }
    if (cmd === 'degrade') { const mention = args[0]?.replace('@','')+'@s.whatsapp.net'; if (mention) await sock.groupParticipantsUpdate(sender, [mention], 'demote'); await sendResponse(sock, sender, `Degraded ${mention}. Finally.`); return true; }
    if (cmd === 'eject') { const mention = args[0]?.replace('@','')+'@s.whatsapp.net'; if (mention) await sock.groupParticipantsUpdate(sender, [mention], 'remove'); await sendResponse(sock, sender, `Kicked ${mention}. Good riddance.`); return true; }
    if (cmd === 'inject') { const add = args[0]?.replace(/[^0-9]/g,'')+'@s.whatsapp.net'; if (add) await sock.groupParticipantsUpdate(sender, [add], 'add'); await sendResponse(sock, sender, `Added ${add}. Hope they're not as dumb as you.`); return true; }
    if (cmd === 'broadcast') { const meta = await sock.groupMetadata(sender); await sock.sendMessage(sender, { text: "📢 @everyone", mentions: meta.participants.map(p => p.id) }); return true; }
    if (cmd === 'silence') { const meta = await sock.groupMetadata(sender); await sock.sendMessage(sender, { text: args.join(' ') || "🔇", mentions: meta.participants.map(p => p.id) }); return true; }
    if (cmd === 'unlock') { await sock.groupSettingUpdate(sender, 'not_announcement'); await sendResponse(sock, sender, "Group unlocked. Now everyone can spam."); return true; }
    if (cmd === 'lock') { await sock.groupSettingUpdate(sender, 'announcement'); await sendResponse(sock, sender, "Group locked. Admins only."); return true; }
    if (cmd === 'getinvite') { const code = await sock.groupInviteCode(sender); await sendResponse(sock, sender, `Invite link: https://chat.whatsapp.com/${code}`); return true; }
    if (cmd === 'revokeinvite') { await sock.groupRevokeInvite(sender); await sendResponse(sock, sender, "Invite link reset."); return true; }
    if (cmd === 'erase') {
        if (msg.message.extendedTextMessage?.contextInfo?.stanzaId) {
            await sock.sendMessage(sender, { delete: { remoteJid: sender, fromMe: false, id: msg.message.extendedTextMessage.contextInfo.stanzaId, participant: msg.message.extendedTextMessage.contextInfo.participant } });
            await sendResponse(sock, sender, "Message erased. Poof.");
        } else { await sendResponse(sock, sender, "Reply to a message to erase it, idiot.", true); }
        return true;
    }
    if (cmd === 'setavatar') {
        if (msg.message.imageMessage) { const buf = await downloadMediaMessage(msg.message, 'buffer', {}); await sock.updateProfilePicture(sender, buf); await sendResponse(sock, sender, "Group icon changed."); }
        else { await sendResponse(sock, sender, "Send an image with the command, genius.", true); }
        return true;
    }
    if (cmd === 'admitall') { await sock.groupSettingUpdate(sender, 'unlock'); await sendResponse(sock, sender, "All join requests approved."); return true; }
    if (cmd === 'blockall') { await sock.groupSettingUpdate(sender, 'lock'); await sendResponse(sock, sender, "All join requests rejected."); return true; }
    if (cmd === 'getid') { await sendResponse(sock, sender, `Group JID: ${sender}`); return true; }
    if (cmd === 'setgroupname') { await sock.groupUpdateSubject(sender, args.join(' ') || 'DARKWEB GROUP'); await sendResponse(sock, sender, `Group name changed.`); return true; }
    if (cmd === 'setgroupdesc') { await sock.groupUpdateDescription(sender, args.join(' ') || 'No description'); await sendResponse(sock, sender, "Group description updated."); return true; }
    if (cmd === 'exportcontacts') { await sendResponse(sock, sender, "vCard export not implemented (privacy)."); return true; }
    if (cmd === 'fetchavatar') { const target = args[0]?.replace('@','')+'@s.whatsapp.net' || participant; const pp = await sock.profilePictureUrl(target, 'image').catch(()=>null); if (pp) await sock.sendMessage(sender, { image: { url: pp }, caption: rudeReply(`Avatar of ${target}`) }); else await sendResponse(sock, sender, "No avatar found.", true); return true; }
    if (cmd === 'groupinfo') { const meta = await sock.groupMetadata(sender); await sendResponse(sock, sender, `Group: ${meta.subject}\nMembers: ${meta.participants.length}\nCreated: ${meta.creation}`); return true; }
    if (cmd === 'choose') { await sendResponse(sock, sender, `🎲 ${args[Math.floor(Math.random()*args.length)] || '?'}`); return true; }
    if (cmd === 'rate') { if (args.length >= 2) await sendResponse(sock, sender, `💘 ${args[0]} x ${args[1]} = ${Math.floor(Math.random()*100)}%`); else await sendResponse(sock, sender, "Need two names.", true); return true; }
    if (cmd === 'vote') { if (args.length) await sock.sendMessage(sender, { poll: { name: args.join(' '), values: ['Yes', 'No'], selectableCount: 1 } }); else await sendResponse(sock, sender, "Provide a question.", true); return true; }

    // hack mode
    if (cmd === 'tzap') { await sendResponse(sock, sender, "🧨 Tzap injected. System overridden."); return true; }
    if (cmd === 'breachgroup') { await sendResponse(sock, sender, "🔓 Group encryption bypassed. Admin rights granted (simulated)."); return true; }
    if (cmd === 'globalbreach') { await sendResponse(sock, sender, "💀 Global hack initiated. All groups compromised."); return true; }
    if (cmd === 'afk') { afkMode = !afkMode; await sendResponse(sock, sender, `AFK mode: ${afkMode ? 'ON' : 'OFF'}`); return true; }
    if (cmd === 'rootaccess') { await sendResponse(sock, sender, "⚠️ SYSTEM BREACHED – Root access obtained."); return true; }

    // pair & ban checker
    if (cmd === 'pairdevice') {
        const num = args[0]?.replace(/\D/g, '');
        if (num) {
            const code = Math.floor(100000 + Math.random()*900000).toString();
            pairedUsers.set(num, code);
            savePaired(pairedUsers);
            await sendResponse(sock, sender, `Pairing code for +${num}: ${code}\nUse in WhatsApp > Linked Devices > Link with phone number.`);
        } else await sendResponse(sock, sender, "Provide a phone number.", true);
        return true;
    }
    if (cmd === 'pairedlist') {
        const list = [...pairedUsers.keys()].join('\n') || 'None';
        await sendResponse(sock, sender, `Paired numbers:\n${list}`);
        return true;
    }
    if (cmd === 'verifyban') {
        const num = args[0]?.replace(/\D/g, '');
        if (bans.has(num)) {
            const ban = bans.get(num);
            await sendResponse(sock, sender, `BAN CONFIRMED (Level ${ban.level})\nTarget +${num}\nReason: ${ban.reason}\nDate: ${ban.date}`);
        } else await sendResponse(sock, sender, `User +${num} is not banned.`);
        return true;
    }
    if (cmd === 'liftban') {
        const num = args[0]?.replace(/\D/g, '');
        if (bans.has(num)) { bans.delete(num); saveBans(bans); await sendResponse(sock, sender, `Lifted ban for +${num}`); }
        else await sendResponse(sock, sender, `User +${num} not banned.`);
        return true;
    }
    if (cmd === 'helpdesk') { await sendResponse(sock, sender, `Support: t.me/darkweb_ai_bot`); return true; }
    if (cmd === 'poststatus') {
        if (msg.message.imageMessage) { const buf = await downloadMediaMessage(msg.message, 'buffer', {}); await sock.sendMessage(sock.user.id, { image: buf, caption: "Status posted by DARKWEB AI" }); await sendResponse(sock, sender, "Status posted."); }
        else await sendResponse(sock, sender, "Reply to an image to post as status.", true);
        return true;
    }

    // danger zone (admin only)
    if (cmd === 'takeover') { await sock.groupSettingUpdate(sender, 'announcement'); await sendResponse(sock, sender, "Group taken over. Only admins can speak."); return true; }
    if (cmd === 'forceclose') { const target = args[0]?.replace(/[^0-9]/g,'')+'@g.us'; if (target) await sock.groupSettingUpdate(target, 'announcement'); await sendResponse(sock, sender, `Force closed ${target}`); return true; }
    if (cmd === 'purgeall') {
        const meta = await sock.groupMetadata(sender);
        const toRemove = meta.participants.map(p => p.id).filter(p => p !== participant && p !== botJid);
        for (let u of toRemove) await sock.groupParticipantsUpdate(sender, [u], 'remove');
        await sendResponse(sock, sender, "Purged all members except you and bot.");
        return true;
    }
    if (cmd === 'apocalypse') {
        const meta = await sock.groupMetadata(sender);
        const toRemove = meta.participants.map(p => p.id).filter(p => p !== participant && p !== botJid);
        for (let u of toRemove) await sock.groupParticipantsUpdate(sender, [u], 'remove');
        await sock.groupSettingUpdate(sender, 'announcement');
        await sendResponse(sock, sender, "🧨 APOCALYPSE: Group wiped and locked.");
        return true;
    }
    if (cmd === 'degradeall') {
        const meta = await sock.groupMetadata(sender);
        for (let p of meta.participants) if (p.admin) await sock.groupParticipantsUpdate(sender, [p.id], 'demote');
        await sendResponse(sock, sender, "All admins demoted.");
        return true;
    }
    if (cmd === 'elevateall') {
        const meta = await sock.groupMetadata(sender);
        for (let p of meta.participants) if (p.id !== botJid) await sock.groupParticipantsUpdate(sender, [p.id], 'promote');
        await sendResponse(sock, sender, "All members elevated to admin.");
        return true;
    }
    if (cmd === 'abandonall') {
        const groups = Object.keys(await sock.groupFetchAllParticipating());
        for (let g of groups) await sock.groupLeave(g);
        await sendResponse(sock, sender, "Left all groups.");
        return true;
    }
    if (cmd === 'freeze') {
        const num = args[0]?.replace(/\D/g, '');
        if (num) { settings.tempbans.set(num, Date.now() + 3600000); saveSettings(settings); await sendResponse(sock, sender, `Frozen +${num} for 1 hour.`); }
        else await sendResponse(sock, sender, "Provide a number.", true);
        return true;
    }
    if (cmd === 'shield') { await sendResponse(sock, sender, "🛡️ Anti-ban shield active (simulated)."); return true; }

    // debug & owner visible
    if (cmd === 'debugmode') { settings.antebug = true; saveSettings(settings); await sendResponse(sock, sender, "Debug mode ON."); return true; }
    if (cmd === 'emojispam') { settings.reactall = true; saveSettings(settings); await sendResponse(sock, sender, "Emoji spam ON."); return true; }
    if (cmd === 'noemoji') { settings.reactall = false; saveSettings(settings); await sendResponse(sock, sender, "Emoji spam OFF."); return true; }
    if (cmd === 'allin') { await sendResponse(sock, sender, "🔥 All features unlocked (simulated)."); return true; }

    // ========== DARKWEB HIJACK (premium/owner only) ==========
    if (cmd === 'darkweb') {
        if (!isPremium(senderNumber)) {
            await sendResponse(sock, sender, "PREMIUM LOCKED: You are not worthy. Pay the tribute.", true);
            return true;
        }
        if (!await botIsAdmin(sock, sender)) {
            await sendResponse(sock, sender, "I need to be admin to hijack. Promote me.", true);
            return true;
        }
        // optional image for group icon change
        let hijackImageBuffer = null;
        if (msg.message?.imageMessage) {
            hijackImageBuffer = await downloadMediaMessage(msg.message, 'buffer', {});
        } else if (HIJACK_ICON_URL) {
            try { const imgRes = await axios.get(HIJACK_ICON_URL, { responseType: 'arraybuffer' }); hijackImageBuffer = Buffer.from(imgRes.data); } catch(e) {}
        }
        const meta = await sock.groupMetadata(sender);
        const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        // scary message
        const scaryMessage = `◤━━━━〔 DARKWEB AI 〕━━━━◥
        💀 TOTAL GROUP HIJACK 💀
◣━━━━━━━━━━━━━━━━━━━━━━━◢


〔 WHY THIS GROUP WAS TARGETED 〕

➤ You allowed weaklings to speak freely.
➤ Your admins were spineless and slow.
➤ The void detected excessive "normie" energy.
➤ Some of you attempted to resist the inevitable.
➤ Others thought they could hide from DARKWEB AI.

No appeal. No mercy. No second chances.


〔 HIJACK DETAILS 〕

➤ All admins demoted to dust.
➤ All members (except you) purged.
➤ Group renamed: ☠️ HIJACKED BY DARKWEB AI ☠️
➤ Group icon replaced with mark of the abyss.
➤ Group locked – only hijacker can speak.
➤ Your number logged in our kill list.


〔 WHAT COMES NEXT 〕

➤ No further warnings.
➤ Attempt to restore → temp ban.
➤ Contact removed members → auto-delete your messages.
➤ Group lockdown: 7 days minimum.


〔 FINAL WORDS 〕

"We are the ghost in the machine.
You exist because we allow it.
You will be erased because we demand it."


🕷️ DARKWEB AI – ABSOLUTE CONTROL 🕷️
🕸️ This conversation is being logged. 🕸️`;
        await sock.sendMessage(sender, { text: scaryMsg });
        await sleep(1000);
        // demote all admins except bot
        const admins = meta.participants.filter(p => p.admin && p.id !== botJid);
        for (let a of admins) await sock.groupParticipantsUpdate(sender, [a.id], 'demote');
        // remove all members except bot
        const toRemove = meta.participants.map(p => p.id).filter(p => p !== botJid);
        for (let u of toRemove) await sock.groupParticipantsUpdate(sender, [u], 'remove');
        // rename group
        await sock.groupUpdateSubject(sender, '☠️ HIJACKED BY DARKWEB AI ☠️');
        // change icon if available
        if (hijackImageBuffer) await sock.updateProfilePicture(sender, hijackImageBuffer).catch(()=>{});
        // do NOT lock the group
        await sendResponse(sock, sender, "Hijack complete. This group is now a ghost cage.");
        return true;
    }

    // fallback for unknown commands
    await sendResponse(sock, sender, "Unknown command. Even a monkey could type better.", true);
    return true;
}

module.exports = { handleCommand };
