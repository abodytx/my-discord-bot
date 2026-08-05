// =====================================================
// أمر /botinfo - معلومات عن البوت
// =====================================================

import { SlashCommandBuilder, version } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { CommandModule, ExtendedClient } from '../../types';
import { baseEmbed } from '../../utils/embeds';

export default {
    data: new SlashCommandBuilder().setName('botinfo').setDescription('معلومات عن البوت نفسه'),
    category: 'info',

    async execute(interaction: ChatInputCommandInteraction, _client: ExtendedClient) {
        const client = interaction.client;
        const uptime = client.uptime;
        const days = Math.floor(uptime / 86400000);
        const hours = Math.floor((uptime % 86400000) / 3600000);
        const minutes = Math.floor((uptime % 3600000) / 60000);

        const users = client.guilds.cache.reduce((a, g) => a + (g.memberCount || 0), 0);
        const channels = client.channels.cache.size;
        const ram = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);

        const embed = baseEmbed()
            .setTitle(`🤖 معلومات ${client.user.username}`)
            .setThumbnail(client.user.displayAvatarURL({ size: 256 }))
            .addFields(
                { name: '🆔 المعرف', value: client.user.id, inline: true },
                { name: '👥 عدد السيرفرات', value: `${client.guilds.cache.size}`, inline: true },
                { name: '🧑 الأعضاء', value: `${users}`, inline: true },
                { name: '💬 القنوات', value: `${channels}`, inline: true },
                { name: '⚡ الاستجابة', value: `${Math.round(client.ws.ping)} ms`, inline: true },
                { name: '🧠 الرام', value: `${ram} MB`, inline: true },
                { name: '🕐 مدة التشغيل', value: `${days} يوم ${hours} ساعة ${minutes} دقيقة`, inline: true },
                { name: '📚 المكتبة', value: `discord.js v${version}`, inline: true },
                { name: '🟢 الحالة', value: `يعمل بشكل ممتاز!`, inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
} satisfies CommandModule;
