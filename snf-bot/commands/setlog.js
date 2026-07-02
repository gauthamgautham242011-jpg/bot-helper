const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const config = require("../db/config");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setlog")
    .setDescription("Set the logging channel for mod actions")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(o => o.setName("channel").setDescription("Log channel (leave empty to disable)").setRequired(false)),

  async execute(interaction) {
    const channel = interaction.options.getChannel("channel");

    if (!channel) {
      config.set(interaction.guild.id, "logChannel", null);
      return interaction.reply({ content: "✅ Logging has been disabled.", ephemeral: true });
    }

    config.set(interaction.guild.id, "logChannel", channel.id);

    const embed = new EmbedBuilder()
      .setTitle("📋 Log Channel Set")
      .setColor(0x5865f2)
      .setDescription(`All mod actions will now be logged in ${channel}.\n\n**Logs include:**\n• Member join/leave\n• Message delete/edit\n• Ban/unban\n• Anti-nuke triggers`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
