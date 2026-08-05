// =====================================================
// أداة تسجيل الأحداث في قنوات اللوقات
// =====================================================

const { getGuildSettings } = require('./settings');

// إرسال رسالة إلى قناة محددة مع تجاهل الأخطاء بهدوء
async function sendToChannel(guild, channelId, payload) {
    if (!guild || !channelId) return false;
    try {
        const channel = guild.channels.cache.get(channelId) || await guild.channels.fetch(channelId).catch(() => null);
        if (!channel) return false;
        await channel.send(payload);
        return true;
    } catch (err) {
        return false;
    }
}

// إرسال إلى قناة لوقات الإدارة (mod log)
async function modLog(guild, embed) {
    if (!guild) return false;
    const settings = getGuildSettings(guild.id);
    return sendToChannel(guild, settings.modLogChannelId, { embeds: [embed] });
}

// إرسال إلى قناة لوقات الأعضاء (join/leave)
async function memberLog(guild, embed) {
    if (!guild) return false;
    const settings = getGuildSettings(guild.id);
    return sendToChannel(guild, settings.memberLogChannelId, { embeds: [embed] });
}

module.exports = { sendToChannel, modLog, memberLog };
