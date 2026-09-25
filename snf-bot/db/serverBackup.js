const { ChannelType, PermissionFlagsBits } = require("discord.js");
const { getGuildData, restoreGuildData } = require("./backupData");

const SUPPORTED_CHANNEL_TYPES = new Set([
  ChannelType.GuildCategory,
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement,
  ChannelType.GuildVoice,
  ChannelType.GuildStageVoice,
  ChannelType.GuildForum,
  ChannelType.GuildMedia
]);

function serializeChannel(channel) {
  const saved = {
    id: channel.id,
    name: channel.name,
    type: channel.type,
    parentId: channel.parentId || null,
    position: channel.rawPosition,
    permissionOverwrites: channel.permissionOverwrites.cache.map(overwrite => ({
      id: overwrite.id,
      type: overwrite.type,
      allow: overwrite.allow.bitfield.toString(),
      deny: overwrite.deny.bitfield.toString()
    }))
  };

  if ("topic" in channel) saved.topic = channel.topic || null;
  if ("nsfw" in channel) saved.nsfw = Boolean(channel.nsfw);
  if ("rateLimitPerUser" in channel) saved.rateLimitPerUser = channel.rateLimitPerUser || 0;
  if ("bitrate" in channel) saved.bitrate = channel.bitrate;
  if ("userLimit" in channel) saved.userLimit = channel.userLimit;
  if ("rtcRegion" in channel) saved.rtcRegion = channel.rtcRegion || null;
  if ("videoQualityMode" in channel) saved.videoQualityMode = channel.videoQualityMode;
  if ("defaultAutoArchiveDuration" in channel) {
    saved.defaultAutoArchiveDuration = channel.defaultAutoArchiveDuration;
  }
  if ("defaultThreadRateLimitPerUser" in channel) {
    saved.defaultThreadRateLimitPerUser = channel.defaultThreadRateLimitPerUser || 0;
  }
  return saved;
}

async function createBackup(guild) {
  await guild.roles.fetch();
  await guild.channels.fetch();

  return {
    format: "snf-bot-guild-backup",
    version: 1,
    createdAt: new Date().toISOString(),
    guild: { id: guild.id, name: guild.name },
    botData: getGuildData(guild.id),
    roles: guild.roles.cache
      .filter(role => role.id !== guild.id && !role.managed)
      .map(role => ({
        id: role.id,
        name: role.name,
        color: role.color,
        hoist: role.hoist,
        mentionable: role.mentionable,
        permissions: role.permissions.bitfield.toString()
      })),
    channels: guild.channels.cache
      .filter(channel => SUPPORTED_CHANNEL_TYPES.has(channel.type))
      .map(serializeChannel)
  };
}

function validateBackup(data, guildId) {
  if (
    !data ||
    data.format !== "snf-bot-guild-backup" ||
    data.version !== 1 ||
    !data.guild ||
    data.guild.id !== guildId ||
    !Array.isArray(data.roles) ||
    !Array.isArray(data.channels) ||
    !data.botData ||
    typeof data.botData !== "object" ||
    !data.botData.settings ||
    typeof data.botData.settings !== "object" ||
    Array.isArray(data.botData.settings) ||
    !data.botData.warnings ||
    typeof data.botData.warnings !== "object" ||
    Array.isArray(data.botData.warnings) ||
    !data.botData.giveaways ||
    typeof data.botData.giveaways !== "object" ||
    Array.isArray(data.botData.giveaways) ||
    data.roles.length > 250 ||
    data.channels.length > 500
  ) {
    throw new Error("This is not a valid backup for this server.");
  }

  for (const role of data.roles) {
    if (
      !role ||
      typeof role.id !== "string" ||
      typeof role.name !== "string" ||
      role.name.length < 1 ||
      role.name.length > 100 ||
      typeof role.permissions !== "string"
    ) {
      throw new Error("The backup contains an invalid role record.");
    }
    try {
      if (BigInt(role.permissions) < 0n) throw new Error();
    } catch {
      throw new Error("The backup contains invalid role permissions.");
    }
  }

  for (const channel of data.channels) {
    if (
      !channel ||
      typeof channel.id !== "string" ||
      typeof channel.name !== "string" ||
      channel.name.length < 1 ||
      channel.name.length > 100 ||
      !SUPPORTED_CHANNEL_TYPES.has(channel.type) ||
      !Array.isArray(channel.permissionOverwrites) ||
      (channel.parentId !== null && channel.parentId !== undefined && typeof channel.parentId !== "string")
    ) {
      throw new Error("The backup contains an invalid channel record.");
    }
    for (const overwrite of channel.permissionOverwrites) {
      if (
        !overwrite ||
        typeof overwrite.id !== "string" ||
        ![0, 1].includes(overwrite.type) ||
        typeof overwrite.allow !== "string" ||
        typeof overwrite.deny !== "string"
      ) {
        throw new Error("The backup contains an invalid permission overwrite.");
      }
      try {
        if (BigInt(overwrite.allow) < 0n || BigInt(overwrite.deny) < 0n) throw new Error();
      } catch {
        throw new Error("The backup contains invalid permission values.");
      }
    }
  }
}

function findMatchingRole(guild, savedRole) {
  return guild.roles.cache.get(savedRole.id) ||
    guild.roles.cache.find(role => role.name === savedRole.name) ||
    null;
}

