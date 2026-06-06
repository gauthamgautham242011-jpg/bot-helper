const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");

const durations = {
  "60s": 60 * 1000,
  "5m": 5 * 60 * 1000,
  "10m": 10 * 60 * 1000,
  "30m": 30 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "6h": 6 * 60 * 60 * 1000,
  "12h": 12 * 60 * 60 * 1000,
  "1d": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Timeout (mute) a user")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option.setName("user").setDescription("User to timeout").setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("duration")
        .setDescription("Duration (60s, 5m, 10m, 30m, 1h, 6h, 12h, 1d, 7d)")
        .setRequired(true)
        .addChoices(
          { name: "60 seconds", value: "60s" },
          { name: "5 minutes", value: "5m" },
          { name: "10 minutes", value: "10m" },
          { name: "30 minutes", value: "30m" },
          { name: "1 hour", value: "1h" },
          { name: "6 hours", value: "6h" },
          { name: "12 hours", value: "12h" },
          { name: "1 day", value: "1d" },
          { name: "7 days", value: "7d" }
        )
    )
    .addStringOption((option) =>
      option.setName("reason").setDescription("Reason").setRequired(false)
    ),

  async execute(interaction) {
    const user = interaction.options.getUser("user");
    const durationKey = interaction.options.getString("duration");
    const reason = interaction.options.getString("reason") || "No reason provided";
    const ms = durations[durationKey];

    const member = interaction.guild.members.cache.get(user.id);
    if (!member) {
      return interaction.reply({ content: "❌ User not found.", ephemeral: true });
    }
    if (!member.moderatable) {
      return interaction.reply({ content: "❌ I cannot timeout this user.", ephemeral: true });
    }

    try {
      await member.timeout(ms, reason);

      const embed = new EmbedBuilder()
        .setTitle("⏱️ User Timed Out")
        .setColor(0xffcc00)
        .addFields(
          { name: "User", value: `${user.tag} (${user.id})`, inline: true },
          { name: "Moderator", value: `${interaction.user.tag}`, inline: true },
          { name: "Duration", value: durationKey, inline: true },
          { name: "Reason", value: reason, inline: false }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ content: "❌ Failed to timeout user.", ephemeral: true });
    }
  }
};
