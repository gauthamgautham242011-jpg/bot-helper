const {
  SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle
} = require("discord.js");
const giveaways = require("../db/giveaways");

function parseDuration(str) {
  const match = str.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return null;
  const [, num, unit] = match;
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return parseInt(num) * multipliers[unit];
}

function formatDuration(ms) {
  if (ms < 60000) return `${ms / 1000}s`;
  if (ms < 3600000) return `${ms / 60000}m`;
  if (ms < 86400000) return `${ms / 3600000}h`;
  return `${ms / 86400000}d`;
}

async function endGiveaway(client, messageId, channelId, guildId) {
  const data = giveaways.get(messageId);
  if (!data || data.ended) return;

  giveaways.update(messageId, { ended: true });

  const guild = client.guilds.cache.get(guildId);
  if (!guild) return;
  const channel = guild.channels.cache.get(channelId);
  if (!channel) return;
  const message = await channel.messages.fetch(messageId).catch(() => null);
  if (!message) return;

  const entries = data.entries || [];
  if (entries.length === 0) {
    const embed = new EmbedBuilder()
      .setTitle("🎉 Giveaway Ended")
      .setColor(0xff0000)
      .setDescription(`**Prize:** ${data.prize}\n\n❌ No participants — no winner!`)
      .setTimestamp();
    await message.edit({ embeds: [embed], components: [] }).catch(() => {});
    return;
  }

  const winnerId = entries[Math.floor(Math.random() * entries.length)];
  giveaways.update(messageId, { winner: winnerId });

  const embed = new EmbedBuilder()
    .setTitle("🎉 Giveaway Ended!")
    .setColor(0xffd700)
    .setDescription(`**Prize:** ${data.prize}\n\n🏆 Winner: <@${winnerId}>\n\nCongratulations!`)
    .setFooter({ text: `${entries.length} participants` })
    .setTimestamp();

  const rerollRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`giveaway_reroll_${messageId}`).setLabel("🔄 Reroll").setStyle(ButtonStyle.Secondary)
  );

  await message.edit({ embeds: [embed], components: [rerollRow] }).catch(() => {});
  await channel.send(`🎉 Congratulations <@${winnerId}>! You won **${data.prize}**!`).catch(() => {});
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("giveaway")
    .setDescription("Giveaway system")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub.setName("start").setDescription("Start a giveaway")
        .addStringOption(o => o.setName("prize").setDescription("What are you giving away?").setRequired(true))
        .addStringOption(o => o.setName("duration").setDescription("Duration e.g. 1m, 1h, 1d, 30s").setRequired(true))
        .addChannelOption(o => o.setName("channel").setDescription("Channel for giveaway (default: current)").setRequired(false))
        .addIntegerOption(o => o.setName("winners").setDescription("Number of winners (default: 1)").setMinValue(1).setMaxValue(10).setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName("end").setDescription("End a giveaway early")
        .addStringOption(o => o.setName("messageid").setDescription("Giveaway message ID").setRequired(true))
    ),

  endGiveaway,

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === "start") {
      const prize = interaction.options.getString("prize");
      const durationStr = interaction.options.getString("duration");
      const channel = interaction.options.getChannel("channel") || interaction.channel;
      const winnerCount = interaction.options.getInteger("winners") || 1;

      const duration = parseDuration(durationStr);
      if (!duration) {
        return interaction.reply({ content: "❌ Invalid duration! Use: `30s`, `5m`, `2h`, `1d`", ephemeral: true });
      }

      const endTime = Date.now() + duration;

      const embed = new EmbedBuilder()
        .setTitle("🎉 GIVEAWAY")
        .setColor(0xffd700)
        .setDescription(`**Prize:** ${prize}\n\n🏆 Winners: **${winnerCount}**\n⏰ Ends: <t:${Math.floor(endTime / 1000)}:R>\n\nClick **Enter** to join!`)
        .setFooter({ text: `Hosted by ${interaction.user.tag} • 0 entries` })
        .setTimestamp(endTime);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("giveaway_enter").setLabel("🎉 Enter").setStyle(ButtonStyle.Success)
      );

      await interaction.reply({ content: `✅ Giveaway started in ${channel}!`, ephemeral: true });
      const msg = await channel.send({ embeds: [embed], components: [row] });

      giveaways.create(msg.id, {
        prize, channelId: channel.id, guildId: interaction.guild.id,
        hostedBy: interaction.user.id, endTime, winnerCount,
        entries: [], ended: false
      });

      setTimeout(() => endGiveaway(interaction.client, msg.id, channel.id, interaction.guild.id), duration);

    } else if (sub === "end") {
      const messageId = interaction.options.getString("messageid");
      const data = giveaways.get(messageId);
      if (!data) return interaction.reply({ content: "❌ Giveaway not found.", ephemeral: true });
      if (data.ended) return interaction.reply({ content: "❌ Giveaway already ended.", ephemeral: true });

      await endGiveaway(interaction.client, messageId, data.channelId, data.guildId);
      await interaction.reply({ content: "✅ Giveaway ended!", ephemeral: true });
    }
  }
};
