const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Show all bot commands"),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle("🤖 SNF BOT — Commands")
      .setColor(0x2b2d31)
      .addFields(
        {
          name: "🎮 General",
          value: "`/ping` — Check bot latency\n`/help` — Show this menu\n`/chatgpt` — Ask ChatGPT",
          inline: false
        },
        {
          name: "🛡️ Moderation",
          value:
            "`/warn` — Warn a user\n`/warnings` — View a user's warnings\n`/ban` — Ban a user\n`/applicationban` — Add Application Ban role and DM the user\n`/acceptapplication` — Accept an application and DM the member\n`/applicationaccepted` — Post a public accepted announcement\n`/kick` — Kick a user\n`/timeout` — Timeout a user\n`/untimeout` — Remove timeout\n`/purge` — Delete messages\n`/role add` — Add a role to a member\n`/addmemberrole` — Add a role (direct command)\n`/deleteallchannels` — Delete every channel (Administrator only)\n`/createchannel` — Create a Discord channel (Manage Channels)",
          inline: false
        },
        {
          name: "📋 Utility",
          value:
            "`/activitycheck` — Start an activity check\n`/ticketpanel` — Create support ticket panel\n`/v7applications` — Post Tagalog + English application status\n`/backup create` — Download bot data, roles, and channel setup\n`/backup restore` — Add missing data and setup from a backup\n`/sendmessage` — Send a message to a channel (Manage Server)\n`/senddm` — Send a private DM to a user (Manage Server)\n`/spam` — Send one controlled role notification (Manage Server)",
          inline: false
        }
      )
      .setFooter({ text: "SNF BOT • More commands coming soon..." })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
