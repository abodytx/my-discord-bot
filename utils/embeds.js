// =====================================================
// ألوان وقوالب Embeds موحدة عبر كل البوت لضمان تناسق التصميم
// =====================================================

const { EmbedBuilder } = require('discord.js');

const COLORS = {
    PRIMARY: 0x5865F2,   // أزرق ديسكورد الرسمي
    SUCCESS: 0x57F287,   // أخضر للنجاح
    ERROR: 0xED4245,     // أحمر للأخطاء
    WARNING: 0xFEE75C,   // أصفر للتحذيرات
    INFO: 0xEB459E       // وردي للمعلومات العامة
};

function successEmbed(title, description) {
    return new EmbedBuilder()
        .setColor(COLORS.SUCCESS)
        .setTitle(`✅ ${title}`)
        .setDescription(description)
        .setTimestamp();
}

function errorEmbed(title, description) {
    return new EmbedBuilder()
        .setColor(COLORS.ERROR)
        .setTitle(`❌ ${title}`)
        .setDescription(description)
        .setTimestamp();
}

function infoEmbed(title, description) {
    return new EmbedBuilder()
        .setColor(COLORS.INFO)
        .setTitle(`ℹ️ ${title}`)
        .setDescription(description)
        .setTimestamp();
}

function baseEmbed() {
    return new EmbedBuilder().setColor(COLORS.PRIMARY).setTimestamp();
}

module.exports = { COLORS, successEmbed, errorEmbed, infoEmbed, baseEmbed };
