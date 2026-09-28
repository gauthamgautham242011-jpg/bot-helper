const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder
} = require("discord.js");

const GANG_SERVER_LAYOUT = [
  {
    name: "📌 INFORMATION",
    channels: [
      { name: "〢📢・ANNOUNCEMENT", type: ChannelType.GuildText },
      { name: "〢📜・RULES", type: ChannelType.GuildText },
      { name: "〢📖・GUIDE", type: ChannelType.GuildText },
      { name: "〢🔔・UPDATES", type: ChannelType.GuildText }
    ]
  },
  {
    name: "🩸 GANG",
    channels: [
      { name: "〢🥷・GANG-CHAT", type: ChannelType.GuildText },
      { name: "〢⚔️・WAR-CHAT", type: ChannelType.GuildText },
      { name: "〢🏆・WAR-RESULTS", type: ChannelType.GuildText },
      { name: "〢🎯・MISSIONS", type: ChannelType.GuildText },
      { name: "〢📊・RANK", type: ChannelType.GuildText },
      { name: "〢📈・PROMOTION-LOGS", type: ChannelType.GuildText }
    ]
  },
  {
    name: "🕵️ INTERROGATION",
    channels: [
      { name: "〢🕵️‍♂️・INTERROGATION-CHAT", type: ChannelType.GuildText },
      { name: "〢📋・INTERROGATION-LOGS", type: ChannelType.GuildText },
      { name: "〢🔴・INTERROGATION-ROOM", type: ChannelType.GuildText }
    ]
  },
  {
    name: "🎫 SUPPORT",
    channels: [
      { name: "〢🎫・TICKET", type: ChannelType.GuildText },
      { name: "〢📞・HELP", type: ChannelType.GuildText },
      { name: "〢💡・SUGGESTIONS", type: ChannelType.GuildText },
      { name: "〢🤝・PARTNERSHIP", type: ChannelType.GuildText }
    ]
  },
  {
    name: "🌎 COMMUNITY",
    channels: [
      { name: "〢🌎・PUBLIC-CHAT", type: ChannelType.GuildText },
      { name: "〢🇮🇳・INDIAN-CHAT", type: ChannelType.GuildText },
      { name: "〢🇵🇭・FILIPINO-CHAT", type: ChannelType.GuildText },
      { name: "〢📷・MEDIA", type: ChannelType.GuildText },
      { name: "〢🎮・GAMING", type: ChannelType.GuildText }
    ]
  },
  {
    name: "🎉 EVENTS",
    channels: [
      { name: "〢🎉・GIVEAWAY", type: ChannelType.GuildText },
      { name: "〢🏆・EVENTS", type: ChannelType.GuildText },
      { name: "〢🎁・REWARDS", type: ChannelType.GuildText }
    ]
  },
  {
    name: "🔒 STAFF",
    channels: [
      { name: "〢🔐・STAFF-CHAT", type: ChannelType.GuildText },
      { name: "〢📋・STAFF-LOGS", type: ChannelType.GuildText },
      { name: "〢👮・MOD-LOGS", type: ChannelType.GuildText },
      { name: "〢⚠️・WARNINGS", type: ChannelType.GuildText }
    ]
  },
  {
    name: "🔊 VOICE",
    channels: [
      { name: "〢🔊・LOBBY", type: ChannelType.GuildVoice },
      { name: "〢⚔️・WAR VC", type: ChannelType.GuildVoice },
      { name: "〢🎮・GAMING VC", type: ChannelType.GuildVoice },
      { name: "〢💤・AFK", type: ChannelType.GuildVoice }
    ]
  }
];

function findCategory(guild, name) {
  return guild.channels.cache.find(
    channel => channel.type === ChannelType.GuildCategory && channel.name === name
  );
}

function findChildChannel(guild, name, type, parentId) {
  return guild.channels.cache.find(
    channel =>
      channel.name === name &&
      channel.type === type &&
      (channel.parentId || null) === parentId
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("gangsetup")
    .setDescription("Load the Gang Discord server category and channel layout")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({
        content: "❌ This command can only be used in a server.",
        ephemeral: true
      });
      return;
    }

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
      await interaction.reply({
        content: "❌ You need **Manage Channels** permission to load the Gang server layout.",
        ephemeral: true
      });
      return;
    }

    const botMember = interaction.guild.members.me;
    if (!botMember?.permissions.has(PermissionFlagsBits.ManageChannels)) {
      await interaction.reply({
        content: "❌ I need the **Manage Channels** permission to create the Gang server layout.",
        ephemeral: true
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    let categoriesCreated = 0;
    let categoriesSkipped = 0;
    let channelsCreated = 0;
    let channelsSkipped = 0;
    const failed = [];

    try {
      await interaction.guild.channels.fetch();

      for (const categorySpec of GANG_SERVER_LAYOUT) {
        let category = findCategory(interaction.guild, categorySpec.name);
        if (category) {
          categoriesSkipped++;
        } else {
          try {
            category = await interaction.guild.channels.create({
              name: categorySpec.name,
              type: ChannelType.GuildCategory,
              reason: `Gang server layout loaded by ${interaction.user.tag}`
            });
            categoriesCreated++;
          } catch (error) {
            failed.push(`${categorySpec.name}: ${error.message}`);
            continue;
          }
        }

        for (const channelSpec of categorySpec.channels) {
          const existing = findChildChannel(
            interaction.guild,
            channelSpec.name,
            channelSpec.type,
            category.id
          );
          if (existing) {
            channelsSkipped++;
            continue;
          }

          try {
            await interaction.guild.channels.create({
              name: channelSpec.name,
              type: channelSpec.type,
              parent: category.id,
              reason: `Gang server layout loaded by ${interaction.user.tag}`
            });
            channelsCreated++;
          } catch (error) {
            failed.push(`${categorySpec.name} / ${channelSpec.name}: ${error.message}`);
          }
        }
      }

      const totalCategories = GANG_SERVER_LAYOUT.length;
      const totalChannels = GANG_SERVER_LAYOUT.reduce(
        (total, category) => total + category.channels.length,
        0
      );
      const failureText = failed.length
        ? `\n\n⚠️ Could not create ${failed.length} item(s):\n${failed
          .slice(0, 5)
          .map(item => `• ${item.slice(0, 180)}`)
          .join("\n")}`
        : "";

      const embed = new EmbedBuilder()
        .setTitle("✅ Gang server layout loaded")
        .setColor(failed.length ? 0xffa500 : 0x57f287)
        .setDescription(
          "Missing categories and channels were created. Existing matching items were kept unchanged."
        )
        .addFields(
          {
            name: "Categories",
            value: `Created: **${categoriesCreated}**\nAlready present: **${categoriesSkipped}** / ${totalCategories}`,
            inline: true
          },
          {
            name: "Channels",
            value: `Created: **${channelsCreated}**\nAlready present: **${channelsSkipped}** / ${totalChannels}`,
            inline: true
          }
        )
        .setFooter({ text: "No existing channels or categories were deleted or overwritten." })
        .setTimestamp();

      await interaction.editReply({
        embeds: [embed],
        content: failureText || undefined
      });
    } catch (error) {
      console.error("Failed to load Gang server layout:", error.message);
      await interaction.editReply(
        "❌ Could not load the Gang server layout. Check my **Manage Channels** permission and the server channel limit."
      );
    }
  }
};