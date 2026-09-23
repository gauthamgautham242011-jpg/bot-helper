const path = require("path");
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder
} = require("discord.js");

const APPLICATION_IMAGE = path.join(
  __dirname,
  "..",
  "attached_assets",
  "Screenshot_2026-09-23-12-59-55-31_572064f74bd5f9fa804b05334aa4_1790148818957.jpg"
);

module.exports = {
  data: new SlashCommandBuilder()
    .setName("v7applications")
    .setDescription("Post the V7 Applications status embed")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(option =>
      option
        .setName("status")
        .setDescription("Current application status")
        .addChoices(
          { name: "Closed", value: "closed" },
          { name: "Open", value: "open" }
        )
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName("requirements")
        .setDescription("Optional Requirements button URL")
        .setRequired(false)
    ),

  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: "❌ This command can only be used in a server.", ephemeral: true });
      return;
    }

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.reply({ content: "❌ You need **Manage Server** permission to use this command.", ephemeral: true });
      return;
    }

    const status = interaction.options.getString("status") || "closed";
    const requirementsUrl = interaction.options.getString("requirements");
    const isOpen = status === "open";
    const imageAttachment = !isOpen
      ? new AttachmentBuilder(APPLICATION_IMAGE, { name: "v7-applications.jpg" })
      : null;

    const embed = new EmbedBuilder()
      .setTitle("V7 APPLICATIONS")
      .setColor(isOpen ? 0x57f287 : 0xed4245)
      .setDescription(
        isOpen
          ? [
              "🇵🇭 **Bukas na ang applications!**",
              "Maaari ka nang mag-apply para maging bahagi ng **Void Seven**.",
              "",
              "🇬🇧 **The applications are currently open!**",
              "You can now apply to become part of **Void Seven**.",
              "",
              "Basahin muna ang requirements bago mag-apply."
            ].join("\n")
          : [
              "🇵🇭 **Kasalukuyang sarado ang applications.**",
              "Pakihintay ang susunod na application opening.",
              "",
              "🇬🇧 **The applications are currently closed.**",
              "Please wait for the next application opening."
            ].join("\n")
      )
      .setFooter({ text: "V7 System | Void Seven" })
      .setTimestamp();

    if (imageAttachment) {
      embed.setImage("attachment://v7-applications.jpg");
    }

    const components = [];
    if (requirementsUrl) {
      try {
        new URL(requirementsUrl);
        components.push(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setLabel("Requirements / Mga Requirement")
              .setStyle(ButtonStyle.Link)
              .setURL(requirementsUrl)
          )
        );
      } catch {
        await interaction.reply({
          content: "❌ The Requirements URL is not valid.",
          ephemeral: true
        });
        return;
      }
    }

    try {
      await interaction.reply({
        embeds: [embed],
        files: imageAttachment ? [imageAttachment] : [],
        components: components,
        allowedMentions: { parse: [] }
      });
    } catch (error) {
      console.error("Failed to post V7 Applications embed:", error.message);
      await interaction.reply({
        content: "❌ Failed to post the applications embed. Check my channel permissions.",
        ephemeral: true
      });
    }
  }
};