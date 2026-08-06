// =====================================================
// نظام السحوبات (Giveaways) — متكامل مع الأزرار
// - بدء سحب بجائزة/عدد فائزين/مدة
// - زر مشاركة (Join) مع عداد مشاركين
// - إنهاء تلقائي + اختيار فائزين + إعادة سحب (Reroll)
// - حفظ دائم في data/giveaways.json واستعادة عند التشغيل
// =====================================================

import * as fs from 'fs';
import * as path from 'path';
import {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    type Client,
    type ButtonInteraction
} from 'discord.js';
import type { ExtendedClient } from '../types';
import { logger } from '../utils/logger';
import { COLORS } from '../utils/embeds';
import { getLocale, t } from '../i18n';

export interface Giveaway {
    messageId: string;
    channelId: string;
    guildId: string;
    prize: string;
    winners: number;
    endsAt: number;
    hostId: string;
    entrants: string[];
    ended: boolean;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const FILE = path.join(DATA_DIR, 'giveaways.json');

const giveaways = new Map<string, Giveaway>();

// ---------------- تحميل وحفظ ----------------
function loadGiveaways(): void {
    try {
        if (!fs.existsSync(FILE)) return;
        const raw = JSON.parse(fs.readFileSync(FILE, 'utf-8')) as Giveaway[];
        for (const g of raw) {
            if (g && g.messageId && !g.ended) giveaways.set(g.messageId, g);
        }
    } catch (err) {
        logger.error('فشل تحميل ملف السحوبات:', err);
    }
}

function saveGiveaways(): void {
    try {
        if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
        fs.writeFileSync(FILE, JSON.stringify([...giveaways.values()], null, 2), 'utf-8');
    } catch (err) {
        logger.error('فشل حفظ ملف السحوبات:', err);
    }
}

function getGiveaway(messageId: string): Giveaway | undefined {
    return giveaways.get(messageId);
}

function deleteGiveaway(messageId: string): void {
    giveaways.delete(messageId);
    saveGiveaways();
}

// ---------------- بناء الـ Embed ----------------
function giveawayEmbed(g: Giveaway): EmbedBuilder {
    return new EmbedBuilder()
        .setColor(COLORS.WARNING)
        .setTitle('🎁 سحب جديد!')
        .setDescription(`**الجائزة:** ${g.prize}`)
        .addFields(
            { name: '🎯 عدد الفائزين', value: `${g.winners}`, inline: true },
            { name: '👥 المشاركون', value: `${g.entrants.length}`, inline: true },
            { name: '⏳ ينتهي عند', value: `<t:${Math.floor(g.endsAt / 1000)}:R>`, inline: false },
            { name: '🙋 المُنشئ', value: `<@${g.hostId}>`, inline: true }
        )
        .setFooter({ text: 'اضغط زر "انضمام" أسفل الرسالة للمشاركة' })
        .setTimestamp();
}

export function giveawayRow(g: Giveaway): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(`giveaway_join_${g.messageId}`)
            .setLabel('🎉 انضمام')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`giveaway_leave_${g.messageId}`)
            .setLabel('انسحاب')
            .setStyle(ButtonStyle.Secondary)
    );
}

// ---------------- بدء سحب ----------------
export async function startGiveaway(
    client: ExtendedClient,
    guildId: string,
    channelId: string,
    options: { prize: string; durationMin: number; winners: number; hostId: string }
): Promise<Giveaway | null> {
    const guild = client.guilds.cache.get(guildId);
    const channel = guild?.channels.cache.get(channelId);
    if (!channel || !('send' in channel)) return null;

    const giveaway: Giveaway = {
        messageId: '',
        channelId,
        guildId,
        prize: options.prize,
        winners: Math.max(1, options.winners),
        endsAt: Date.now() + options.durationMin * 60_000,
        hostId: options.hostId,
        entrants: [],
        ended: false
    };

    const sent = await (channel as { send: (p: unknown) => Promise<{ id: string }> }).send({
        embeds: [giveawayEmbed(giveaway)],
        components: [giveawayRow(giveaway)]
    });
    giveaway.messageId = sent.id;
    giveaways.set(giveaway.messageId, giveaway);
    saveGiveaways();

    scheduleEnd(client, giveaway);
    return giveaway;
}

// ---------------- جدولة الإنتهاء ----------------
function scheduleEnd(client: ExtendedClient, g: Giveaway): void {
    const delay = Math.max(0, g.endsAt - Date.now());
    setTimeout(() => {
        void endGiveaway(client, g.messageId, false).catch((err) => logger.error('خطأ في إنهاء سحب:', err));
    }, delay + 1000);
}

// ---------------- انضمام / انسحاب ----------------
export function joinGiveaway(messageId: string, userId: string): { ok: boolean; count: number } {
    const g = giveaways.get(messageId);
    if (!g || g.ended) return { ok: false, count: 0 };
    if (!g.entrants.includes(userId)) g.entrants.push(userId);
    saveGiveaways();
    return { ok: true, count: g.entrants.length };
}

