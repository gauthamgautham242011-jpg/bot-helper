const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const warnings = require("../db/warnings");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("clearwarns")
    .setDescription("Clear all warnings from a user")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option.setName("user").setDescription("User to clear warnings for").setRequired(true)
    ),

  async execute(interaction) {
    const user = interaction.options.getUser("user");
    const count = warnings.clearWarns(interaction.guild.id, user.id);

    if (count === 0) {
      return interaction.reply({
        content: `✅ **${user.tag}** ki koi warnings nahi thi.`,
        ephemeral: true
      });
    }

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
