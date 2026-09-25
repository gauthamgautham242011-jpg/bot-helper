const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const TEXT_CHANNEL_TYPES = [ChannelType.GuildText, ChannelType.GuildAnnouncement];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("applicationaccepted")
    .setDescription("Post a public application-accepted announcement")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("Member whose application was accepted")
        .setRequired(true)
    )
    .addChannelOption(option =>
      option
        .setName("channel")
        .setDescription("Channel where the announcement should be posted")
        .addChannelTypes(...TEXT_CHANNEL_TYPES)
        .setRequired(true)
    )
    .addChannelOption(option =>
      option
        .setName("chatchannel")
        .setDescription("Channel opened by the Chat button")
        .addChannelTypes(...TEXT_CHANNEL_TYPES)
        .setRequired(true)
    )
    .addChannelOption(option =>
      option
        .setName("infochannel")
        .setDescription("Optional channel for application/member information")
        .addChannelTypes(...TEXT_CHANNEL_TYPES)
        .setRequired(false)
    ),

  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({
        content: "❌ This command can only be used in a server.",
        ephemeral: true
      });
      return;
    }

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.reply({
        content: "❌ You need **Manage Server** permission to use this command.",
        ephemeral: true
      });
      return;
    }

    const user = interaction.options.getUser("user", true);
    const channel = interaction.options.getChannel("channel", true);
    const chatChannel = interaction.options.getChannel("chatchannel", true);
    const infoChannel = interaction.options.getChannel("infochannel");
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) {
      await interaction.reply({
        content: "❌ That user is not a member of this server.",
        ephemeral: true
      });
      return;
    }

    const botPermissions = channel.permissionsFor(interaction.guild.members.me);
    if (
      !botPermissions?.has(PermissionFlagsBits.ViewChannel) ||
      !botPermissions.has(PermissionFlagsBits.SendMessages) ||
      !botPermissions.has(PermissionFlagsBits.EmbedLinks)
    ) {
      await interaction.reply({
        content: `❌ I need **View Channel**, **Send Messages**, and **Embed Links** permissions in ${channel}.`,
        ephemeral: true
      });
      return;
    }

    const infoLine = infoChannel
      ? `Get all the information by asking another member in ${infoChannel}.`
      : "Ask another member for all the information.";

    const embed = new EmbedBuilder()
      .setTitle("Accepted")
      .setDescription(
        `${member} is now a **VOID SEVEN MEMBER.**\n` +
        `TEAM | EMH\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `*Sumali sa Roblox group namin. ${infoLine} Para sa tulong, i-ping ang Mod o mag-open ng ticket.*\n\n` +
        `*Join our Roblox group. ${infoLine} To get support, ping a Mod or open a ticket.*\n\n` +
        `Click the button to chat with other members.`
      )
      .setColor("#5865F2")
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Chat")
        .setStyle(ButtonStyle.Link)
        .setURL(`https://discord.com/channels/${interaction.guild.id}/${chatChannel.id}`)
    );

    try {
      await channel.send({
        embeds: [embed],
        components: [row],
        allowedMentions: { users: [user.id], parse: [] }
      });
      await interaction.reply({
        content: `✅ Acceptance announcement posted in ${channel}.`,
        ephemeral: true
      });
    } catch (error) {
      console.error("Failed to post application acceptance announcement:", error.message);
      await interaction.reply({
        content: "❌ Could not post the announcement. Check the channel permissions and try again.",
        ephemeral: true
      });
    }
  }
};