export function leaveGiveaway(messageId: string, userId: string): { ok: boolean; count: number } {
    const g = giveaways.get(messageId);
    if (!g || g.ended) return { ok: false, count: 0 };
    g.entrants = g.entrants.filter((id) => id !== userId);
    saveGiveaways();
    return { ok: true, count: g.entrants.length };
}

// ---------------- إنهاء وإعادة السحب ----------------
export async function endGiveaway(
    client: ExtendedClient,
    messageId: string,
    manual: boolean
): Promise<Giveaway | null> {
    const g = giveaways.get(messageId);
    if (!g) return null;
    if (g.ended) return g;

    g.ended = true;
    const channel = client.guilds.cache.get(g.guildId)?.channels.cache.get(g.channelId);
    if (channel && 'send' in channel) {
        const winners = pickWinners(g);
        const desc = winners.length
            ? `مبروك للفائزين 🎉\n\n${winners.map((w) => `<@${w}>`).join('\n')}\n\n**الجائزة:** ${g.prize}`
            : `لا يوجد فائزون — لم يشارك أحد في هذا السحب.\n**الجائزة:** ${g.prize}`;
        const endedEmbed = new EmbedBuilder()
            .setColor(COLORS.SUCCESS)
            .setTitle(manual ? '🎁 أُنهي السحب يدوياً' : '🎁 انتهى السحب!')
            .setDescription(desc)
            .setFooter({ text: 'استخدم /giveaway reroll لإعادة السحب' })
            .setTimestamp();
        try {
            await (channel as { send: (p: unknown) => Promise<unknown> }).send({ embeds: [endedEmbed] });
        } catch (err) {
            logger.error('خطأ في إرسال رسالة النتيجة:', err);
        }
    }
    deleteGiveaway(messageId);
    return g;
}

export async function rerollGiveaway(
    client: ExtendedClient,
    guildId: string,
    channelId: string,
    options: { prize: string; hostId: string; winners: number }
): Promise<Giveaway | null> {
    // إعادة سحب بجائزة جديدة (تجاهل المشاركين السابقين)
    return startGiveaway(client, guildId, channelId, {
        prize: options.prize,
        durationMin: 1440,
        winners: options.winners,
        hostId: options.hostId
    });
}

function pickWinners(g: Giveaway): string[] {
    const pool = [...new Set(g.entrants.filter((id) => id !== g.hostId))];
    const result: string[] = [];
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(g.winners, shuffled.length); i++) {
        result.push(shuffled[i]);
    }
    return result;
}

// ---------------- المعالجات المرتبطة بالتفاعلات ----------------
export async function handleGiveawayButton(interaction: ButtonInteraction, client: ExtendedClient): Promise<boolean> {
    const parts = interaction.customId.split('_');
    if (parts.length < 3 || !['giveaway_join', 'giveaway_leave'].includes(`${parts[0]}_${parts[1]}`)) return false;

    const messageId = parts.slice(2).join('_');
    const g = getGiveaway(messageId);
    const locale = await getLocale(interaction.guildId || '');
    if (!g) {
        await interaction.reply({
            embeds: [new EmbedBuilder().setColor(COLORS.ERROR).setDescription(t(locale, 'giveawayNotFound'))],
            ephemeral: true
        });
        return true;
    }

    const isJoin = interaction.customId.startsWith('giveaway_join');
    const userId = interaction.user.id;
    const result = isJoin ? joinGiveaway(messageId, userId) : leaveGiveaway(messageId, userId);

    // تحديث عداد المشاركين على رسالة السحب الأصلية
    if (result.ok && interaction.guildId) {
        const channel = client.guilds.cache.get(interaction.guildId)?.channels.cache.get(g.channelId);
        if (channel && 'messages' in channel) {
            const msg = await (
                channel as { messages: { fetch: (id: string) => Promise<{ edit: (p: unknown) => Promise<unknown> }> } }
            ).messages
                .fetch(messageId)
                .catch(() => null);
            if (msg) {
                await msg.edit({ embeds: [giveawayEmbed(g)], components: [giveawayRow(g)] }).catch(() => {});
            }
        }
    }

    await interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(COLORS.INFO)
                .setDescription(
                    result.ok
                        ? `${t(locale, isJoin ? 'giveawayJoined' : 'giveawayLeft')} — ${t(locale, 'giveawayCount', { count: result.count })}`
                        : t(locale, 'giveawayCannotJoin')
                )
        ],
        ephemeral: true
    });
    return true;
}

// ---------------- إعادة جدولة السحوبات النشطة عند التشغيل ----------------
export function restoreGiveaways(client: Client): void {
    loadGiveaways();
    for (const g of giveaways.values()) {
        if (!g.ended) scheduleEnd(client as ExtendedClient, g);
    }
    if (giveaways.size) logger.info(`🎁 تمت استعادة ${giveaways.size} سحب نشط.`);
}

// تصدير إضافي للاستخدام في الأوامر
export function listGiveaways(guildId: string): Giveaway[] {
    return [...giveaways.values()].filter((g) => g.guildId === guildId && !g.ended);
}
