const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  AttachmentBuilder,
  EmbedBuilder,
  AuditLogEvent
} = require("discord.js");
const { createBackup, restoreBackup, botCanRestore } = require("../db/serverBackup");
const { getGuildData } = require("../db/backupData");
const {
  archiveBackup,
  listBackupArchives,
  readBackupArchive
} = require("../db/backupHistory");

const MAX_BACKUP_BYTES = 7 * 1024 * 1024;
const DISCORD_ATTACHMENT_HOSTS = new Set(["cdn.discordapp.com", "media.discordapp.net"]);

function safeFilename(value) {
  return value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "server";
}

function scheduleRestoredGiveaway(client, messageId, data, guildId) {
  if (data.ended || !Number.isFinite(data.endTime)) return;

  const checkEndTime = async () => {
    const remaining = data.endTime - Date.now();
    if (remaining <= 0) {
      const { endGiveaway } = require("./giveaway");
      await endGiveaway(client, messageId, data.channelId, guildId).catch(error => {
        console.error("Could not finish restored giveaway:", error.message);
      });
      return;
    }
    setTimeout(checkEndTime, Math.min(remaining, 2_147_000_000));
  };

  setTimeout(checkEndTime, Math.min(Math.max(data.endTime - Date.now(), 0), 2_147_000_000));
}

function shorten(value, maxLength = 350) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  if (!text) return "—";
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function auditActionName(action) {
  const knownNames = {
    [AuditLogEvent.GuildUpdate]: "Server updated",
    [AuditLogEvent.ChannelCreate]: "Channel created",
    [AuditLogEvent.ChannelUpdate]: "Channel updated",
    [AuditLogEvent.ChannelDelete]: "Channel deleted",
    [AuditLogEvent.ChannelOverwriteCreate]: "Channel permission added",
    [AuditLogEvent.ChannelOverwriteUpdate]: "Channel permission updated",
    [AuditLogEvent.ChannelOverwriteDelete]: "Channel permission removed",
    [AuditLogEvent.RoleCreate]: "Role created",
    [AuditLogEvent.RoleUpdate]: "Role updated",
    [AuditLogEvent.RoleDelete]: "Role deleted",
    [AuditLogEvent.MemberKick]: "Member kicked",
    [AuditLogEvent.MemberBanAdd]: "Member banned",
    [AuditLogEvent.MemberBanRemove]: "Member unbanned",
    [AuditLogEvent.MemberUpdate]: "Member updated",
    [AuditLogEvent.MemberRoleUpdate]: "Member roles changed",
    [AuditLogEvent.MessageDelete]: "Message deleted",
    [AuditLogEvent.MessageBulkDelete]: "Messages deleted",
    [AuditLogEvent.InviteCreate]: "Invite created",
    [AuditLogEvent.InviteDelete]: "Invite deleted",
    [AuditLogEvent.WebhookCreate]: "Webhook created",
    [AuditLogEvent.WebhookUpdate]: "Webhook updated",
    [AuditLogEvent.WebhookDelete]: "Webhook deleted",
    [AuditLogEvent.BotAdd]: "Bot added"
  };
  return knownNames[action] || `Discord action ${action}`;
}

