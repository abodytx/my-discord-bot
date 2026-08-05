// =====================================================
// أمر /slots - ماكينة الحظ المصغرة
// =====================================================

const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const economy = require('../../modules/economy');

const EMOJIS = ['🍒', '🍋', '🍉', '💎', '7️⃣', '⭐'];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slots')
        .setDescription('جرّب حظك في ماكينة الحظ')
        .addIntegerOption(opt => opt.setName('المبلغ').setDescription('المبلغ الذي تراهن به').setRequired(true).setMinValue(10)),
    cooldown: 3,

    async execute(interaction) {
        const bet = interaction.options.getInteger('المبلغ');
        const balance = economy.getBalance(interaction.guild.id, interaction.user.id);

        if (bet > balance) {
            return interaction.reply({
                embeds: [errorEmbed('رصيد غير كافٍ', `لديك **${balance}** 🪙 فقط.`)]
            });
        }

        const r1 = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
        const r2 = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
        const r3 = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];

        let multiplier = 0;
        if (r1 === r2 && r2 === r3) multiplier = r1 === '7️⃣' ? 10 : 6;
        else if (r1 === r2 || r2 === r3 || r1 === r3) multiplier = 2;

        const won = multiplier > 0;
        const winnings = won ? bet * multiplier : 0;

        economy.recordGame(interaction.guild.id, interaction.user.id, won, bet);
        const newBalance = economy.getBalance(interaction.guild.id, interaction.user.id);

        const desc = `**[ ${r1} | ${r2} | ${r3} ]**\n\n${won ? `🎉 **فزت ${winnings}** 🪙 (×${multiplier})` : '😞 لم تفز هذه المرة'}\n\n💰 رصيدك الآن: **${newBalance}** 🪙`;

        const embed = (won ? successEmbed('🎰 ماكينة الحظ', desc) : errorEmbed('🎰 ماكينة الحظ', desc));
        return interaction.reply({ embeds: [embed] });
    }
};
