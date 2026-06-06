const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a user from the server")
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption((option) =>
      option.setName("user").setDescription("User to kick").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("reason").setDescription("Reason for kick").setRequired(false)
    ),

  async execute(interaction) {
    const user = interaction.options.getUser("user");
    const reason = interaction.options.getString("reason") || "No reason provided";

    if (user.id === interaction.user.id) {
      return interaction.reply({ content: "❌ You cannot kick yourself.", ephemeral: true });
    }

    const member = interaction.guild.members.cache.get(user.id);
    if (!member) {
      return interaction.reply({ content: "❌ User not found in this server.", ephemeral: true });
    }
    if (!member.kickable) {
      return interaction.reply({ content: "❌ I cannot kick this user.", ephemeral: true });
    }

    try {
      await member.kick(reason);

      const embed = new EmbedBuilder()
        .setTitle("👢 User Kicked")
        .setColor(0xff6600)
        .addFields(
          { name: "User", value: `${user.tag} (${user.id})`, inline: true },
          { name: "Moderator", value: `${interaction.user.tag}`, inline: true },
          { name: "Reason", value: reason, inline: false }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ content: "❌ Failed to kick user.", ephemeral: true });
    }
  }
};
