const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("announce")
    .setDescription("Send an announcement to a channel")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((option) =>
      option.setName("message").setDescription("Announcement message").setRequired(true)
    )
    .addChannelOption((option) =>
      option.setName("channel").setDescription("Channel to send to (default: current)").setRequired(false)
    )
    .addRoleOption((option) =>
      option.setName("ping").setDescription("Role to ping (optional)").setRequired(false)
    )
    .addStringOption((option) =>
      option.setName("title").setDescription("Announcement title (optional)").setRequired(false)
    ),

  async execute(interaction) {
    const message = interaction.options.getString("message");
    const channel = interaction.options.getChannel("channel") || interaction.channel;
    const pingRole = interaction.options.getRole("ping");
    const title = interaction.options.getString("title") || "📢 Announcement";

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(message)
      .setColor(0xffd700)
      .setFooter({
        text: `Announced by ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

    const content = pingRole ? `${pingRole}` : "";

    try {
      await channel.send({ content, embeds: [embed] });
      await interaction.reply({
        content: `✅ Announcement sent to ${channel}!`,
        ephemeral: true
      });
    } catch (err) {
      console.error(err);
      await interaction.reply({
        content: "❌ Failed to send announcement. Check my permissions in that channel.",
        ephemeral: true
      });
    }
  }
};
