// =====================================================
// لوق حذف القنوات
// =====================================================

const { EmbedBuilder, ChannelType } = require('discord.js');
const { COLORS } = require('../utils/embeds');
const { modLog } = require('../utils/logger');

module.exports = {
    name: 'channelDelete',
    async execute(channel) {
        if (!channel.guild) return;
        const typeName = channel.type === ChannelType.GuildVoice ? 'صوتية' : 'نصية';
        const embed = new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setTitle('🗑️ تم حذف قناة')
            .setDescription(`تم حذف قناة **${typeName}**: ${channel.name}`)
            .setTimestamp();
        await modLog(channel.guild, embed);
    }
};
