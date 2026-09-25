const fs = require("fs");
const path = require("path");

const DATA_DIR = __dirname;

function readJsonFile(filename) {
  const fullPath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(fullPath)) return {};
  const parsed = JSON.parse(fs.readFileSync(fullPath, "utf8"));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${filename} must contain a JSON object`);
  }
  return parsed;
}

function writeJsonFile(filename, value) {
  const fullPath = path.join(DATA_DIR, filename);
  const tempPath = `${fullPath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(value, null, 2));
  fs.renameSync(tempPath, fullPath);
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function getGuildData(guildId) {
  const configs = readJsonFile("server_config.json");
  const allWarnings = readJsonFile("warnings_data.json");
  const allGiveaways = readJsonFile("giveaways_data.json");
  const prefix = `${guildId}_`;
  const warnings = {};
  const giveaways = {};

  for (const [key, value] of Object.entries(allWarnings)) {
    if (key.startsWith(prefix)) warnings[key.slice(prefix.length)] = value;
  }

  for (const [messageId, value] of Object.entries(allGiveaways)) {
    if (value?.guildId === guildId) giveaways[messageId] = value;
  }

  return {
    settings: configs[guildId] || {},
    warnings,
    giveaways
  };
}

function restoreGuildData(guildId, backupData, idMaps = {}) {
  if (!isObject(backupData) || !isObject(backupData.settings) ||
      !isObject(backupData.warnings) || !isObject(backupData.giveaways)) {
    throw new Error("The backup is missing valid bot data.");
  }

  const settings = readJsonFile("server_config.json");
  const savedSettings = { ...backupData.settings };
  if (savedSettings.logChannel && idMaps.channels?.has(savedSettings.logChannel)) {
    savedSettings.logChannel = idMaps.channels.get(savedSettings.logChannel);
  }
  settings[guildId] = { ...(settings[guildId] || {}), ...savedSettings };
  writeJsonFile("server_config.json", settings);

  const warnings = readJsonFile("warnings_data.json");
  for (const [userId, savedWarnings] of Object.entries(backupData.warnings)) {
    if (!Array.isArray(savedWarnings)) continue;
    const key = `${guildId}_${userId}`;
    const current = Array.isArray(warnings[key]) ? warnings[key] : [];
    const known = new Set(current.map(item => JSON.stringify(item)));
    for (const item of savedWarnings) {
      if (!isObject(item)) continue;
      const serialized = JSON.stringify(item);
      if (!known.has(serialized)) {
        current.push(item);
        known.add(serialized);
      }
    }
    warnings[key] = current;
  }
  writeJsonFile("warnings_data.json", warnings);

  const giveaways = readJsonFile("giveaways_data.json");
  const restoredGiveaways = [];
  for (const [messageId, savedGiveaway] of Object.entries(backupData.giveaways)) {
    if (!isObject(savedGiveaway) || savedGiveaway.guildId !== guildId || giveaways[messageId]) continue;
    const restored = { ...savedGiveaway };
    if (restored.channelId && idMaps.channels?.has(restored.channelId)) {
      restored.channelId = idMaps.channels.get(restored.channelId);
    }
    giveaways[messageId] = restored;
    restoredGiveaways.push({ messageId, data: restored });
  }
  writeJsonFile("giveaways_data.json", giveaways);

  return { restoredGiveaways };
}

module.exports = { getGuildData, restoreGuildData };