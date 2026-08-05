// =====================================================
// حدث "guildMemberAdd": ترحيب + رتبة تلقائية + لوق انضمام
// =====================================================

import { EmbedBuilder, type GuildMember, type GuildTextBasedChannel } from 'discord.js';
import type { ExtendedClient } from '../types';
import { getGuildSettings } from '../utils/settings';
import { COLORS } from '../utils/embeds';
import { memberLog } from '../utils/logger';
import { generateWelcomeCard, hasCustomBackground } from '../modules/welcomeCards';
import { emit } from '../modules/liveHub';

export default {
    name: 'guildMemberAdd',
    async execute(member: GuildMember, _client: ExtendedClient) {
        const settings = (await getGuildSettings(member.guild.id)) || {};

        emit('log', { level: 'success', source: 'members', message: `انضم عضو جديد: ${member.user.tag}` });

        // ------------------ 1) رسالة الترحيب + بطاقة Canvas ------------------
        let channel: GuildTextBasedChannel | null = null;
        if (settings.welcomeChannelId) {
            try {
                channel = (await member.guild.channels.fetch(
                    settings.welcomeChannelId
                )) as GuildTextBasedChannel | null;
            } catch (e) {
                console.error('تعذر الوصول لقناة الترحيب:', e);
            }
        }
        if (!channel) {
            channel =
                (member.guild.channels.cache.find(
                    (ch) => ch.isTextBased() && ch.permissionsFor(member.guild.members.me!).has('SendMessages')
                ) as GuildTextBasedChannel | undefined) ?? null;
        }

        if (channel) {
            try {
                const rawMessage = settings.welcomeMessage || 'أهلاً بك {user} في سيرفر {server}! 🎉';
                const description = rawMessage
                    .replace(/{user}/g, `<@${member.id}>`)
                    .replace(/{server}/g, member.guild.name)
                    .replace(/{memberCount}/g, String(member.guild.memberCount));

                // بطاقة ترحيب Canvas (تُرسل كصورة ملحقة)
                let attachment: { attachment: Buffer; name: string } | null = null;
                try {
                    const buffer = await generateWelcomeCard(member, {
                        guildId: member.guild.id,
                        username: member.displayName || member.user.username,
                        memberCount: member.guild.memberCount,
                        accent: hasCustomBackground(member.guild.id) ? '#ffffff' : '#00f0ff'
                    });
                    attachment = { attachment: buffer, name: 'welcome.png' };
                } catch (err) {
                    console.error('خطأ في توليد بطاقة الترحيب:', err);
                }

                const welcomeEmbed = new EmbedBuilder()
                    .setColor(COLORS.SUCCESS)
                    .setTitle(`🎉 عضو جديد في ${member.guild.name}!`)
                    .setDescription(description)
                    .addFields(
                        { name: '👤 العضو', value: `${member.user.tag}`, inline: true },
                        { name: '🔢 عدد الأعضاء', value: `${member.guild.memberCount}`, inline: true },
                        {
                            name: '📅 تاريخ الإنشاء',
                            value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:D>`,
                            inline: true
                        }
                    )
                    .setFooter({ text: `المعرف: ${member.id}` })
                    .setTimestamp();

                if (settings.rulesChannelId) {
                    welcomeEmbed.addFields({
                        name: '📜 القوانين',
                        value: `يرجى الاطلاع على القوانين في <#${settings.rulesChannelId}>`
                    });
                }

                await channel.send({
                    content: `${member} أهلاً بك! 👋`,
                    embeds: [welcomeEmbed],
                    files: attachment ? [attachment] : []
                });
            } catch (err) {
                console.error('خطأ في إرسال رسالة الترحيب:', err);
            }
        }

        // ------------------ 2) الرتبة التلقائية ------------------
        if (settings.autoRoleId) {
            try {
                const role = await member.guild.roles.fetch(settings.autoRoleId);
                if (role) await member.roles.add(role);
            } catch (err) {
                console.error('خطأ في إعطاء الرتبة التلقائية (تأكد أن رتبة البوت أعلى من الرتبة المستهدفة):', err);
            }
        }

        // ------------------ 3) لوق الانضمام ------------------
        const joinEmbed = new EmbedBuilder()
            .setColor(COLORS.SUCCESS)
            .setAuthor({ name: `انضم عضو جديد: ${member.user.tag}`, iconURL: member.user.displayAvatarURL() })
            .setDescription(`${member.user} (${member.user.id})`)
            .addFields({ name: '👥 عدد الأعضاء الآن', value: `${member.guild.memberCount}`, inline: true })
            .setTimestamp();
        await memberLog(member.guild, joinEmbed);
    }
};
