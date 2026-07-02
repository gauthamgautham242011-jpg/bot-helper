const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("slowmode")
    .setDescription("Set slowmode for a channel")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addIntegerOption(o =>
      o.setName("seconds").setDescription("Slowmode in seconds (0 = disable, max 21600)").setMinValue(0).setMaxValue(21600).setRequired(true)
    )
    .addChannelOption(o => o.setName("channel").setDescription("Channel (default: current)").setRequired(false)),

  async execute(interaction) {
    const seconds = interaction.options.getInteger("seconds");
    const channel = interaction.options.getChannel("channel") || interaction.channel;

    await channel.setRateLimitPerUser(seconds);

    const embed = new EmbedBuilder()
      .setColor(seconds === 0 ? 0x00ff00 : 0xffcc00)
      .setTitle(seconds === 0 ? "✅ Slowmode Disabled" : `⏱️ Slowmode Set`)
      .addFields(
        { name: "Channel", value: `${channel}`, inline: true },
        { name: "Slowmode", value: seconds === 0 ? "Disabled" : `${seconds}s`, inline: true }
      ).setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
