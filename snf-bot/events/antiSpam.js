const { EmbedBuilder } = require("discord.js");
const config = require("../db/config");

const spamTracker = new Map();
const LIMIT = 6;
const WINDOW = 5000;
const MUTE_DURATION = 60 * 1000;

module.exports = (client) => {
  client.on("messageCreate", async (message) => {
    if (!message.guild) return;
    if (message.author.bot) return;
    if (!config.get(message.guild.id, "antiSpam")) return;

    const member = message.guild.members.cache.get(message.author.id);
    if (!member) return;
    if (member.permissions.has("ManageMessages")) return;

    const key = `${message.guild.id}_${message.author.id}`;
    const now = Date.now();

    if (!spamTracker.has(key)) spamTracker.set(key, []);
    const msgs = spamTracker.get(key).filter(t => now - t < WINDOW);
    msgs.push(now);
    spamTracker.set(key, msgs);

    if (msgs.length >= LIMIT) {
      spamTracker.delete(key);

      try {
        await member.timeout(MUTE_DURATION, "Auto: Spam detected");

        const embed = new EmbedBuilder()
          .setTitle("🚫 Anti-Spam")
          .setDescription(`${message.author} has been timed out for **1 minute** for spamming.`)
          .setColor(0xff6600)
          .setTimestamp();

        await message.channel.send({ embeds: [embed] });
      } catch {}
    }
  });
};
