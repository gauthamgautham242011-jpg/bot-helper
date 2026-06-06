const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("serverinfo")
    .setDescription("Show information about this server"),

  async execute(interaction) {
    const guild = interaction.guild;
    await guild.fetch();

    const owner = await guild.fetchOwner();
    const channels = guild.channels.cache;
    const textChannels = channels.filter((c) => c.type === 0).size;
    const voiceChannels = channels.filter((c) => c.type === 2).size;
    const categories = channels.filter((c) => c.type === 4).size;
    const roles = guild.roles.cache.size - 1;
    const emojis = guild.emojis.cache.size;
    const members = guild.memberCount;
    const bots = guild.members.cache.filter((m) => m.user.bot).size;
    const humans = members - bots;

    const createdAt = `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`;
    const createdAgo = `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`;

    const verificationLevels = {
      0: "None",
      1: "Low",
      2: "Medium",
      3: "High",
      4: "Very High"
    };

    const embed = new EmbedBuilder()
      .setTitle(`📊 ${guild.name}`)
      .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
      .setColor(0x5865f2)
      .addFields(
        { name: "👑 Owner", value: `${owner.user.tag}`, inline: true },
        { name: "🌍 Region", value: "Auto", inline: true },
        { name: "🔒 Verification", value: verificationLevels[guild.verificationLevel], inline: true },
        { name: "👥 Members", value: `Total: **${members}**\nHumans: **${humans}** | Bots: **${bots}**`, inline: true },
        { name: "💬 Channels", value: `Text: **${textChannels}**\nVoice: **${voiceChannels}** | Categories: **${categories}**`, inline: true },
        { name: "🎭 Roles", value: `**${roles}**`, inline: true },
        { name: "😀 Emojis", value: `**${emojis}**`, inline: true },
        { name: "🆔 Server ID", value: `\`${guild.id}\``, inline: true },
        { name: "📅 Created", value: `${createdAt}\n${createdAgo}`, inline: false }
      )
      .setFooter({ text: `SNF BOT`, iconURL: interaction.client.user.displayAvatarURL() })
      .setTimestamp();

    if (guild.bannerURL()) embed.setImage(guild.bannerURL({ size: 1024 }));

    await interaction.reply({ embeds: [embed] });
  }
};
