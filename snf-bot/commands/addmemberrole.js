const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("addmemberrole")
    .setDescription("Add a role to a server member")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addUserOption(option =>
      option.setName("user").setDescription("Member who should receive the role").setRequired(true)
    )
    .addRoleOption(option =>
      option.setName("role").setDescription("Role to add").setRequired(true)
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
      await interaction.reply({ content: "❌ I cannot manage this role because it is managed or higher than my role.", ephemeral: true });
      return;
    }

    if (member.roles.cache.has(role.id)) {
      await interaction.reply({ content: `❌ ${user.tag} already has ${role}.`, ephemeral: true });
      return;
    }

    try {
      await member.roles.add(role, `Role added by ${interaction.user.tag}`);
      const embed = new EmbedBuilder()
        .setTitle("✅ Member Role Added")
        .setColor(0x57f287)
        .addFields(
          { name: "Member", value: `${user.tag}`, inline: true },
          { name: "Role", value: `${role}`, inline: true },
          { name: "Moderator", value: interaction.user.tag, inline: true }
        )
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Failed to add member role:", error.message);
      await interaction.reply({ content: "❌ Failed to add the role. Check the bot role hierarchy and permissions.", ephemeral: true });
    }
  }
};