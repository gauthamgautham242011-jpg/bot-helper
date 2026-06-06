const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("poll")
    .setDescription("Create a voting poll")
    .addStringOption((option) =>
      option.setName("question").setDescription("Poll question").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("option1").setDescription("First option").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("option2").setDescription("Second option").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("option3").setDescription("Third option (optional)").setRequired(false)
    )
    .addStringOption((option) =>
      option.setName("option4").setDescription("Fourth option (optional)").setRequired(false)
    ),

  async execute(interaction) {
    const question = interaction.options.getString("question");
    const options = [
      interaction.options.getString("option1"),
      interaction.options.getString("option2"),
      interaction.options.getString("option3"),
      interaction.options.getString("option4")
    ].filter(Boolean);

    const emojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣"];
    const colors = [ButtonStyle.Primary, ButtonStyle.Success, ButtonStyle.Danger, ButtonStyle.Secondary];

    const optionList = options.map((opt, i) => `${emojis[i]} **${opt}**`).join("\n");

    const embed = new EmbedBuilder()
      .setTitle(`📊 ${question}`)
      .setDescription(optionList)
      .setColor(0x5865f2)
      .setFooter({
        text: `Poll by ${interaction.user.tag} • Click to vote!`,
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

    const row = new ActionRowBuilder();
    options.forEach((opt, i) => {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`poll_${i}_${Date.now()}`)
          .setLabel(opt.length > 20 ? opt.substring(0, 17) + "..." : opt)
          .setEmoji(emojis[i])
          .setStyle(colors[i])
      );
    });

    await interaction.reply({ embeds: [embed], components: [row] });
  }
};
