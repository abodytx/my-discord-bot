// =====================================================
// أمر /help - عرض قائمة الأوامر مصنفة
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
            .setDescription('جميع الأوامر متاحة عبر Slash Commands، مصنفة حسب النوع:')
            .setThumbnail(interaction.client.user.displayAvatarURL({ dynamic: true }))
            .addFields(
                {
                    name: '🛡️ الإدارة والحماية',
                    value: '`/ban` `/kick` `/mute` `/unban` `/clear` `/lock` `/unlock` `/slowmode` `/warn` `/warnings` `/unwarn`',
                    inline: false
                },
                {
                    name: '🎵 الموسيقى',
                    value: '`/play` `/skip` `/stop` `/pause` `/resume` `/nowplaying` `/queue` `/volume`',
                    inline: false
                },
                {
                    name: '🎭 الرتب',
                    value: '`/mass-role give` `/mass-role remove` `/setautorole`',
                    inline: false
                },
                {
                    name: '⚙️ الإعدادات',
                    value: '`/setwelcome` `/setgoodbye` `/setlogs` `/setprotection` `/leveltoggle` `/ticket-setup`',
                    inline: false
                },
                {
                    name: '📈 المستويات',
                    value: '`/rank` `/leaderboard`',
                    inline: false
                },
                {
                    name: 'ℹ️ المعلومات والأدوات',
                    value: '`/serverinfo` `/userinfo` `/botinfo` `/ping` `/say` `/embed` `/help`',
                    inline: false
                }
            )
            .setFooter({ text: `ملاحظة: اكتب / ثم اختر الأمر لترى وصفه وطريقة استخدامه` });

        await interaction.reply({ embeds: [embed] });
    }
};
