const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType
} = require("discord.js");

const cooldowns = new Map();
const COOLDOWN_MS = 60_000;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("spam")
    .setDescription("Send one controlled notification to a role")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addRoleOption(option =>
      option
        .setName("role")
        .setDescription("Role to notify once")
        .setRequired(true)
    )
    .addChannelOption(option =>
      option
        .setName("channel")
        .setDescription("Text channel for the notification")
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("message")
        .setDescription("Notification message (up to 2,000 characters)")
        .setMinLength(1)
        .setMaxLength(2000)
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: "❌ This command can only be used in a server.", ephemeral: true });
      return;
    }

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.reply({ content: "❌ You need **Manage Server** permission to use this command.", ephemeral: true });
      return;
    }

    const lastUsed = cooldowns.get(interaction.guild.id) || 0;
    const remaining = COOLDOWN_MS - (Date.now() - lastUsed);
    if (remaining > 0) {
      await interaction.reply({
        content: `❌ Please wait **${Math.ceil(remaining / 1000)} seconds** before using this command again.`,
        ephemeral: true
      });
      return;
    }

    const role = interaction.options.getRole("role", true);
    const channel = interaction.options.getChannel("channel", true);
    const message = interaction.options.getString("message", true).trim();

    if (role.id === interaction.guild.id || role.name === "@everyone") {
      await interaction.reply({ content: "❌ `@everyone` cannot be selected for this command.", ephemeral: true });
      return;
    }

    if (message.includes("@everyone") || message.includes("@here")) {
      await interaction.reply({ content: "❌ `@everyone` and `@here` are blocked.", ephemeral: true });
      return;
    }

    const botPermissions = channel.permissionsFor(interaction.guild.members.me);
    if (!botPermissions?.has(PermissionFlagsBits.ViewChannel) || !botPermissions.has(PermissionFlagsBits.SendMessages)) {
      await interaction.reply({
        content: `❌ I need **View Channel** and **Send Messages** permissions in ${channel}.`,
        ephemeral: true
      });
      return;
    }

    try {
      await channel.send({
        content: `${role} ${message}`,
        allowedMentions: { roles: [role.id], parse: [] }
      });
      cooldowns.set(interaction.guild.id, Date.now());

      await interaction.reply({
        content: `✅ One notification sent to ${role} in ${channel}.`,
        ephemeral: true
      });
    } catch (error) {
      console.error("Failed to send controlled role notification:", error.message);
      await interaction.reply({
        content: "❌ Failed to send the notification. Check the channel permissions and try again.",
        ephemeral: true
      });
    }
  }
};