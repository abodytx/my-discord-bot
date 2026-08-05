// =====================================================
// أمر /daily - مكافأة يومية في نظام الاقتصاد
// =====================================================

const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const economy = require('../../modules/economy');

const DAILY_AMOUNT = 200;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('احصل على مكافأتك اليومية (مرة كل 24 ساعة)'),
    cooldown: 5,

    async execute(interaction) {
        const result = economy.claimDaily(interaction.guild.id, interaction.user.id, DAILY_AMOUNT);
        if (result.ok) {
            return interaction.reply({
                embeds: [successEmbed('🎁 مكافأة يومية', `استلمت **${result.amount}** 🪙\nرصيدك الآن: **${result.balance}** 🪙`)]
            });
        }
        const hours = Math.floor(result.remaining / 3600000);
        const mins = Math.ceil((result.remaining % 3600000) / 60000);
        return interaction.reply({
            embeds: [errorEmbed('⏳ انتظر قليلاً', `يمكنك استلام المكافأة مجدداً بعد **${hours} ساعة و ${mins} دقيقة**.`)]
        });
    }
};
