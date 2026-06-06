const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const Warn = require("../models/Warn");

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
      return interaction.reply({ content: "❌ You cannot warn yourself.", ephemeral: true });
    }

    await Warn.create({
      guildId: interaction.guild.id,
      userId: user.id,
      moderatorId: interaction.user.id,
      reason
    });

    const totalWarns = await Warn.countDocuments({
      guildId: interaction.guild.id,
      userId: user.id
    });

    const embed = new EmbedBuilder()
      .setTitle("⚠️ User Warned")
      .setColor(0xffa500)
      .addFields(
        { name: "User", value: `${user.tag} (${user.id})`, inline: true },
        { name: "Moderator", value: `${interaction.user.tag}`, inline: true },
        { name: "Reason", value: reason, inline: false },
        { name: "Total Warnings", value: `${totalWarns}`, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
