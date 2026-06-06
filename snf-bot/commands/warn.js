const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const warnings = require("../db/warnings");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warn a user")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option.setName("user").setDescription("User to warn").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("reason").setDescription("Reason for warning").setRequired(true)
    ),

  async execute(interaction) {
    const user = interaction.options.getUser("user");
    const reason = interaction.options.getString("reason");

    if (user.id === interaction.user.id) {
      return interaction.reply({ content: "❌ Aap khud ko warn nahi kar sakte.", ephemeral: true });
    }
    if (user.bot) {
      return interaction.reply({ content: "❌ Bots ko warn nahi kar sakte.", ephemeral: true });
    }

    const total = warnings.addWarn(interaction.guild.id, user.id, interaction.user.id, reason);

    const embed = new EmbedBuilder()
      .setTitle("⚠️ User Warned")
      .setColor(0xffa500)
      .addFields(
        { name: "User", value: `${user.tag} (${user.id})`, inline: true },
        { name: "Moderator", value: `${interaction.user.tag}`, inline: true },
        { name: "Reason", value: reason, inline: false },
        { name: "Total Warnings", value: `**${total}**`, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
