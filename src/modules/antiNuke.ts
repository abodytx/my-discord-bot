// =====================================================
// Anti-Nuke Engine - الحماية الذكية من تدمير السيرفر
// يراقب نافذة زمنية (Window) للأحداث الخطرة:
//   - حذف القنوات/الرتب الجماعي
//   - الحظر/الطرد الجماعي (Mass Ban / Kick)
//   - إنشاء قنوات/ويب هوك (Raid / Webhook Spam)
// ويقوم بـ: عقاب المخالف + استعادة المحذوف + إشعار المالك
// =====================================================

import {
    AuditLogEvent,
    PermissionFlagsBits,
    ChannelType,
    type Guild,
    type GuildMember,
    type GuildChannel,
    type Role,
    type GuildAuditLogsEntry
} from 'discord.js';
import { getGuildSettings } from '../utils/settings';
import { modLog } from '../utils/logger';
import { emit } from './liveHub';
import type { ExtendedClient } from '../types';

const WINDOW_MS = 6000;

interface WindowState {
    start: number;
    actions: { executorId: string; at: number }[];
}

interface RecordResult {
    count: number;
    max: number;
    tripped: boolean;
}

export class AntiNukeEngine {
    client: ExtendedClient;
    windows = new Map<string, WindowState>();
    punished = new Map<string, number>();

    constructor(client: ExtendedClient) {
        this.client = client;
    }

    async isEnabled(guildId: string): Promise<boolean> {
        const settings = await getGuildSettings(guildId);
        return settings.antiNuke === true;
    }

    /** هل المستخدم معفي من الحماية؟ */
    async isWhitelisted(guild: Guild, member: GuildMember | null | undefined): Promise<boolean> {
        if (!member) return false;
        const settings = await getGuildSettings(guild.id);
        if (settings.whitelistedUsers.includes(member.id)) return true;
        if (member.roles.cache.some((r) => settings.whitelistedRoles.includes(r.id))) return true;
        if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
        if (member.id === guild.ownerId) return true;
        return false;
    }

    /** تسجيل حدث ضمن النافذة الزمنية وإرجاع هل تجاوز الحد */
    async record(guildId: string, executorId: string | null | undefined): Promise<RecordResult> {
        if (!executorId) return { count: 1, max: 0, tripped: false };
        const settings = await getGuildSettings(guildId);
        const max = Math.max(1, settings.maxNukeActions || 3);
        const now = Date.now();

        let win = this.windows.get(guildId);
        if (!win || now - win.start > WINDOW_MS) {
            win = { start: now, actions: [] };
            this.windows.set(guildId, win);
        }
        win.actions = win.actions.filter((a) => now - a.at < WINDOW_MS);
        win.actions.push({ executorId, at: now });

        const count = win.actions.filter((a) => a.executorId === executorId).length;
        return { count, max, tripped: count > max };
    }

    /** جلب منفذ العملية عبر Audit Logs */
    async findExecutor(guild: Guild, eventType: AuditLogEvent, targetId: string): Promise<string | null> {
        try {
            const audit = await guild.fetchAuditLogs({ type: eventType, limit: 8 });
            const entry: GuildAuditLogsEntry | undefined = audit.entries.find((e) => e.targetId === targetId);
            return entry?.executorId || null;
        } catch {
            return null;
        }
    }

    /** إبلاغ وملاحقة المخالف */
    async punish(guild: Guild, member: GuildMember, actionType: string): Promise<boolean> {
        const settings = await getGuildSettings(guild.id);
        const now = Date.now();
        if ((this.punished.get(member.id) ?? 0) > now - 60_000) return false;
        this.punished.set(member.id, now);

        const owner = guild.members.resolve(guild.ownerId);

        try {
            // الأعضاء المخولين + صاحب السيرفر (الحظر صارم للحماية)
            await member.ban({ reason: `[Anti-Nuke] تنفيذ عشوائي للحذف (${actionType})` }).catch(async () => {
                await member.timeout(60 * 60 * 1000, `[Anti-Nuke] تنفيذ عشوائي (${actionType})`).catch(() => {});
            });
        } catch {
            /* التعامل مع الفشل بهدوء */
        }

        const desc = `🚨 **Anti-Nuke**: تم رصد ${actionType} مريب.\n👤 المخالف: ${member.user.tag}\n⛔ تم حظره تلقائياً.`;

        try {
            await modLog(guild, {
                color: 0xff2e2e,
                title: '🛡️ تم تفعيل الحماية التلقائية',
                description: desc,
                footer: { text: `الحالة: ${settings.antiNuke ? 'مفعلة' : 'مؤقتة'}` },
                timestamp: new Date()
            });
        } catch {
            /* ignore */
        }

        try {
            await owner?.send({
                content: `🚨 **تحذير!** تم تفعيل Anti-Nuke في سيرفر **${guild.name}**.\n${desc}`
            });
        } catch {
            /* ignore */
        }

        emit('alert', { guild: guild.name, action: actionType, user: member.user.tag });
        return true;
    }

