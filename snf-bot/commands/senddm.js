const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

const cooldowns = new Map();
const COOLDOWN_MS = 30_000;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("senddm")
    .setDescription("Send a private message to a Discord user")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption(option =>
      option.setName("user").setDescription("User who should receive the DM").setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("message")
        .setDescription("Private message (up to 2,000 characters)")
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

    const cooldownKey = `${interaction.guild.id}:${interaction.user.id}`;
    const lastUsed = cooldowns.get(cooldownKey) || 0;
    const remaining = COOLDOWN_MS - (Date.now() - lastUsed);
    if (remaining > 0) {
      await interaction.reply({
        content: `❌ Please wait **${Math.ceil(remaining / 1000)} seconds** before sending another DM.`,
        ephemeral: true
      });
      return;
    }

    const user = interaction.options.getUser("user", true);
    const message = interaction.options.getString("message", true).trim();

    if (message.includes("@everyone") || message.includes("@here")) {
      await interaction.reply({
        content: "❌ `@everyone` and `@here` are blocked in DMs.",
        ephemeral: true
      });
      return;
    }

    try {
      await user.send({
        content: message,
        allowedMentions: { parse: [] }
      });
      cooldowns.set(cooldownKey, Date.now());

      await interaction.reply({
        content: `✅ Private message sent to ${user.tag}.`,
        ephemeral: true
      });
    } catch (error) {
      console.error("Failed to send DM:", error.message);
      await interaction.reply({
        content: "❌ Could not send the DM. The user may have DMs disabled or may have blocked the bot.",
        ephemeral: true
      });
    }
  }
};