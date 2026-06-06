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

// ── Keep-alive HTTP server (prevents Replit from sleeping) ──────────────────
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
    GatewayIntentBits.MessageContent
  ]
});

client.commands = new Collection();

const commandFiles = fs
  .readdirSync("./commands")
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
}

require("./events/memberRoleWelcome")(client);

// ── Ready ───────────────────────────────────────────────────────────────────
client.once("ready", async () => {
  await connectDB();
  console.log(`✅ Logged in as ${client.user.tag}`);

  // Set bot activity status
  client.user.setPresence({
    activities: [{ name: "SNF Server | /help", type: 3 }],
    status: "online"
  });
});

// ── Interaction Handler ─────────────────────────────────────────────────────
client.on("interactionCreate", async (interaction) => {

  // Slash Commands
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(err);
      const msg = { content: "❌ An error occurred.", ephemeral: true };
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(msg);
      } else {
        await interaction.reply(msg);
      }
    }
    return;
  }

  // Button Interactions
  if (interaction.isButton()) {

    // ── Activity Check ──
    if (interaction.customId === "active") {
      await interaction.reply({
        content: "✅ You have been marked as active!",
        ephemeral: true
      });
      return;
    }

    // ── Create Ticket ──
    if (interaction.customId === "create_ticket") {
      try {
        const ticketName = `ticket-${interaction.user.username.toLowerCase().replace(/\s+/g, "-")}`;
        const existing = interaction.guild.channels.cache.find(
          (ch) => ch.name === ticketName
        );

        if (existing) {
          await interaction.reply({
            content: `❌ You already have an open ticket: ${existing}`,
            ephemeral: true
          });
          return;
        }

        const channel = await interaction.guild.channels.create({
          name: ticketName,
          type: ChannelType.GuildText,
          topic: `Support ticket for ${interaction.user.tag}`,
          permissionOverwrites: [
            {
              id: interaction.guild.id,
              deny: [PermissionFlagsBits.ViewChannel]
            },
            {
              id: interaction.user.id,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory
              ]
            }
          ]
        });

        const closeRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("close_ticket")
            .setLabel("🔒 Close Ticket")
            .setStyle(ButtonStyle.Danger)
        );

        const embed = new EmbedBuilder()
          .setTitle("🎫 Support Ticket")
          .setDescription(
            `Welcome ${interaction.user}!\n\nPlease describe your issue and a staff member will assist you shortly.`
          )
          .setColor(0x5865f2)
          .setTimestamp();

        await channel.send({ embeds: [embed], components: [closeRow] });

        await interaction.reply({
          content: `✅ Ticket created: ${channel}`,
          ephemeral: true
        });
      } catch (err) {
        console.error(err);
        await interaction.reply({
          content: "❌ Failed to create ticket. Make sure I have **Manage Channels** permission.",
          ephemeral: true
        });
      }
      return;
    }

    // ── Close Ticket ──
    if (interaction.customId === "close_ticket") {
      const embed = new EmbedBuilder()
        .setDescription("🔒 This ticket will be deleted in **5 seconds**.")
        .setColor(0xff0000);

      await interaction.reply({ embeds: [embed] });
      setTimeout(() => interaction.channel.delete().catch(console.error), 5000);
      return;
    }

    // ── Poll Vote ──
    if (interaction.customId.startsWith("poll_")) {
      const parts = interaction.customId.split("_");
      const optionIndex = parseInt(parts[1]);
      const emojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣"];

      await interaction.reply({
        content: `${emojis[optionIndex]} You voted for option **#${optionIndex + 1}**!`,
        ephemeral: true
      });
      return;
    }
  }
});

// ── Auto-reconnect on disconnect ────────────────────────────────────────────
client.on("error", (err) => console.error("❌ Discord error:", err.message));

client.login(process.env.TOKEN);
