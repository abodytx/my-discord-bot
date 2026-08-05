// =====================================================
// أمر /serverinfo - عرض معلومات تفصيلية عن السيرفر
// =====================================================

import { SlashCommandBuilder, ChannelType } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { CommandModule, ExtendedClient } from '../../types';
import { baseEmbed } from '../../utils/embeds';

export default {
    data: new SlashCommandBuilder().setName('serverinfo').setDescription('عرض معلومات عن السيرفر الحالي'),
    category: 'info',

    async execute(interaction: ChatInputCommandInteraction, _client: ExtendedClient) {
        if (!interaction.guild) return;
        const guild = interaction.guild;
        await guild.members.fetch(); // للتأكد من دقة عدد الأعضاء المتصلين

        const owner = await guild.fetchOwner();
        const textChannels = guild.channels.cache.filter((c) => c.type === ChannelType.GuildText).size;
        const voiceChannels = guild.channels.cache.filter((c) => c.type === ChannelType.GuildVoice).size;
        const totalMembers = guild.memberCount;
        const bots = guild.members.cache.filter((m) => m.user.bot).size;
        const humans = totalMembers - bots;

        const embed = baseEmbed()
            .setTitle(`📊 معلومات سيرفر ${guild.name}`)
            .setThumbnail(guild.iconURL({ size: 256 }))
            .addFields(
                { name: '👑 المالك', value: `${owner.user.tag}`, inline: true },
                { name: '🆔 المعرف', value: `${guild.id}`, inline: true },
                { name: '📅 تاريخ الإنشاء', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true },
                { name: '👥 إجمالي الأعضاء', value: `${totalMembers}`, inline: true },
                { name: '🧑 بشر', value: `${humans}`, inline: true },
                { name: '🤖 بوتات', value: `${bots}`, inline: true },
                { name: '💬 القنوات النصية', value: `${textChannels}`, inline: true },
                { name: '🔊 القنوات الصوتية', value: `${voiceChannels}`, inline: true },
                { name: '🎭 عدد الرتب', value: `${guild.roles.cache.size}`, inline: true },
                { name: '😀 عدد الإيموجيات', value: `${guild.emojis.cache.size}`, inline: true },
                {
                    name: '🚀 مستوى البوست',
                    value: `المستوى ${guild.premiumTier} (${guild.premiumSubscriptionCount || 0} بوست)`,
                    inline: true
                }
            )
            .setFooter({ text: `طلب بواسطة ${interaction.user.tag}` });

        await interaction.reply({ embeds: [embed] });
    }
} satisfies CommandModule;
