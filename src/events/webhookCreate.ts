// =====================================================
// حدث "webhookCreate": لوق + حماية Anti-Nuke من سبام الويب هوك
// =====================================================

import { EmbedBuilder, AuditLogEvent, type Webhook } from 'discord.js';
import type { ExtendedClient } from '../types';
import { COLORS } from '../utils/embeds';
import { modLog } from '../utils/logger';
import { emit } from '../modules/liveHub';

export default {
    name: 'webhookCreate',
    async execute(webhook: Webhook, client: ExtendedClient) {
        const guild = client.guilds.cache.get(webhook.guildId) ?? null;
        if (!guild) return;

        emit('log', { level: 'warn', source: 'webhooks', message: `تم إنشاء ويب هوك: ${webhook.name}` });

        // ------------------ حماية Webhook Spam ------------------
        if (await client.antiNuke.isEnabled(guild.id)) {
            const executorId = await client.antiNuke.findExecutor(guild, AuditLogEvent.WebhookCreate, webhook.id);
            const member = executorId ? await guild.members.fetch(executorId).catch(() => null) : null;
            if (member && !(await client.antiNuke.isWhitelisted(guild, member))) {
                const result = await client.antiNuke.record(guild.id, executorId);
                if (result.tripped) {
                    await client.antiNuke.punish(guild, member, 'سبام ويب هوك');
                    await webhook.delete('Anti-Nuke: Webhook Spam').catch(() => {});
                    return;
                }
                if (result.count === result.max) {
                    await modLog(guild, {
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
        await modLog(guild, embed);
    }
};
