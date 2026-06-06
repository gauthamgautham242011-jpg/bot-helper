const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const warnings = require("../db/warnings");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("warnings")
    .setDescription("View warnings for a user")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option.setName("user").setDescription("User to check").setRequired(true)
    ),

  async execute(interaction) {
    const user = interaction.options.getUser("user");
    const warns = warnings.getWarns(interaction.guild.id, user.id);

    if (warns.length === 0) {
      return interaction.reply({
        content: `✅ **${user.tag}** ki koi warnings nahi hain.`,
        ephemeral: true
      });
    }

    const warnList = warns
      .slice(-10)
      .reverse()
      .map((w, i) => {
        const date = new Date(w.date).toLocaleDateString("en-IN");
        return `**#${i + 1}** — ${w.reason} *(${date})*`;
      })
      .join("\n");

    const embed = new EmbedBuilder()
      .setTitle(`⚠️ ${user.tag} ki Warnings`)
      .setColor(0xffa500)
      .setDescription(warnList)
      .setFooter({ text: `Total: ${warns.length} warning(s)` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
