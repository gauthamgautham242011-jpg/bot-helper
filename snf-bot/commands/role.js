const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("role")
    .setDescription("Add or remove a role from a user")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand(sub =>
      sub.setName("add").setDescription("Add a role to a user")
        .addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
        .addRoleOption(o => o.setName("role").setDescription("Role to add").setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName("remove").setDescription("Remove a role from a user")
        .addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
        .addRoleOption(o => o.setName("role").setDescription("Role to remove").setRequired(true))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const user = interaction.options.getUser("user");
    const role = interaction.options.getRole("role");
    const member = interaction.guild.members.cache.get(user.id);

    if (!member) return interaction.reply({ content: "❌ Member not found.", ephemeral: true });

    const botMember = interaction.guild.members.me;
    if (role.position >= botMember.roles.highest.position) {
      return interaction.reply({ content: "❌ I can't manage this role (it's higher than mine).", ephemeral: true });
    }

    try {
      if (sub === "add") {
        if (member.roles.cache.has(role.id)) {
          return interaction.reply({ content: `❌ ${user.tag} already has this role.`, ephemeral: true });
        }
        await member.roles.add(role);
      } else {
        if (!member.roles.cache.has(role.id)) {
          return interaction.reply({ content: `❌ ${user.tag} doesn't have this role.`, ephemeral: true });
        }
        await member.roles.remove(role);
      }

      const embed = new EmbedBuilder()
        .setColor(sub === "add" ? 0x00ff00 : 0xff6600)
        .setTitle(sub === "add" ? "✅ Role Added" : "❌ Role Removed")
        .addFields(
          { name: "User", value: `${user.tag}`, inline: true },
          { name: "Role", value: `${role}`, inline: true },
          { name: "Moderator", value: `${interaction.user.tag}`, inline: true }
        ).setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      await interaction.reply({ content: `❌ Failed: ${err.message}`, ephemeral: true });
    }
  }
};
