const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Delete a number of messages from this channel")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("Number of messages to delete (1-100)")
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    )
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("Only delete messages from this user (optional)")
        .setRequired(false)
    ),

  async execute(interaction) {
    const amount = interaction.options.getInteger("amount");
    const targetUser = interaction.options.getUser("user");

    await interaction.deferReply({ ephemeral: true });

    try {
      const messages = await interaction.channel.messages.fetch({ limit: 100 });

      let toDelete = [...messages.values()];

      const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
      toDelete = toDelete.filter((m) => m.createdTimestamp > twoWeeksAgo);

      if (targetUser) {
        toDelete = toDelete.filter((m) => m.author.id === targetUser.id);
      }

      toDelete = toDelete.slice(0, amount);

      if (toDelete.length === 0) {
        return interaction.editReply("❌ No messages found to delete.");
      }

      const deleted = await interaction.channel.bulkDelete(toDelete, true);

      await interaction.editReply(
        `🗑️ Deleted **${deleted.size}** message(s)${targetUser ? ` from ${targetUser.tag}` : ""}.`
      );
    } catch (err) {
      console.error(err);
      await interaction.editReply("❌ Failed to delete messages.");
    }
  }
};
