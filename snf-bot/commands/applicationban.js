const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const banCommand = require("./ban");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("applicationban")
    .setDescription("Ban a user from the server")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(option =>
      option.setName("user").setDescription("User to ban").setRequired(true)
    )
    .addStringOption(option =>
      option.setName("reason").setDescription("Reason for ban").setRequired(false)
    )
    .addIntegerOption(option =>
      option
        .setName("days")
        .setDescription("Days of messages to delete (0-7)")
        .setMinValue(0)
        .setMaxValue(7)
        .setRequired(false)
    ),

  async execute(interaction) {
    return banCommand.execute(interaction);
  }
};