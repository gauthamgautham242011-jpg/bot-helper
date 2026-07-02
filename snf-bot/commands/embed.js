const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("embed")
    .setDescription("Create a custom embed message")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption(o => o.setName("title").setDescription("Embed title").setRequired(true))
    .addStringOption(o => o.setName("description").setDescription("Embed description").setRequired(true))
    .addStringOption(o => o.setName("color").setDescription("Hex color e.g. #ff0000 (default: #5865f2)").setRequired(false))
    .addChannelOption(o => o.setName("channel").setDescription("Channel to send to (default: current)").setRequired(false))
    .addStringOption(o => o.setName("footer").setDescription("Footer text").setRequired(false))
    .addStringOption(o => o.setName("image").setDescription("Image URL").setRequired(false)),

  async execute(interaction) {
    const title = interaction.options.getString("title");
    const description = interaction.options.getString("description");
    const colorInput = interaction.options.getString("color") || "#5865f2";
    const channel = interaction.options.getChannel("channel") || interaction.channel;
    const footer = interaction.options.getString("footer");
    const image = interaction.options.getString("image");

    let color = 0x5865f2;
    try {
      color = parseInt(colorInput.replace("#", ""), 16);
    } catch {}

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(color)
      .setTimestamp();

    if (footer) embed.setFooter({ text: footer });
    if (image) embed.setImage(image);

    try {
      await channel.send({ embeds: [embed] });
      await interaction.reply({ content: `✅ Embed sent to ${channel}!`, ephemeral: true });
    } catch {
      await interaction.reply({ content: "❌ Failed to send embed. Check my permissions.", ephemeral: true });
    }
  }
};
