// =====================================================
// أمر /help - عرض قائمة الأوامر مصنفة تلقائياً
// يُولَّد ديناميكياً من client.commands (لا يوجد قوائم جامدة)
// ويدعم استعلام أمر واحد مع الاقتراحات التلقائية (Autocomplete)
// =====================================================

import { SlashCommandBuilder, type ChatInputCommandInteraction, type AutocompleteInteraction } from 'discord.js';
import type { CommandModule, ExtendedClient } from '../../types';
import { baseEmbed } from '../../utils/embeds';

// أسماء الفئات المعروضة بالعربية مع أيقوناتها
const CATEGORY_LABELS: Record<string, string> = {
    config: '⚙️ الإعدادات',
    economy: '💰 الاقتصاد',
    fun: '🎭 الترفيه',
    info: 'ℹ️ المعلومات',
    moderation: '🛡️ الإدارة',
    music: '🎵 الموسيقى',
    roles: '🎭 الرتب',
    ticket: '🎫 التذاكر',
    giveaway: '🎁 السحوبات',
    owner: '👑 مالك البوت'
};

function categoryLabel(category?: string): string {
    return CATEGORY_LABELS[category || ''] || `📂 ${category || 'أخرى'}`;
}

function buildGroupedEmbed(client: ExtendedClient): ReturnType<typeof baseEmbed> {
    const embed = baseEmbed()
        .setTitle('📖 قائمة أوامر البوت')
        .setDescription('جميع الأوامر متاحة عبر Slash Commands، مصنفة حسب النوع:')
        .setThumbnail(client.user?.displayAvatarURL() || null);

    // تجميع الأوامر حسب الفئة مع الحفاظ على الترتيب
    const groups = new Map<string, CommandModule[]>();
    for (const command of client.commands.values()) {
        const key = command.category || 'other';
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(command);
    }

    for (const [key, commands] of groups) {
        const value = commands
            .sort((a, b) => a.data.name.localeCompare(b.data.name))
            .map((c) => `\`/${c.data.name}\``)
            .join(' ');
        embed.addFields({ name: categoryLabel(key), value, inline: false });
    }

    embed.setFooter({ text: 'اكتب / ثم اختر الأمر لترى وصفه وطريقة استخدامه — استخدم /help <أمر> للتفاصيل.' });
    return embed;
}

function buildSingleEmbed(client: ExtendedClient, name: string): ReturnType<typeof baseEmbed> | null {
    const command = client.commands.get(name);
    if (!command) return null;

    const embed = baseEmbed()
        .setTitle(`📘 تفاصيل أمر /${command.data.name}`)
        .setDescription(command.data.description || 'لا يوجد وصف.');

    const fields: { name: string; value: string; inline?: boolean }[] = [];
    fields.push({ name: '📂 الفئة', value: categoryLabel(command.category), inline: true });
    fields.push({
        name: '⏱️ Cooldown',
        value: command.cooldown ? `${command.cooldown} ثانية` : '3 ثوانٍ',
        inline: true
    });
    fields.push({ name: '👑 مالك فقط', value: command.ownerOnly ? 'نعم' : 'لا', inline: true });

    const options = command.data.options;
    if (options.length) {
        const opts = options
            .map((o) => {
                if ('name' in o) {
                    const opt = o as { name?: string; description?: string };
                    return `\`${opt.name}\` — ${opt.description || ''}`;
                }
                return '';
            })
            .filter(Boolean)
            .join('\n');
        if (opts) fields.push({ name: '🧩 الخيارات', value: opts });
    }

    embed.addFields(fields);
    embed.setFooter({ text: 'جرّب كتابة / ثم ابدأ بكتابة اسم الأمر للاقتراحات التلقائية.' });
    return embed;
}

export default {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('عرض قائمة بكل أوامر البوت أو تفاصيل أمر محدد')
        .addStringOption((opt) =>
            opt.setName('command').setDescription('اسم الأمر لعرض تفاصيله').setAutocomplete(true).setRequired(false)
        ),
    category: 'info',

    async autocomplete(interaction: AutocompleteInteraction) {
        const focused = interaction.options.getFocused(true);
        if (focused.name !== 'command') return;
        const query = focused.value.toLowerCase();
        const client = interaction.client as ExtendedClient;
        const matches = [...client.commands.keys()].filter((n) => n.toLowerCase().includes(query)).slice(0, 25);
        await interaction.respond(matches.map((n) => ({ name: `/${n}`, value: n })));
    },

    async execute(interaction: ChatInputCommandInteraction, client: ExtendedClient) {
        const requested = interaction.options.getString('command');
        if (requested) {
            const embed = buildSingleEmbed(client, requested.toLowerCase());
            if (embed) {
                await interaction.reply({ embeds: [embed] });
                return;
            }
            await interaction.reply({
                embeds: [
                    baseEmbed().setTitle('❓ أمر غير موجود').setDescription(`لم أجد أمراً باسم **/${requested}**.`)
                ]
            });
            return;
        }
        await interaction.reply({ embeds: [buildGroupedEmbed(client)] });
    }
} satisfies CommandModule;
