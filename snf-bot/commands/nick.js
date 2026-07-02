const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("nick")
    .setDescription("Change a user's nickname")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames)
    .addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
    .addStringOption(o => o.setName("nickname").setDescription("New nickname (leave empty to reset)").setRequired(false)),

  async execute(interaction) {
    const user = interaction.options.getUser("user");
    const nick = interaction.options.getString("nickname") || null;
    const member = interaction.guild.members.cache.get(user.id);

    if (!member) return interaction.reply({ content: "❌ Member not found.", ephemeral: true });
    if (!member.manageable) return interaction.reply({ content: "❌ I can't manage this user.", ephemeral: true });

    const oldNick = member.nickname || member.user.username;
    await member.setNickname(nick, `Changed by ${interaction.user.tag}`);

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("✏️ Nickname Changed")
      .addFields(
        { name: "User", value: `${user.tag}`, inline: true },
        { name: "Before", value: oldNick, inline: true },
        { name: "After", value: nick || user.username, inline: true }
      ).setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
