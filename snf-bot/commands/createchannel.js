const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder
} = require("discord.js");

const channelTypes = {
  text: ChannelType.GuildText,
  voice: ChannelType.GuildVoice,
  announcement: ChannelType.GuildAnnouncement,
  stage: ChannelType.GuildStageVoice,
  forum: ChannelType.GuildForum
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("createchannel")
    .setDescription("Create a new Discord channel")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addStringOption(option =>
      option
        .setName("name")
        .setDescription("The channel name")
        .setMinLength(1)
        .setMaxLength(100)
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("type")
        .setDescription("The type of channel to create")
        .setRequired(true)
        .addChoices(
          { name: "Text", value: "text" },
          { name: "Voice", value: "voice" },
          { name: "Announcement", value: "announcement" },
          { name: "Stage", value: "stage" },
          { name: "Forum", value: "forum" }
        )
    )
    .addChannelOption(option =>
      option
        .setName("category")
        .setDescription("Optional category for the new channel")
        .addChannelTypes(ChannelType.GuildCategory)
        .setRequired(false)
    ),

  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: "❌ This command can only be used in a server.", ephemeral: true });
      return;
    }

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
      await interaction.reply({ content: "❌ You need **Manage Channels** permission to use this command.", ephemeral: true });
      return;
    }

    const botMember = interaction.guild.members.me;
    if (!botMember?.permissions.has(PermissionFlagsBits.ManageChannels)) {
      await interaction.reply({ content: "❌ I need the **Manage Channels** permission to create channels.", ephemeral: true });
      return;
    }

    const name = interaction.options.getString("name", true).trim();
    const typeName = interaction.options.getString("type", true);
    const parent = interaction.options.getChannel("category");

    try {
      const channel = await interaction.guild.channels.create({
        name,
        type: channelTypes[typeName],
        parent: parent?.id,
        reason: `Channel created by ${interaction.user.tag}`
      });

      const embed = new EmbedBuilder()
        .setTitle("✅ Channel Created")
        .setColor(0x57f287)
        .addFields(
          { name: "Channel", value: `${channel}`, inline: true },
          { name: "Type", value: typeName, inline: true },
          { name: "Created by", value: interaction.user.tag, inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Failed to create channel:", error.message);
      await interaction.reply({
        content: "❌ Failed to create the channel. Check my **Manage Channels** permission and the selected category.",
        ephemeral: true
      });
    }
  }
};