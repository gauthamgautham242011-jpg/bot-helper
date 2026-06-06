const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("untimeout")
    .setDescription("Remove timeout from a user")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option.setName("user").setDescription("User to untimeout").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("reason").setDescription("Reason").setRequired(false)
    ),

  async execute(interaction) {
    const user = interaction.options.getUser("user");
    const reason = interaction.options.getString("reason") || "No reason provided";

    const member = interaction.guild.members.cache.get(user.id);
    if (!member) {
      return interaction.reply({ content: "❌ User not found.", ephemeral: true });
    }

    if (!member.communicationDisabledUntil) {
      return interaction.reply({
        content: "❌ This user is not currently timed out.",
        ephemeral: true
      });
    }

    try {
      await member.timeout(null, reason);

      const embed = new EmbedBuilder()
        .setTitle("✅ Timeout Removed")
        .setColor(0x00ff00)
        .addFields(
          { name: "User", value: `${user.tag} (${user.id})`, inline: true },
          { name: "Moderator", value: `${interaction.user.tag}`, inline: true },
          { name: "Reason", value: reason, inline: false }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ content: "❌ Failed to remove timeout.", ephemeral: true });
    }
  }
};
