require("dotenv").config();

const fs = require("fs");
const path = require("path");

const {
  Client,
  Collection,
  GatewayIntentBits,
  ChannelType
} = require("discord.js");

const connectDB = require("./db/connect");

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

client.once("ready", async () => {
  await connectDB();
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(err);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: "❌ An error occurred." });
      } else {
        await interaction.reply({
          content: "❌ An error occurred.",
          ephemeral: true
        });
      }
    }
    return;
  }

  if (interaction.isButton()) {
    if (interaction.customId === "active") {
      await interaction.reply({
        content: "✅ You have been marked as active!",
        ephemeral: true
      });
      return;
    }

    if (interaction.customId === "create_ticket") {
      try {
        const existing = interaction.guild.channels.cache.find(
          (ch) => ch.name === `ticket-${interaction.user.username.toLowerCase()}`
        );

        if (existing) {
          await interaction.reply({
            content: `❌ You already have an open ticket: ${existing}`,
            ephemeral: true
          });
          return;
        }

        const channel = await interaction.guild.channels.create({
          name: `ticket-${interaction.user.username}`,
          type: ChannelType.GuildText,
          topic: `Support ticket for ${interaction.user.tag}`
        });

        await channel.send(
          `🎫 Ticket opened by ${interaction.user}\n\nPlease describe your issue and a staff member will assist you shortly.`
        );

        await interaction.reply({
          content: `✅ Ticket created: ${channel}`,
          ephemeral: true
        });
      } catch (err) {
        console.error(err);
        await interaction.reply({
          content: "❌ Failed to create ticket.",
          ephemeral: true
        });
      }
      return;
    }

    if (interaction.customId === "close_ticket") {
      await interaction.reply({
        content: "🔒 Closing ticket in 5 seconds..."
      });
      setTimeout(() => interaction.channel.delete().catch(console.error), 5000);
      return;
    }
  }
});

client.login(process.env.TOKEN);
