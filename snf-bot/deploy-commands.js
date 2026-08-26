require("dotenv").config();

const { Client, REST, Routes } = require("discord.js");
const fs = require("fs");

const commands = [];
const commandFiles = fs
  .readdirSync("./commands")
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  commands.push(command.data.toJSON());
}

const client = new Client({ intents: [] });
const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

client.once("ready", async () => {
  try {
    const applicationId = client.application.id;
    const configuredClientId = process.env.CLIENT_ID;
    const guildId = process.env.GUILD_ID;

    if (configuredClientId && configuredClientId !== applicationId) {
      console.warn("⚠️ CLIENT_ID did not match the application linked to TOKEN. Using the live application ID.");
    }

    const route = guildId
      ? Routes.applicationGuildCommands(applicationId, guildId)
      : Routes.applicationCommands(applicationId);

    console.log(`🔄 Deploying ${commands.length} slash commands...`);
    await rest.put(route, { body: commands });
    console.log(guildId
      ? "✅ Guild slash commands deployed successfully!"
      : "✅ Global slash commands deployed successfully!");
  } catch (err) {
    console.error("❌ Failed to deploy slash commands:", err.message);
    process.exitCode = 1;
  } finally {
    client.destroy();
  }
});

client.login(process.env.TOKEN).catch(err => {
  console.error("❌ Discord login failed while deploying commands:", err.message);
  process.exitCode = 1;
});
