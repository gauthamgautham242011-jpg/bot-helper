require("dotenv").config();

const fs = require("fs");
const http = require("http");

const {
  Client,
  Collection,
  GatewayIntentBits,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const connectDB = require("./db/connect");
const giveaways = require("./db/giveaways");

// ── Keep-alive HTTP server ──────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200);
  res.end("SNF BOT is online ✅");
}).listen(PORT, () => console.log(`🌐 Keep-alive server on port ${PORT}`));

// ── Discord Client ──────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.MessageContent
  ]
});

client.commands = new Collection();

// ── Load Commands ───────────────────────────────────────────────────────────
const commandFiles = fs.readdirSync("./commands").filter(f => f.endsWith(".js"));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
}

// ── Load Events ─────────────────────────────────────────────────────────────
require("./events/memberRoleWelcome")(client);
require("./events/antiNuke")(client);
require("./events/antiSpam")(client);
require("./events/modLog")(client);

// ── Ready ───────────────────────────────────────────────────────────────────
client.once("ready", async () => {
  await connectDB();
  console.log(`✅ Logged in as ${client.user.tag}`);

  client.user.setPresence({
    activities: [{ name: "SNF Server | /help", type: 3 }],
    status: "online"
  });

  // Restore active giveaway timers
  const all = giveaways.getAll();
  let restored = 0;
  for (const [msgId, data] of Object.entries(all)) {
    if (data.ended) continue;
    const remaining = data.endTime - Date.now();
    if (remaining <= 0) {
      const { endGiveaway } = require("./commands/giveaway");
      await endGiveaway(client, msgId, data.channelId, data.guildId);
    } else {
      const { endGiveaway } = require("./commands/giveaway");
      setTimeout(() => endGiveaway(client, msgId, data.channelId, data.guildId), remaining);
      restored++;
    }
  }
  if (restored > 0) console.log(`🎉 Restored ${restored} active giveaway(s)`);
});

// ── Interaction Handler ─────────────────────────────────────────────────────
client.on("interactionCreate", async (interaction) => {

  // ── Slash Commands ──
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(err);
      const msg = { content: "❌ An error occurred.", ephemeral: true };
      if (interaction.deferred || interaction.replied) await interaction.editReply(msg);
      else await interaction.reply(msg);
    }
    return;
  }

  // ── Buttons ──
  if (interaction.isButton()) {

    // Activity Check
    if (interaction.customId === "active") {
      await interaction.reply({ content: "✅ You have been marked as active!", ephemeral: true });
      return;
    }

    // Create Ticket
    if (interaction.customId === "create_ticket") {
      try {
        const ticketName = `ticket-${interaction.user.username.toLowerCase().replace(/\s+/g, "-")}`;
        const existing = interaction.guild.channels.cache.find(ch => ch.name === ticketName);
        if (existing) {
          await interaction.reply({ content: `❌ You already have an open ticket: ${existing}`, ephemeral: true });
          return;
        }
        const channel = await interaction.guild.channels.create({
          name: ticketName,
          type: ChannelType.GuildText,
          topic: `Support ticket for ${interaction.user.tag}`,
          permissionOverwrites: [
            { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
          ]
        });
        const closeRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("close_ticket").setLabel("🔒 Close Ticket").setStyle(ButtonStyle.Danger)
        );
        const embed = new EmbedBuilder()
          .setTitle("🎫 Support Ticket")
          .setDescription(`Welcome ${interaction.user}!\n\nPlease describe your issue and a staff member will assist you shortly.`)
          .setColor(0x5865f2).setTimestamp();
        await channel.send({ embeds: [embed], components: [closeRow] });
        await interaction.reply({ content: `✅ Ticket created: ${channel}`, ephemeral: true });
      } catch (err) {
        console.error(err);
        await interaction.reply({ content: "❌ Failed to create ticket. Check my **Manage Channels** permission.", ephemeral: true });
      }
      return;
    }

    // Close Ticket
    if (interaction.customId === "close_ticket") {
      const embed = new EmbedBuilder().setDescription("🔒 This ticket will be deleted in **5 seconds**.").setColor(0xff0000);
      await interaction.reply({ embeds: [embed] });
      setTimeout(() => interaction.channel.delete().catch(console.error), 5000);
      return;
    }

    // Poll Vote
    if (interaction.customId.startsWith("poll_")) {
      const optionIndex = parseInt(interaction.customId.split("_")[1]);
      const emojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣"];
      await interaction.reply({ content: `${emojis[optionIndex]} You voted for option **#${optionIndex + 1}**!`, ephemeral: true });
      return;
    }

    // Giveaway Enter
    if (interaction.customId === "giveaway_enter") {
      const msgId = interaction.message.id;
      const data = giveaways.get(msgId);
      if (!data || data.ended) {
        await interaction.reply({ content: "❌ This giveaway has ended.", ephemeral: true });
        return;
      }
      const added = giveaways.addEntry(msgId, interaction.user.id);
      if (!added) {
        await interaction.reply({ content: "✅ You already entered this giveaway!", ephemeral: true });
        return;
      }
      const updated = giveaways.get(msgId);
      const count = (updated.entries || []).length;
      // Update footer with entry count
      const oldEmbed = interaction.message.embeds[0];
      const newEmbed = EmbedBuilder.from(oldEmbed).setFooter({ text: `Hosted by someone • ${count} entr${count === 1 ? "y" : "ies"}` });
      await interaction.message.edit({ embeds: [newEmbed] }).catch(() => {});
      await interaction.reply({ content: "🎉 You have entered the giveaway! Good luck!", ephemeral: true });
      return;
    }

    // Giveaway Reroll
    if (interaction.customId.startsWith("giveaway_reroll_")) {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.reply({ content: "❌ You need **Manage Server** permission to reroll.", ephemeral: true });
        return;
      }
      const msgId = interaction.customId.replace("giveaway_reroll_", "");
      const data = giveaways.get(msgId);
      if (!data || !data.entries?.length) {
        await interaction.reply({ content: "❌ No entries found.", ephemeral: true });
        return;
      }
      const winnerId = data.entries[Math.floor(Math.random() * data.entries.length)];
      giveaways.update(msgId, { winner: winnerId });
      await interaction.reply({ content: `🔄 Rerolled! New winner: <@${winnerId}>! Congratulations!` });
      return;
    }
  }
});

// ── Error handling ──────────────────────────────────────────────────────────
client.on("error", err => console.error("❌ Discord error:", err.message));
process.on("unhandledRejection", err => console.error("❌ Unhandled rejection:", err?.message));

client.login(process.env.TOKEN);
