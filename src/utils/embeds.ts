// =====================================================
// ألوان وقوالب Embeds موحدة عبر كل البوت لضمان تناسق التصميم
// =====================================================

import { EmbedBuilder } from 'discord.js';

export const COLORS = {
    PRIMARY: 0x5865f2, // أزرق ديسكورد الرسمي
    SUCCESS: 0x57f287, // أخضر للنجاح
    ERROR: 0xed4245, // أحمر للأخطاء
    WARNING: 0xfee75c, // أصفر للتحذيرات
    INFO: 0xeb459e // وردي للمعلومات العامة
};

export function successEmbed(title: string, description: string): EmbedBuilder {
    return new EmbedBuilder()
        .setColor(COLORS.SUCCESS)
        .setTitle(`✅ ${title}`)
        .setDescription(description)
        .setTimestamp();
}

export function errorEmbed(title: string, description: string): EmbedBuilder {
    return new EmbedBuilder().setColor(COLORS.ERROR).setTitle(`❌ ${title}`).setDescription(description).setTimestamp();
}

export function infoEmbed(title: string, description: string): EmbedBuilder {
    return new EmbedBuilder().setColor(COLORS.INFO).setTitle(`ℹ️ ${title}`).setDescription(description).setTimestamp();
}

export function baseEmbed(): EmbedBuilder {
    return new EmbedBuilder().setColor(COLORS.PRIMARY).setTimestamp();
}
