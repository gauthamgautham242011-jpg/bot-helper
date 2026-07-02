const { AuditLogEvent, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const config = require("../db/config");

const actionTracker = new Map();
const WINDOW = 10000;

const THRESHOLDS = {
  channelDelete: 3,
  roleDelete: 3,
  ban: 3,
  kick: 5,
  webhookCreate: 2,
  botAdd: 1
};

function track(guildId, userId, action) {
  const key = `${guildId}_${userId}_${action}`;
  if (!actionTracker.has(key)) actionTracker.set(key, []);
  const now = Date.now();
  const times = actionTracker.get(key).filter(t => now - t < WINDOW);
  times.push(now);
  actionTracker.set(key, times);
  return times.length;
}

async function punish(guild, userId, reason) {
  try {
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) return;
    if (!member.kickable) return;

    const botMember = guild.members.me;
    if (member.roles.highest.position >= botMember.roles.highest.position) return;

    const logChannelId = config.get(guild.id, "logChannel");

    await member.roles.set([], `[Anti-Nuke] ${reason}`).catch(() => {});
    await guild.members.ban(userId, { reason: `[Anti-Nuke] ${reason}` }).catch(() => {});

    if (logChannelId) {
      const ch = guild.channels.cache.get(logChannelId);
      if (ch) {
        const embed = new EmbedBuilder()
          .setTitle("🛡️ Anti-Nuke Triggered")
          .setColor(0xff0000)
          .addFields(
            { name: "User Punished", value: `<@${userId}> (${userId})`, inline: true },
            { name: "Reason", value: reason, inline: true },
            { name: "Action", value: "Roles removed + Banned", inline: true }
          )
          .setTimestamp();
        ch.send({ embeds: [embed] }).catch(() => {});
      }
    }

    console.log(`[Anti-Nuke] Banned ${userId} — ${reason}`);
  } catch (err) {
    console.error("[Anti-Nuke] Punish error:", err.message);
  }
}

async function getExecutor(guild, auditEvent) {
  try {
    const logs = await guild.fetchAuditLogs({ limit: 1, type: auditEvent });
    const entry = logs.entries.first();
    if (!entry) return null;
    if (Date.now() - entry.createdTimestamp > 5000) return null;
    return entry.executor?.id;
  } catch { return null; }
}

module.exports = (client) => {
  client.on("channelDelete", async (channel) => {
    if (!channel.guild) return;
    if (!config.get(channel.guild.id, "antiNuke")) return;
    const userId = await getExecutor(channel.guild, AuditLogEvent.ChannelDelete);
    if (!userId || userId === client.user.id) return;
    const count = track(channel.guild.id, userId, "channelDelete");
    if (count >= THRESHOLDS.channelDelete) {
      await punish(channel.guild, userId, `Mass channel deletion (${count} channels deleted)`);
    }
  });

  client.on("roleDelete", async (role) => {
    if (!config.get(role.guild.id, "antiNuke")) return;
    const userId = await getExecutor(role.guild, AuditLogEvent.RoleDelete);
    if (!userId || userId === client.user.id) return;
    const count = track(role.guild.id, userId, "roleDelete");
    if (count >= THRESHOLDS.roleDelete) {
      await punish(role.guild, userId, `Mass role deletion (${count} roles deleted)`);
    }
  });

  client.on("guildBanAdd", async (ban) => {
    if (!config.get(ban.guild.id, "antiNuke")) return;
    const userId = await getExecutor(ban.guild, AuditLogEvent.MemberBanAdd);
    if (!userId || userId === client.user.id) return;
    const count = track(ban.guild.id, userId, "ban");
    if (count >= THRESHOLDS.ban) {
      await punish(ban.guild, userId, `Mass banning (${count} bans)`);
    }
  });

  client.on("guildMemberRemove", async (member) => {
    if (!config.get(member.guild.id, "antiNuke")) return;
    try {
      const logs = await member.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberKick });
      const entry = logs.entries.first();
      if (!entry || Date.now() - entry.createdTimestamp > 5000) return;
      if (entry.target?.id !== member.id) return;
      const userId = entry.executor?.id;
      if (!userId || userId === client.user.id) return;
      const count = track(member.guild.id, userId, "kick");
      if (count >= THRESHOLDS.kick) {
        await punish(member.guild, userId, `Mass kicking (${count} kicks)`);
      }
    } catch {}
  });

  client.on("guildMemberAdd", async (member) => {
    if (!member.user.bot) return;
    if (!config.get(member.guild.id, "antiNuke")) return;
    const userId = await getExecutor(member.guild, AuditLogEvent.BotAdd);
    if (!userId || userId === client.user.id) return;
    const count = track(member.guild.id, userId, "botAdd");
    if (count >= THRESHOLDS.botAdd) {
      await punish(member.guild, userId, `Unauthorized bot addition`);
    }
  });

  client.on("webhookUpdate", async (channel) => {
    if (!config.get(channel.guild.id, "antiNuke")) return;
    const userId = await getExecutor(channel.guild, AuditLogEvent.WebhookCreate);
    if (!userId || userId === client.user.id) return;
    const count = track(channel.guild.id, userId, "webhookCreate");
    if (count >= THRESHOLDS.webhookCreate) {
      await punish(channel.guild, userId, `Mass webhook creation`);
    }
  });
};
