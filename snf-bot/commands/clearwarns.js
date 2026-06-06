const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const mongoose = require("mongoose");

function getWarn() {
  try { return require("../models/Warn"); } catch { return null; }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("clearwarns")
    .setDescription("Clear all warnings from a user")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option.setName("user").setDescription("User to clear warnings for").setRequired(true)
    ),

  async execute(interaction) {
    const dbReady = mongoose.connection.readyState === 1;
    if (!dbReady) {
      return interaction.reply({
        content: "❌ Database not connected. Add `MONGO_URI` to `.env` to enable this command.",
        ephemeral: true
      });
    }

    const Warn = getWarn();
    const user = interaction.options.getUser("user");

    const count = await Warn.countDocuments({
      guildId: interaction.guild.id,
      userId: user.id
    });

    if (count === 0) {
      return interaction.reply({
        content: `✅ **${user.tag}** has no warnings to clear.`,
        ephemeral: true
      });
    }

    await Warn.deleteMany({
      guildId: interaction.guild.id,
      userId: user.id
    });

    const embed = new EmbedBuilder()
      .setTitle("🗑️ Warnings Cleared")
      .setColor(0x00ff00)
      .addFields(
        { name: "User", value: `${user.tag} (${user.id})`, inline: true },
        { name: "Moderator", value: `${interaction.user.tag}`, inline: true },
        { name: "Warnings Removed", value: `**${count}**`, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
