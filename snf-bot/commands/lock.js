const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("lock")
    .setDescription("Lock a channel")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption(o => o.setName("channel").setDescription("Channel to lock (default: current)").setRequired(false))
    .addStringOption(o => o.setName("reason").setDescription("Reason").setRequired(false)),

  async execute(interaction) {
    const channel = interaction.options.getChannel("channel") || interaction.channel;
    const reason = interaction.options.getString("reason") || "No reason provided";

    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
      SendMessages: false
    }, { reason });

    const embed = new EmbedBuilder()
      .setTitle("🔒 Channel Locked")
      .setColor(0xff0000)
      .addFields(
        { name: "Channel", value: `${channel}`, inline: true },
        { name: "Moderator", value: `${interaction.user.tag}`, inline: true },
        { name: "Reason", value: reason, inline: false }
      ).setTimestamp();

    await interaction.reply({ embeds: [embed] });
    if (channel.id !== interaction.channel.id) {
      channel.send({ embeds: [new EmbedBuilder().setDescription("🔒 This channel has been locked by a moderator.").setColor(0xff0000)] }).catch(() => {});
    }
  }
};
