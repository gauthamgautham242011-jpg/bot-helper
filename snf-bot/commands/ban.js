const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a user from the server")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((option) =>
      option.setName("user").setDescription("User to ban").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("reason").setDescription("Reason for ban").setRequired(false)
    )
    .addIntegerOption((option) =>
      option
        .setName("days")
        .setDescription("Days of messages to delete (0-7)")
        .setMinValue(0)
        .setMaxValue(7)
        .setRequired(false)
    ),

  async execute(interaction) {
    const user = interaction.options.getUser("user");
    const reason = interaction.options.getString("reason") || "No reason provided";
    const days = interaction.options.getInteger("days") ?? 0;

    if (user.id === interaction.user.id) {
      return interaction.reply({ content: "❌ You cannot ban yourself.", ephemeral: true });
    }

    const member = interaction.guild.members.cache.get(user.id);
    if (member && !member.bannable) {
      return interaction.reply({ content: "❌ I cannot ban this user.", ephemeral: true });
    }

    try {
      await interaction.guild.members.ban(user, {
        deleteMessageDays: days,
        reason
      });

      const embed = new EmbedBuilder()
        .setTitle("🔨 User Banned")
        .setColor(0xff0000)
        .addFields(
          { name: "User", value: `${user.tag} (${user.id})`, inline: true },
          { name: "Moderator", value: `${interaction.user.tag}`, inline: true },
          { name: "Reason", value: reason, inline: false }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ content: "❌ Failed to ban user.", ephemeral: true });
    }
  }
};