    /** إعادة إنشاء قناة محذوفة */
    async restoreChannel(channel: GuildChannel): Promise<boolean> {
        try {
            const overwrites =
                channel.permissionOverwrites?.cache?.map((o) => ({
                    id: o.id,
                    allow: o.allow?.bitfield ?? o.allow,
                    deny: o.deny?.bitfield ?? o.deny,
                    type: o.type
                })) || [];

            const textChannel = channel as import('discord.js').TextChannel;
            const base = {
                name: channel.name,
                parent: channel.parentId,
                topic: 'topic' in channel ? textChannel.topic || undefined : undefined,
                position: channel.rawPosition,
                nsfw: 'nsfw' in channel ? textChannel.nsfw || undefined : undefined,
                permissionOverwrites: overwrites
            };

            if (channel.type === ChannelType.GuildVoice) {
                await channel.guild.channels.create({
                    ...base,
                    type: ChannelType.GuildVoice,
                    bitrate: (channel as import('discord.js').VoiceChannel).bitrate,
                    userLimit: (channel as import('discord.js').VoiceChannel).userLimit
                });
            } else if (channel.type === ChannelType.GuildText) {
                await channel.guild.channels.create({
                    ...base,
                    type: ChannelType.GuildText,
                    rateLimitPerUser: (channel as import('discord.js').TextChannel).rateLimitPerUser ?? undefined,
                    defaultThreadRateLimitPerUser:
                        (channel as import('discord.js').TextChannel).defaultThreadRateLimitPerUser ?? undefined
                });
            } else {
                await channel.guild.channels.create({ ...base, type: channel.type });
            }
            return true;
        } catch {
            return false;
        }
    }

    /** إعادة إنشاء رتبة محذوفة */
    async restoreRole(role: Role): Promise<boolean> {
        try {
            await role.guild.roles.create({
                name: role.name,
                color: role.color,
                hoist: role.hoist,
                mentionable: role.mentionable,
                position: role.position,
                permissions: role.permissions.bitfield
            });
            return true;
        } catch {
            return false;
        }
    }

    /** معالجة موحّدة لحدث حذف/إنشاء جماعي */
    async handle(
        guild: Guild,
        member: GuildMember | null | undefined,
        actionType: string,
        restoreFn?: () => Promise<boolean>
    ): Promise<boolean> {
        if (!(await this.isEnabled(guild.id))) return false;
        if (!member || member.user.bot) return false;
        if (await this.isWhitelisted(guild, member)) return false;

        const { count, max, tripped } = await this.record(guild.id, member.id);
        if (tripped) {
            const punished = await this.punish(guild, member, actionType);
            if (restoreFn) {
                const ok = await restoreFn();
                if (ok)
                    emit('log', {
                        level: 'success',
                        source: 'anti-nuke',
                        message: `تمت استعادة عنصر محذوف في ${guild.name}`
                    });
            }
            return punished;
        }

        // تحذير عند الاقتراب من الحد
        if (count === max) {
            try {
                await modLog(guild, {
                    color: 0xffa500,
                    title: '⚠️ نشاط مشبوه',
                    description: `${member.user.tag} ينفذ **${actionType}** بكثرة (${count}/${max}). سيتم حظره عند التجاوز.`,
                    timestamp: new Date()
                });
            } catch {
                /* ignore */
            }
        }
        return false;
    }
}
