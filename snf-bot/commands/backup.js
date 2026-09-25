const path = require("path");
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  AttachmentBuilder
} = require("discord.js");
const { createBackup, restoreBackup, botCanRestore } = require("../db/serverBackup");

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
        await interaction.editReply({
          content:
            `✅ Backup for **${interaction.guild.name}** is ready.\n` +
            `Includes roles, supported channel setup, warnings, server settings, and giveaway records. ` +
            `Message history and channel contents are not included. Keep the downloaded file somewhere safe.`,
          files: [file]
        });
      } catch (error) {
        console.error("Failed to create server backup:", error.message);
        await interaction.editReply("❌ Could not create the backup. Check the bot logs and try again.");
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