// =====================================================
// أمر /help - عرض قائمة بكل أوامر البوت مصنفة
// =====================================================

const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('عرض قائمة بكل أوامر البوت'),

    async execute(interaction) {
        const embed = baseEmbed()
            .setTitle('📖 قائمة أوامر البوت')
            .setDescription('فيما يلي كل الأوامر المتاحة، مصنفة حسب النوع:')
            .addFields(
                {
                    name: '🛡️ الإدارة والحماية',
                    value: '`/ban` `/kick` `/mute` `/clear`'
                },
                {
                    name: '🎭 الرتب',
                    value: '`/mass-role give` `/mass-role remove` `/setautorole`'
                },
                {
                    name: '⚙️ الإعدادات',
                    value: '`/setwelcome` `/setprotection` `/ticket-setup`'
                },
                {
                    name: 'ℹ️ المعلومات',
                    value: '`/serverinfo` `/userinfo` `/help`'
                }
            )
            .setFooter({ text: 'للمزيد من التفاصيل عن أمر معين، اكتبه واقرأ الوصف الظاهر في ديسكورد' });

        await interaction.reply({ embeds: [embed] });
    }
};
