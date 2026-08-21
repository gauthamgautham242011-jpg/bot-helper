const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");

const CONFIRMATION = "DELETE ALL CHANNELS";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("deleteallchannels")
    .setDescription("Permanently delete every channel in this server")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option =>
      option
        .setName("confirmation")
        .setDescription(`Type exactly: ${CONFIRMATION}`)
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: "❌ This command can only be used in a server.", ephemeral: true });
      return;
    }

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({ content: "❌ You need **Administrator** permission to use this command.", ephemeral: true });
      return;
    }

    const confirmation = interaction.options.getString("confirmation", true).trim();
    if (confirmation !== CONFIRMATION) {
      await interaction.reply({
        content: `❌ Nothing was deleted. Type the confirmation exactly as **${CONFIRMATION}**.`,
        ephemeral: true
      });
      return;
    }

    const channels = [...interaction.guild.channels.cache.values()];
    const botMember = interaction.guild.members.me;
    if (!botMember?.permissions.has(PermissionFlagsBits.ManageChannels)) {
      await interaction.reply({
        content: "❌ I need the **Manage Channels** permission to do this.",
        ephemeral: true
      });
      return;
    }

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("⚠️ Destructive action confirmed")
          .setDescription(`Deleting **${channels.length}** channel(s) in 5 seconds.\nThis cannot be undone.`)
          .setColor(0xff0000)
          .setTimestamp()
      ],
      ephemeral: true
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    let deleted = 0;
    let failed = 0;
    for (const channel of channels) {
      try {
        await channel.delete("Bulk channel deletion requested by an Administrator");
        deleted++;
      } catch (error) {
        failed++;
        console.error(`Failed to delete channel ${channel.id}:`, error.message);
      }
    }

    console.log(`🧹 Bulk channel deletion finished in ${interaction.guild.name}: ${deleted} deleted, ${failed} failed`);
  }
};