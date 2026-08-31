const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("applicationban")
    .setDescription("Add the Application Ban role to a member")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addUserOption(option =>
      option.setName("user").setDescription("Member to application-ban").setRequired(true)
    )
    .addRoleOption(option =>
      option.setName("role").setDescription("Application Ban role").setRequired(true)
    )
    .addStringOption(option =>
      option.setName("reason").setDescription("Reason for application ban").setRequired(false)
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
    const role = interaction.options.getRole("role", true);
    const reason = interaction.options.getString("reason") || "No reason provided";
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

    if (role.managed || role.position >= botMember.roles.highest.position) {
      await interaction.reply({
        content: "❌ I cannot manage this role because it is managed or higher than my highest role.",
        ephemeral: true
      });
      return;
    }

    if (member.roles.cache.has(role.id)) {
      await interaction.reply({ content: `❌ ${user.tag} already has the Application Ban role.`, ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor("#ff0000")
      .setDescription(
        `You have been given the ${role} role.\n` +
        `You are not able to join **${interaction.guild.name}** until you are unbanned from the application.`
      )
      .setFooter({ text: "Void Seven System | Added by Fistygamerz" })
      .setTimestamp();

    try {
      await member.roles.add(role, reason);
      await member.send({ embeds: [embed] }).catch(() => {});

      await interaction.reply({
        content: `✅ Application Ban role added to ${user.tag}. DM notification sent if their DMs were open.`,
        ephemeral: true
      });
    } catch (error) {
      console.error("Failed to add Application Ban role:", error.message);
      await interaction.reply({
        content: "❌ Failed to add the Application Ban role. Check the bot role hierarchy and permissions.",
        ephemeral: true
      });
    }
  }
};