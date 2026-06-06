const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Show information about a user")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("User to lookup (leave empty for yourself)")
        .setRequired(false)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser("user") || interaction.user;
    const member = interaction.guild.members.cache.get(target.id);

    await target.fetch(true);

    const createdAt = `<t:${Math.floor(target.createdTimestamp / 1000)}:F>`;
    const createdAgo = `<t:${Math.floor(target.createdTimestamp / 1000)}:R>`;

    const embed = new EmbedBuilder()
      .setTitle(`👤 ${target.tag}`)
      .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 512 }))
      .setColor(member?.displayHexColor || 0x5865f2)
      .addFields(
        { name: "🆔 User ID", value: `\`${target.id}\``, inline: true },
        { name: "🤖 Bot", value: target.bot ? "Yes" : "No", inline: true },
        { name: "📅 Account Created", value: `${createdAt}\n${createdAgo}`, inline: false }
      );

    if (member) {
      const joinedAt = `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`;
      const joinedAgo = `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`;

      const roles = member.roles.cache
        .filter((r) => r.id !== interaction.guild.id)
        .sort((a, b) => b.position - a.position)
        .map((r) => `${r}`)
        .slice(0, 10)
        .join(", ") || "None";

      const status = member.presence?.status || "offline";
      const statusEmoji = {
        online: "🟢",
        idle: "🟡",
        dnd: "🔴",
        offline: "⚫"
      };

      embed.addFields(
        { name: "📥 Joined Server", value: `${joinedAt}\n${joinedAgo}`, inline: false },
        { name: "📛 Nickname", value: member.nickname || "None", inline: true },
        { name: `${statusEmoji[status]} Status`, value: status.charAt(0).toUpperCase() + status.slice(1), inline: true },
        { name: "⏱️ Timed Out", value: member.communicationDisabledUntil ? "Yes" : "No", inline: true },
        { name: `🎭 Roles (${member.roles.cache.size - 1})`, value: roles, inline: false }
      );

      if (member.displayAvatarURL() !== target.displayAvatarURL()) {
        embed.setThumbnail(member.displayAvatarURL({ dynamic: true, size: 512 }));
      }
    }

    if (target.bannerURL()) embed.setImage(target.bannerURL({ size: 1024 }));

    embed
      .setFooter({ text: `SNF BOT`, iconURL: interaction.client.user.displayAvatarURL() })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
