const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("sendmessage")
    .setDescription("Send a message to a text channel")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption(option =>
      option
        .setName("channel")
        .setDescription("Channel where the message should be sent")
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("message")
        .setDescription("Message content (up to 2,000 characters)")
        .setMinLength(1)
        .setMaxLength(2000)
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: "❌ This command can only be used in a server.", ephemeral: true });
      return;
    }

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.reply({ content: "❌ You need **Manage Server** permission to use this command.", ephemeral: true });
      return;
    }

    const channel = interaction.options.getChannel("channel", true);
    const message = interaction.options.getString("message", true).trim();
    const botPermissions = channel.permissionsFor(interaction.guild.members.me);

    if (!botPermissions?.has(PermissionFlagsBits.ViewChannel) || !botPermissions.has(PermissionFlagsBits.SendMessages)) {
      await interaction.reply({
        content: `❌ I need **View Channel** and **Send Messages** permissions in ${channel}.`,
        ephemeral: true
      });
      return;
    }

    try {
      await channel.send({
        content: message,
        allowedMentions: { parse: [] }
      });

      await interaction.reply({
        content: `✅ Message sent to ${channel}.`,
        ephemeral: true
      });
    } catch (error) {
      console.error("Failed to send message:", error.message);
      await interaction.reply({
        content: "❌ Failed to send the message. Check the channel permissions and try again.",
        ephemeral: true
      });
    }
  }
};