const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const mongoose = require("mongoose");

function getWarn() {
  try { return require("../models/Warn"); } catch { return null; }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("warnings")
    .setDescription("View warnings for a user")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option.setName("user").setDescription("User to check").setRequired(true)
    ),

  async execute(interaction) {
    const dbReady = mongoose.connection.readyState === 1;
    if (!dbReady) {
      return interaction.reply({
        content: "❌ Database not connected. Add `MONGO_URI` to the `.env` file to enable warnings.",
        ephemeral: true
      });
    }

    const Warn = getWarn();
    const user = interaction.options.getUser("user");

    const warns = await Warn.find({
      guildId: interaction.guild.id,
      userId: user.id
    }).sort({ date: -1 });

    if (warns.length === 0) {
      return interaction.reply({
        content: `✅ ${user.tag} has no warnings.`,
        ephemeral: true
      });
    }

    const warnList = warns
      .slice(0, 10)
      .map((w, i) => {
        const date = new Date(w.date).toLocaleDateString();
        return `**#${i + 1}** — ${w.reason} *(${date})*`;
      })
      .join("\n");

    const embed = new EmbedBuilder()
      .setTitle(`⚠️ Warnings for ${user.tag}`)
      .setColor(0xffa500)
      .setDescription(warnList)
      .setFooter({ text: `Total: ${warns.length} warning(s)` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
