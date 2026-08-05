// =====================================================
// حدث "guildMemberRemove": رسالة وداع + لوق مغادرة
// =====================================================

import { EmbedBuilder, AuditLogEvent, type GuildMember, type GuildTextBasedChannel } from 'discord.js';
import type { ExtendedClient } from '../types';
import { getGuildSettings } from '../utils/settings';
import { COLORS } from '../utils/embeds';
import { memberLog } from '../utils/logger';
import { emit } from '../modules/liveHub';

export default {
    name: 'guildMemberRemove',
    async execute(member: GuildMember, client: ExtendedClient) {
        const settings = (await getGuildSettings(member.guild.id)) || {};

        emit('log', { level: 'info', source: 'members', message: `غادر عضو: ${member.user?.tag || member.id}` });

        // ------------------ 0) حماية Mass Kick ------------------
        if (await client.antiNuke.isEnabled(member.guild.id)) {
            try {
                const executorId = await client.antiNuke.findExecutor(
                    member.guild,
                    AuditLogEvent.MemberKick,
                    member.id
                );
                if (executorId) {
                    const executor = await member.guild.members.fetch(executorId).catch(() => null);
                    if (executor && !(await client.antiNuke.isWhitelisted(member.guild, executor))) {
                        const result = await client.antiNuke.record(member.guild.id, executorId);
                        if (result.tripped) {
                            await client.antiNuke.punish(member.guild, executor, 'طرد جماعي (Mass Kick)');
                        }
                    }
                }
            } catch {
                /* audit log may be unavailable */
            }
        }

        // ------------------ 1) رسالة الوداع ------------------
        if (settings.goodbyeChannelId) {
            try {
                const goodbyeChannel = (await member.guild.channels.fetch(
                    settings.goodbyeChannelId
                )) as GuildTextBasedChannel | null;
                if (goodbyeChannel) {
                    const rawMessage = settings.goodbyeMessage || 'وداعاً {user}، سنشتاق إليك في **{server}**. 👋';
                    const description = rawMessage
                        .replace(/{user}/g, `<@${member.id}>`)
                        .replace(/{server}/g, member.guild.name)
                        .replace(/{memberCount}/g, String(member.guild.memberCount));

                    const goodbyeEmbed = new EmbedBuilder()
                        .setColor(COLORS.ERROR)
                        .setTitle(`👋 وداعاً ${member.user.tag}!`)
                        .setDescription(description)
                        .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
                        .setTimestamp();

                    await goodbyeChannel.send({ embeds: [goodbyeEmbed] });
                }
            } catch (err) {
                console.error('خطأ في إرسال رسالة الوداع:', err);
            }
        }

        // ------------------ 2) لوق المغادرة ------------------
        const leaveEmbed = new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setAuthor({ name: `غادر عضو: ${member.user.tag}`, iconURL: member.user.displayAvatarURL() })
            .setDescription(`${member.user} (${member.user.id})`)
            .addFields(
                { name: '👥 عدد الأعضاء الآن', value: `${member.guild.memberCount}`, inline: true },
                {
                    name: '📅 تاريخ الانضمام',
                    value: member.joinedAt ? `<t:${Math.floor((member.joinedTimestamp ?? 0) / 1000)}:D>` : 'غير معروف',
                    inline: true
                }
            )
            .setTimestamp();
        await memberLog(member.guild, leaveEmbed);
    }
};
