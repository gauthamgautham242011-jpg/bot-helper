const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const config = require("../db/config");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("antinuke")
    .setDescription("Configure Anti-Nuke protection")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub.setName("enable").setDescription("Enable anti-nuke protection"))
    .addSubcommand(sub => sub.setName("disable").setDescription("Disable anti-nuke protection"))
    .addSubcommand(sub => sub.setName("status").setDescription("Check anti-nuke status")),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === "enable") {
      config.set(interaction.guild.id, "antiNuke", true);
      const embed = new EmbedBuilder()
        .setTitle("🛡️ Anti-Nuke Enabled")
        .setColor(0x00ff00)
        .setDescription("Your server is now protected!\n\nAuto-punishes anyone who:\n• Deletes **3+** channels in 10s\n• Deletes **3+** roles in 10s\n• Bans **3+** members in 10s\n• Kicks **5+** members in 10s\n• Creates **2+** webhooks in 10s\n• Adds an unauthorized bot\n\n**Action:** Roles removed + Banned")
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });

    } else if (sub === "disable") {
      config.set(interaction.guild.id, "antiNuke", false);
      const embed = new EmbedBuilder()
        .setTitle("🛡️ Anti-Nuke Disabled")
        .setColor(0xff0000)
        .setDescription("Anti-nuke protection has been turned off.")
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });

    } else {
      const enabled = config.get(interaction.guild.id, "antiNuke");
      const antiSpam = config.get(interaction.guild.id, "antiSpam");
      const logCh = config.get(interaction.guild.id, "logChannel");

      const embed = new EmbedBuilder()
        .setTitle("🛡️ Security Status")
        .setColor(0x5865f2)
        .addFields(
          { name: "Anti-Nuke", value: enabled ? "✅ Enabled" : "❌ Disabled", inline: true },
          { name: "Anti-Spam", value: antiSpam ? "✅ Enabled" : "❌ Disabled", inline: true },
          { name: "Log Channel", value: logCh ? `<#${logCh}>` : "Not set", inline: true }
        ).setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};
