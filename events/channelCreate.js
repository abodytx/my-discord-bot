// =====================================================
// لوق إنشاء/حذف القنوات والرتب
// =====================================================

const { EmbedBuilder, ChannelType } = require('discord.js');
const { COLORS } = require('../utils/embeds');
const { modLog } = require('../utils/logger');

module.exports = {
    name: 'channelCreate',
    async execute(channel) {
        if (!channel.guild) return;
        const typeName = channel.type === ChannelType.GuildVoice ? 'صوتية' : 'نصية';
        const embed = new EmbedBuilder()
            .setColor(COLORS.SUCCESS)
            .setTitle('📁 تم إنشاء قناة جديدة')
            .setDescription(`قناة **${typeName}**: ${channel} (${channel.name})`)
            .setTimestamp();
        await modLog(channel.guild, embed);
    }
};
