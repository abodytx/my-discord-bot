// =====================================================
// أمر /coinflip - لعبة عملة معدنية (مضاعفة النقود)
// =====================================================

const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/embeds');
const economy = require('../../modules/economy');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('القِ العملة واربح ضعف مبلغك!')
        .addStringOption(opt => opt.setName('اختيار').setDescription('وجه أو كتابة').setRequired(true)
            .addChoices({ name: 'وجه 🪙', value: 'heads' }, { name: 'كتابة ✍️', value: 'tails' }))
        .addIntegerOption(opt => opt.setName('المبلغ').setDescription('المبلغ الذي تراهن به').setRequired(true).setMinValue(10)),
    cooldown: 3,

    async execute(interaction) {
        const choice = interaction.options.getString('اختيار');
        const bet = interaction.options.getInteger('المبلغ');
        const balance = economy.getBalance(interaction.guild.id, interaction.user.id);

        if (bet > balance) {
            return interaction.reply({
                embeds: [errorEmbed('رصيد غير كافٍ', `لديك **${balance}** 🪙 فقط، ولا يمكنك المراهنة بـ **${bet}** 🪙.`)]
            });
        }

        const result = Math.random() < 0.5 ? 'heads' : 'tails';
        const won = choice === result;

        economy.recordGame(interaction.guild.id, interaction.user.id, won, bet);
        const newBalance = economy.getBalance(interaction.guild.id, interaction.user.id);

        const embed = (won ? successEmbed('🎉 لقد فزت!', `ظهرت العملة: **${result === 'heads' ? 'وجه 🪙' : 'كتابة ✍️'}**\nحصلت على **${bet * 2}** 🪙`) : errorEmbed('😞 خسرت...', `ظهرت العملة: **${result === 'heads' ? 'وجه 🪙' : 'كتابة ✍️'}**\nخسرت **${bet}** 🪙`))
            .addFields({ name: '💰 رصيدك الآن', value: `${newBalance} 🪙`, inline: true });

        return interaction.reply({ embeds: [embed] });
    }
};
