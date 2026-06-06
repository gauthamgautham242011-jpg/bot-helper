const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("avatar")
    .setDescription("Show a user's profile picture")
    .addUserOption((option) =>
      option.setName("user").setDescription("User to get avatar of (default: yourself)").setRequired(false)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser("user") || interaction.user;
    await target.fetch(true);

    const member = interaction.guild.members.cache.get(target.id);

    const globalAvatar = target.displayAvatarURL({ dynamic: true, size: 4096 });
    const serverAvatar = member?.displayAvatarURL({ dynamic: true, size: 4096 });

    const embed = new EmbedBuilder()
      .setTitle(`🖼️ ${target.tag}'s Avatar`)
      .setImage(serverAvatar || globalAvatar)
      .setColor(member?.displayHexColor || 0x5865f2)
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Open Full Size")
        .setStyle(ButtonStyle.Link)
        .setURL(serverAvatar || globalAvatar)
    );

    if (serverAvatar && serverAvatar !== globalAvatar) {
      row.addComponents(
        new ButtonBuilder()
          .setLabel("Global Avatar")
          .setStyle(ButtonStyle.Link)
          .setURL(globalAvatar)
      );
      embed.setFooter({ text: "Showing server avatar • Click 'Global Avatar' for the global one" });
    }

    await interaction.reply({ embeds: [embed], components: [row] });
  }
};
