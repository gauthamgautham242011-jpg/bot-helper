const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const config = require("../db/config");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("antispam")
    .setDescription("Configure Anti-Spam protection")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub.setName("enable").setDescription("Enable anti-spam"))
    .addSubcommand(sub => sub.setName("disable").setDescription("Disable anti-spam")),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const enabled = sub === "enable";
    config.set(interaction.guild.id, "antiSpam", enabled);

    const embed = new EmbedBuilder()
      .setTitle(`🚫 Anti-Spam ${enabled ? "Enabled" : "Disabled"}`)
      .setColor(enabled ? 0x00ff00 : 0xff0000)
      .setDescription(enabled
        ? "Anti-spam is now active!\nUsers sending **6+ messages in 5 seconds** will be timed out for 1 minute."
        : "Anti-spam protection has been turned off.")
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
