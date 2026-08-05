// =====================================================
// حدث "webhookCreate": لوق + حماية Anti-Nuke من سبام الويب هوك
// =====================================================

const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { COLORS } = require('../utils/embeds');
const { modLog } = require('../utils/logger');
const { emit } = require('../modules/liveHub');

module.exports = {
    name: 'webhookCreate',
    async execute(webhook, client) {
        if (!webhook.guild) return;

        emit('log', { level: 'warn', source: 'webhooks', message: `تم إنشاء ويب هوك: ${webhook.name}` });

        // ------------------ حماية Webhook Spam ------------------
        if (client.antiNuke?.isEnabled(webhook.guild.id)) {
            const executorId = await client.antiNuke.findExecutor(webhook.guild, AuditLogEvent.WebhookCreate, webhook.id);
            const member = executorId ? await webhook.guild.members.fetch(executorId).catch(() => null) : null;
            if (member && !client.antiNuke.isWhitelisted(webhook.guild, member)) {
                const result = client.antiNuke.record(webhook.guild.id, executorId);
                if (result.tripped) {
                    await client.antiNuke.punish(webhook.guild, member, 'سبام ويب هوك');
                    await webhook.delete('Anti-Nuke: Webhook Spam').catch(() => {});
                    return;
                }
                if (result.count === result.max) {
                    await modLog(webhook.guild, {
                        color: 0xffa500,
                        title: '⚠️ نشاط مشبوه',
                        description: `${member.user.tag} ينشئ ويب هوك بكثرة (${result.count}/${result.max}).`,
                        timestamp: new Date()
                    }).catch(() => {});
                }
            }
        }

        // ------------------ اللوق ------------------
        const embed = new EmbedBuilder()
            .setColor(COLORS.WARNING)
            .setTitle('🔗 تم إنشاء ويب هوك')
            .setDescription(`ويب هوك: **${webhook.name}** (${webhook.id})`)
            .setTimestamp();
        await modLog(webhook.guild, embed);
    }
};
