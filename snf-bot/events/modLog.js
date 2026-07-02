const { EmbedBuilder, AuditLogEvent } = require("discord.js");
const config = require("../db/config");

function getLog(guild) {
  const id = config.get(guild.id, "logChannel");
  if (!id) return null;
  return guild.channels.cache.get(id) || null;
}

module.exports = (client) => {
  client.on("guildMemberAdd", (member) => {
    if (member.user.bot) return;
    const ch = getLog(member.guild);
    if (!ch) return;
    const embed = new EmbedBuilder()
      .setTitle("📥 Member Joined")
      .setThumbnail(member.user.displayAvatarURL())
      .setColor(0x00ff00)
      .addFields(
        { name: "User", value: `${member.user.tag} (${member.id})`, inline: true },
        { name: "Account Created", value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true }
      )
      .setTimestamp();
    ch.send({ embeds: [embed] }).catch(() => {});
  });

  client.on("guildMemberRemove", (member) => {
    if (member.user.bot) return;
    const ch = getLog(member.guild);
    if (!ch) return;
    const embed = new EmbedBuilder()
      .setTitle("📤 Member Left")
      .setThumbnail(member.user.displayAvatarURL())
      .setColor(0xff0000)
      .addFields(
        { name: "User", value: `${member.user.tag} (${member.id})`, inline: true },
        { name: "Joined", value: member.joinedAt ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : "Unknown", inline: true }
      )
      .setTimestamp();
    ch.send({ embeds: [embed] }).catch(() => {});
  });

  client.on("messageDelete", async (message) => {
    if (!message.guild || message.author?.bot) return;
    const ch = getLog(message.guild);
    if (!ch) return;
    const embed = new EmbedBuilder()
      .setTitle("🗑️ Message Deleted")
      .setColor(0xff6600)
      .addFields(
        { name: "Author", value: `${message.author?.tag || "Unknown"} (${message.author?.id || "?"})`, inline: true },
        { name: "Channel", value: `${message.channel}`, inline: true },
        { name: "Content", value: message.content?.substring(0, 1024) || "*No content*", inline: false }
      )
      .setTimestamp();
    ch.send({ embeds: [embed] }).catch(() => {});
  });

  client.on("messageUpdate", async (oldMsg, newMsg) => {
    if (!newMsg.guild || newMsg.author?.bot) return;
    if (oldMsg.content === newMsg.content) return;
    const ch = getLog(newMsg.guild);
    if (!ch) return;
    const embed = new EmbedBuilder()
      .setTitle("✏️ Message Edited")
      .setColor(0xffcc00)
      .addFields(
        { name: "Author", value: `${newMsg.author?.tag} (${newMsg.author?.id})`, inline: true },
        { name: "Channel", value: `${newMsg.channel}`, inline: true },
        { name: "Before", value: oldMsg.content?.substring(0, 512) || "*Empty*", inline: false },
        { name: "After", value: newMsg.content?.substring(0, 512) || "*Empty*", inline: false }
      )
      .setTimestamp();
    ch.send({ embeds: [embed] }).catch(() => {});
  });

  client.on("guildBanAdd", async (ban) => {
    const ch = getLog(ban.guild);
    if (!ch) return;
    const embed = new EmbedBuilder()
      .setTitle("🔨 Member Banned")
      .setColor(0xff0000)
      .addFields(
        { name: "User", value: `${ban.user.tag} (${ban.user.id})`, inline: true },
        { name: "Reason", value: ban.reason || "No reason provided", inline: true }
      )
      .setTimestamp();
    ch.send({ embeds: [embed] }).catch(() => {});
  });

  client.on("guildBanRemove", async (ban) => {
    const ch = getLog(ban.guild);
    if (!ch) return;
    const embed = new EmbedBuilder()
      .setTitle("✅ Member Unbanned")
      .setColor(0x00ff00)
      .addFields({ name: "User", value: `${ban.user.tag} (${ban.user.id})`, inline: true })
      .setTimestamp();
    ch.send({ embeds: [embed] }).catch(() => {});
  });
};
