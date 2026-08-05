// =====================================================
// حدث "guildBanAdd": لوق + حماية Anti-Nuke من الحظر الجماعي
// =====================================================

const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { COLORS } = require('../utils/embeds');
const { modLog } = require('../utils/logger');
const { emit } = require('../modules/liveHub');

module.exports = {
    name: 'guildBanAdd',
    async execute(ban, client) {
        if (!ban.guild) return;
        const user = ban.user;

        emit('log', { level: 'warn', source: 'bans', message: `تم حظر: ${user.tag}` });

        // ------------------ حماية Mass Ban ------------------
        if (client.antiNuke?.isEnabled(ban.guild.id)) {
            const executorId = await client.antiNuke.findExecutor(ban.guild, AuditLogEvent.MemberBanAdd, user.id);
            const member = executorId ? await ban.guild.members.fetch(executorId).catch(() => null) : null;
            if (member && !client.antiNuke.isWhitelisted(ban.guild, member)) {
                const result = client.antiNuke.record(ban.guild.id, executorId);
                if (result.tripped) {
                    await client.antiNuke.punish(ban.guild, member, 'حظر جماعي (Mass Ban)');
                    return;
                }
                if (result.count === result.max) {
                    await modLog(ban.guild, {
                        color: 0xffa500,
                        title: '⚠️ نشاط مشبوه',
                        description: `${member.user.tag} يقوم بالحظر بكثرة (${result.count}/${result.max}).`,
                        timestamp: new Date()
                    }).catch(() => {});
                }
            }
        }

        // ------------------ اللوق ------------------
        const embed = new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setTitle('🔨 تم حظر عضو')
            .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) })
            .setDescription(`${user} (${user.id})`)
            .addFields({ name: '📝 السبب', value: ban.reason || 'غير محدد', inline: false })
            .setTimestamp();
        await modLog(ban.guild, embed);
    }
};
