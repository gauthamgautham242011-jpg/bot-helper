const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("activitycheck")
    .setDescription("Start an activity check")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((option) =>
      option
        .setName("message")
        .setDescription("Custom message for the activity check")
        .setRequired(false)
    ),

  async execute(interaction) {
    const customMsg =
      interaction.options.getString("message") ||
      "React to confirm you are still active in this server!";

    const embed = new EmbedBuilder()
      .setTitle("📋 Activity Check")
      .setDescription(`${customMsg}\n\nClick the button below to mark yourself as active.`)
      .setColor(0x57f287)
      .setFooter({ text: `Started by ${interaction.user.tag}` })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("active")
        .setLabel("✅ I'm Active")
        .setStyle(ButtonStyle.Success)
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  }
};
