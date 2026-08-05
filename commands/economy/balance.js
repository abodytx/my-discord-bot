// =====================================================
// أمر /balance - رصيد المستخدم في نظام الاقتصاد
// =====================================================

const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed, errorEmbed } = require('../../utils/embeds');
const economy = require('../../modules/economy');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('عرض رصيدك أو رصيد عضو آخر')
        .addUserOption(opt => opt.setName('العضو').setDescription('العضو الذي تريد رصيده (اختياري)')),
    cooldown: 3,

    async execute(interaction) {
        const target = interaction.options.getUser('العضو') || interaction.user;
        const balance = economy.getBalance(interaction.guild.id, target.id);

        const embed = baseEmbed()
            .setTitle('🪙 رصيد النقود')
            .setDescription(`${target === interaction.user ? 'رصيدك الحالي' : `رصيد **${target.username}**`} هو: **${balance}** 🪙`)
            .setThumbnail(target.displayAvatarURL({ size: 128 }))
            .setFooter({ text: 'اربح المزيد عبر /daily أو /coinflip' });

        return interaction.reply({ embeds: [embed] });
    }
};
