const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Unban a user from the server")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption(o => o.setName("userid").setDescription("User ID to unban").setRequired(true))
    .addStringOption(o => o.setName("reason").setDescription("Reason").setRequired(false)),

  async execute(interaction) {
    const userId = interaction.options.getString("userid");
    const reason = interaction.options.getString("reason") || "No reason provided";

    try {
      const ban = await interaction.guild.bans.fetch(userId).catch(() => null);
      if (!ban) return interaction.reply({ content: "❌ This user is not banned.", ephemeral: true });

      await interaction.guild.members.unban(userId, reason);

      const embed = new EmbedBuilder()
        .setTitle("✅ User Unbanned")
        .setColor(0x00ff00)
        .addFields(
          { name: "User", value: `${ban.user.tag} (${userId})`, inline: true },
          { name: "Moderator", value: `${interaction.user.tag}`, inline: true },
          { name: "Reason", value: reason, inline: false }
        ).setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      await interaction.reply({ content: `❌ Failed to unban: ${err.message}`, ephemeral: true });
    }
  }
};