async function restoreStructure(guild, backup) {
  const roleIdMap = new Map([[guild.id, guild.id]]);
  const channelIdMap = new Map();
  let rolesCreated = 0;
  let rolesSkipped = 0;
  let channelsCreated = 0;
  let channelsSkipped = 0;

  await guild.roles.fetch();
  await guild.channels.fetch();

  for (const savedRole of backup.roles) {
    const existing = findMatchingRole(guild, savedRole);
    if (existing) {
      roleIdMap.set(savedRole.id, existing.id);
      rolesSkipped++;
      continue;
    }

    try {
      const role = await guild.roles.create({
        name: savedRole.name,
        color: savedRole.color,
        hoist: Boolean(savedRole.hoist),
        mentionable: Boolean(savedRole.mentionable),
        permissions: BigInt(savedRole.permissions),
        reason: "Restoring an administrator-provided SNF backup"
      });
      roleIdMap.set(savedRole.id, role.id);
      rolesCreated++;
    } catch (error) {
      console.error(`Could not restore role "${savedRole.name}":`, error.message);
      rolesSkipped++;
    }
  }

  const savedChannels = [...backup.channels].sort((a, b) => {
    const aCategory = a.type === ChannelType.GuildCategory ? 0 : 1;
    const bCategory = b.type === ChannelType.GuildCategory ? 0 : 1;
    return aCategory - bCategory || (a.position || 0) - (b.position || 0);
  });

  for (const savedChannel of savedChannels) {
    const mappedParentId = savedChannel.parentId
      ? channelIdMap.get(savedChannel.parentId) || savedChannel.parentId
      : null;
    const existing = guild.channels.cache.find(channel =>
      channel.type === savedChannel.type &&
      channel.name === savedChannel.name &&
      (channel.parentId || null) === mappedParentId
    );

    if (existing) {
      channelIdMap.set(savedChannel.id, existing.id);
      channelsSkipped++;
      continue;
    }

    const permissionOverwrites = [];
    for (const overwrite of savedChannel.permissionOverwrites) {
      let targetId = overwrite.id;
      if (overwrite.type === 0) {
        targetId = roleIdMap.get(overwrite.id) || guild.roles.cache.get(overwrite.id)?.id;
        if (!targetId) continue;
      }
      permissionOverwrites.push({
        id: targetId,
        type: overwrite.type,
        allow: BigInt(overwrite.allow),
        deny: BigInt(overwrite.deny)
      });
    }

    const options = {
      name: savedChannel.name,
      type: savedChannel.type,
      reason: "Restoring an administrator-provided SNF backup"
    };
    if (mappedParentId) options.parent = mappedParentId;
    if (permissionOverwrites.length) options.permissionOverwrites = permissionOverwrites;
    if ([ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(savedChannel.type)) {
      if (savedChannel.topic) options.topic = savedChannel.topic;
      if (savedChannel.nsfw !== undefined) options.nsfw = savedChannel.nsfw;
      if (savedChannel.rateLimitPerUser !== undefined) options.rateLimitPerUser = savedChannel.rateLimitPerUser;
      if (savedChannel.defaultAutoArchiveDuration) {
        options.defaultAutoArchiveDuration = savedChannel.defaultAutoArchiveDuration;
      }
    } else if ([ChannelType.GuildVoice, ChannelType.GuildStageVoice].includes(savedChannel.type)) {
      if (savedChannel.bitrate) options.bitrate = savedChannel.bitrate;
      if (savedChannel.userLimit !== undefined) options.userLimit = savedChannel.userLimit;
      if (savedChannel.rtcRegion !== undefined) options.rtcRegion = savedChannel.rtcRegion;
      if (savedChannel.videoQualityMode !== undefined) options.videoQualityMode = savedChannel.videoQualityMode;
    } else if ([ChannelType.GuildForum, ChannelType.GuildMedia].includes(savedChannel.type)) {
      if (savedChannel.topic) options.topic = savedChannel.topic;
      if (savedChannel.nsfw !== undefined) options.nsfw = savedChannel.nsfw;
      if (savedChannel.rateLimitPerUser !== undefined) options.rateLimitPerUser = savedChannel.rateLimitPerUser;
      if (savedChannel.defaultAutoArchiveDuration) {
        options.defaultAutoArchiveDuration = savedChannel.defaultAutoArchiveDuration;
      }
      if (savedChannel.defaultThreadRateLimitPerUser !== undefined) {
        options.defaultThreadRateLimitPerUser = savedChannel.defaultThreadRateLimitPerUser;
      }
    }

    try {
      const channel = await guild.channels.create(options);
      channelIdMap.set(savedChannel.id, channel.id);
      channelsCreated++;
    } catch (error) {
      console.error(`Could not restore channel "${savedChannel.name}":`, error.message);
      channelsSkipped++;
    }
  }

  return { roleIdMap, channelIdMap, rolesCreated, rolesSkipped, channelsCreated, channelsSkipped };
}

async function restoreBackup(guild, backup) {
  validateBackup(backup, guild.id);
  const structure = await restoreStructure(guild, backup);
  const botData = restoreGuildData(guild.id, backup.botData, {
    roles: structure.roleIdMap,
    channels: structure.channelIdMap
  });

  return { ...structure, ...botData };
}

function botCanRestore(guild) {
  const member = guild.members.me;
  return Boolean(
    member?.permissions.has(PermissionFlagsBits.ManageRoles) &&
    member.permissions.has(PermissionFlagsBits.ManageChannels)
  );
}

module.exports = { createBackup, restoreBackup, validateBackup, botCanRestore };