function formatAuditEntry(entry) {
  const target = entry.target?.name || entry.target?.tag || entry.target?.id || "Unknown target";
  const executor = entry.executor?.tag || entry.executor?.username || entry.executor?.id || "Unknown user";
  const changes = (entry.changes || [])
    .slice(0, 3)
    .map(change => `${change.key}: ${shorten(change.old)} → ${shorten(change.new)}`)
    .join("\n");

  return [
    `**${auditActionName(entry.action)}**`,
    `Target: ${shorten(target, 180)}`,
    `By: ${shorten(executor, 180)}`,
    changes ? shorten(changes, 650) : null,
    `<t:${Math.floor(entry.createdTimestamp / 1000)}:R>`
  ].filter(Boolean).join("\n");
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("backup")
    .setDescription("Download or safely restore this server's SNF bot backup")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName("create")
        .setDescription("Download a JSON backup of bot data, roles, and channels")
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("info")
        .setDescription("Show the current server backup summary and saved backup history")
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("download")
        .setDescription("Download one of this server's saved backups")
        .addStringOption(option =>
          option
            .setName("id")
            .setDescription("Backup ID shown by /backup info")
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("changes")
        .setDescription("Show recent server changes from Discord's audit log")
        .addIntegerOption(option =>
          option
            .setName("limit")
            .setDescription("Number of recent changes to show")
            .setMinValue(1)
            .setMaxValue(15)
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("restore")
        .setDescription("Add missing roles, channels, and bot data from a backup")
        .addAttachmentOption(option =>
          option.setName("file").setDescription("JSON backup file from this server").setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName("confirm")
            .setDescription("Type RESTORE followed by this server's ID")
            .setMinLength(24)
            .setMaxLength(32)
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: "❌ This command can only be used in a server.", ephemeral: true });
      return;
    }

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({ content: "❌ Only a server Administrator can use backups.", ephemeral: true });
      return;
    }

    const subcommand = interaction.options.getSubcommand();
    if (subcommand === "create") {
      await interaction.deferReply({ ephemeral: true });
      try {
        const backup = await createBackup(interaction.guild);
        const contents = Buffer.from(JSON.stringify(backup, null, 2), "utf8");
        if (contents.length > MAX_BACKUP_BYTES) {
          await interaction.editReply("❌ This backup is larger than the 7 MB attachment limit. Reduce the server's saved structure and try again.");
          return;
        }

        const date = new Date().toISOString().replace(/[:.]/g, "-");
        const file = new AttachmentBuilder(contents, {
          name: `snf-backup-${safeFilename(interaction.guild.name)}-${date}.json`
        });
        let archiveNotice = "";
        try {
          const saved = archiveBackup(interaction.guild.id, backup);
          archiveNotice = `\nSaved backup ID: \`${saved.id}\` (use \`/backup info\` to see it).`;
        } catch (archiveError) {
          console.error("Could not archive server backup:", archiveError.message);
          archiveNotice = "\n⚠️ The download is ready, but the bot could not save a local history copy.";
        }

        await interaction.editReply({
          content:
            `✅ Backup for **${interaction.guild.name}** is ready.\n` +
            `Includes roles, supported channel setup, warnings, server settings, and giveaway records. ` +
            `Message history and channel contents are not included. Keep the downloaded file somewhere safe.` +
            archiveNotice,
          files: [file]
        });
      } catch (error) {
        console.error("Failed to create server backup:", error.message);
        await interaction.editReply("❌ Could not create the backup. Check the bot logs and try again.");
      }
      return;
    }

    if (subcommand === "info") {
      await interaction.deferReply({ ephemeral: true });
      try {
        await interaction.guild.roles.fetch();
        await interaction.guild.channels.fetch();
        const data = getGuildData(interaction.guild.id);
        const warningCount = Object.values(data.warnings).reduce(
          (total, items) => total + (Array.isArray(items) ? items.length : 0),
          0
        );
        const history = listBackupArchives(interaction.guild.id);
        const historyText = history.length
          ? history.slice(0, 10).map(entry =>
            `\`${entry.id}\` • <t:${Math.floor(Date.parse(entry.createdAt) / 1000)}:F> • ` +
            `${entry.roles} roles, ${entry.channels} channels, ${entry.warnings} warnings`
          ).join("\n")
          : "No saved backup history yet. Create a new backup to start the archive.";

        const embed = new EmbedBuilder()
          .setTitle(`📦 Backup info — ${interaction.guild.name}`)
          .setColor(0x5865f2)
          .addFields(
            {
              name: "Current server",
              value:
                `Roles: **${interaction.guild.roles.cache.filter(role => !role.managed && role.id !== interaction.guild.id).size}**\n` +
                `Channels: **${interaction.guild.channels.cache.size}**\n` +
                `Warnings: **${warningCount}**\n` +
                `Giveaway records: **${Object.keys(data.giveaways).length}**`,
              inline: true
            },
            {
              name: "Saved backups",
              value: `${historyText}\n\nUse \`/backup download id:<ID>\` to download an older saved copy.`,
              inline: false
            }
          )
          .setFooter({ text: "Only the latest 10 backups are kept. Old Discord audit logs expire after about 45 days." })
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      } catch (error) {
        console.error("Failed to show backup info:", error.message);
        await interaction.editReply("❌ Could not read backup information. Check the bot logs and try again.");
      }
      return;
    }

    if (subcommand === "download") {
      await interaction.deferReply({ ephemeral: true });
      try {
        const id = interaction.options.getString("id", true).trim();
        const archive = readBackupArchive(interaction.guild.id, id);
        await interaction.editReply({
          content: `✅ Saved backup \`${id}\` for **${interaction.guild.name}**.`,
          files: [new AttachmentBuilder(archive.contents, { name: archive.filename })]
        });
      } catch (error) {
        await interaction.editReply(`❌ Could not download that backup: ${error.message}`);
      }
      return;
    }

    if (subcommand === "changes") {
      const botMember = interaction.guild.members.me;
      if (!botMember?.permissions.has(PermissionFlagsBits.ViewAuditLog)) {
        await interaction.reply({
          content: "❌ I need the **View Audit Log** permission to read server changes.",
          ephemeral: true
        });
        return;
      }

      await interaction.deferReply({ ephemeral: true });
      try {
        const limit = interaction.options.getInteger("limit") || 10;
        const auditLogs = await interaction.guild.fetchAuditLogs({ limit });
        const entries = [...auditLogs.entries.values()];
        if (!entries.length) {
          await interaction.editReply("ℹ️ Discord returned no recent audit-log changes for this server.");
          return;
        }

        const embed = new EmbedBuilder()
          .setTitle(`🧾 Recent server changes — ${interaction.guild.name}`)
          .setDescription("These are Discord audit-log entries, not message history. Discord normally keeps audit logs for about 45 days.")
          .setColor(0xffa500)
          .addFields(entries.slice(0, 25).map((entry, index) => ({
            name: `#${index + 1} • ${auditActionName(entry.action)}`,
            value: shorten(formatAuditEntry(entry), 1024),
            inline: false
          })))
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      } catch (error) {
        console.error("Failed to read server audit log:", error.message);
        await interaction.editReply("❌ I could not read the server audit log. Check my **View Audit Log** permission.");
      }
      return;
    }

    const confirmation = interaction.options.getString("confirm", true).trim();
    if (confirmation !== `RESTORE ${interaction.guild.id}`) {
      await interaction.reply({
        content: `❌ Nothing was restored. Type exactly: \`RESTORE ${interaction.guild.id}\``,
        ephemeral: true
      });
      return;
    }

    if (!botCanRestore(interaction.guild)) {
      await interaction.reply({
        content: "❌ I need both **Manage Roles** and **Manage Channels** permissions to restore this backup.",
        ephemeral: true
      });
      return;
    }

    const attachment = interaction.options.getAttachment("file", true);
    if (attachment.size > MAX_BACKUP_BYTES || !attachment.name.toLowerCase().endsWith(".json")) {
      await interaction.reply({
        content: "❌ Upload a JSON backup file no larger than 7 MB.",
        ephemeral: true
      });
      return;
    }

    const attachmentUrl = new URL(attachment.url);
    if (!DISCORD_ATTACHMENT_HOSTS.has(attachmentUrl.hostname)) {
      await interaction.reply({ content: "❌ The uploaded file must be a Discord attachment.", ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });
    try {
      const response = await fetch(attachmentUrl);
      if (!response.ok) throw new Error(`Backup download returned HTTP ${response.status}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length > MAX_BACKUP_BYTES) throw new Error("Backup file exceeds 7 MB");

      let backup;
      try {
        backup = JSON.parse(bytes.toString("utf8"));
      } catch {
        throw new Error("The uploaded file is not valid JSON");
      }

      const result = await restoreBackup(interaction.guild, backup);
      for (const item of result.restoredGiveaways) {
        scheduleRestoredGiveaway(interaction.client, item.messageId, item.data, interaction.guild.id);
      }

      await interaction.editReply(
        `✅ Backup restore finished for **${interaction.guild.name}**.\n` +
        `Roles created: **${result.rolesCreated}** (already present or unavailable: ${result.rolesSkipped})\n` +
        `Channels created: **${result.channelsCreated}** (already present or unavailable: ${result.channelsSkipped})\n` +
        `Existing roles/channels were not deleted or overwritten. Some records may be skipped if Discord permissions, hierarchy, or server limits prevent creation.`
      );
    } catch (error) {
      console.error("Failed to restore server backup:", error.message);
      await interaction.editReply(`❌ Backup restore failed: ${error.message.slice(0, 300)}`);
    }
  }
};