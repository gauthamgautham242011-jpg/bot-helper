const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("acceptapplication")
    .setDescription("Accept an application and add the member role")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addUserOption(option =>
      option.setName("user").setDescription("Member whose application was accepted").setRequired(true)
    )
    .addRoleOption(option =>
      option.setName("memberrole").setDescription("Role to give the accepted member").setRequired(true)
    )
    .addChannelOption(option =>
      option
        .setName("chatchannel")
        .setDescription("Channel opened by the Chat button")
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(true)
    )
    .addChannelOption(option =>
      option
        .setName("infochannel")
        .setDescription("Optional channel mentioned in the member information")
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(false)
    ),

  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: "❌ This command can only be used in a server.", ephemeral: true });
      return;
    }

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageRoles)) {
      await interaction.reply({ content: "❌ You need **Manage Roles** permission to use this command.", ephemeral: true });
      return;
    }

    const user = interaction.options.getUser("user", true);
    const memberRole = interaction.options.getRole("memberrole", true);
    const chatChannel = interaction.options.getChannel("chatchannel", true);
    const infoChannel = interaction.options.getChannel("infochannel");
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    const botMember = interaction.guild.members.me;

    if (!member) {
      await interaction.reply({ content: "❌ That user is not a member of this server.", ephemeral: true });
      return;
    }

    if (!botMember?.permissions.has(PermissionFlagsBits.ManageRoles)) {
      await interaction.reply({ content: "❌ I need the **Manage Roles** permission.", ephemeral: true });
      return;
    }

    if (memberRole.managed || memberRole.position >= botMember.roles.highest.position) {
      await interaction.reply({
        content: "❌ I cannot manage this role because it is managed or higher than my highest role.",
        ephemeral: true
      });
      return;
    }

    const infoText = infoChannel
      ? `Get all the information by asking another member in ${infoChannel}.`
      : "Ask another member for the information.";

    const embed = new EmbedBuilder()
      .setColor("#ffffff")
      .setTitle("Accepted")
      .setDescription(
        `${member} is now a **VOID SEVEN MEMBER**.\n` +
        `TEAM | EMH\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `*Join our Roblox group. ${infoText} To get support Ping Mod Or Open Ticket*\n\n` +
        `Click the button to chat with other members`
      )
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Chat")
        .setStyle(ButtonStyle.Link)
        .setURL(`https://discord.com/channels/${interaction.guild.id}/${chatChannel.id}`)
    );

    try {
      await member.roles.add(memberRole, `Application accepted by ${interaction.user.tag}`);
      const dmSent = await member.send({ embeds: [embed], components: [row] })
        .then(() => true)
        .catch(() => false);

      await interaction.reply({
        content: `✅ ${user.tag} accepted and ${memberRole} added.${dmSent ? " Acceptance DM sent." : " Their DMs were closed."}`,
        ephemeral: true
      });
    } catch (error) {
      console.error("Failed to accept application:", error.message);
      await interaction.reply({
        content: "❌ Failed to accept the application. Check the bot role hierarchy and permissions.",
        ephemeral: true
      });
    }
  }
};