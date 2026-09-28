const fs = require("fs");
const path = require("path");

const DATA_DIR = __dirname;
const HISTORY_FILE = path.join(DATA_DIR, "backup_history.json");
const ARCHIVE_DIR = path.join(DATA_DIR, "backups");
const MAX_ARCHIVES_PER_GUILD = 10;

function readHistory() {
  if (!fs.existsSync(HISTORY_FILE)) return {};
  const parsed = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8"));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("backup_history.json must contain a JSON object");
  }
  return parsed;
}

function writeAtomically(filename, value) {
  const tempPath = `${filename}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(value, null, 2));
  fs.renameSync(tempPath, filename);
}

function safeGuildId(guildId) {
  if (!/^\d{5,30}$/.test(guildId)) throw new Error("Invalid server ID.");
  return guildId;
}

function countWarnings(warnings) {
  return Object.values(warnings || {}).reduce(
    (total, items) => total + (Array.isArray(items) ? items.length : 0),
    0
  );
}

function archiveBackup(guildId, backup) {
  safeGuildId(guildId);
  const createdAt = backup.createdAt || new Date().toISOString();
  const baseId = String(Date.parse(createdAt) || Date.now());
  const guildDir = path.join(ARCHIVE_DIR, guildId);
  fs.mkdirSync(guildDir, { recursive: true });

  let id = baseId;
  let suffix = 1;
  while (fs.existsSync(path.join(guildDir, `${id}.json`))) {
    id = `${baseId}-${suffix++}`;
  }

  const contents = Buffer.from(JSON.stringify(backup, null, 2), "utf8");
  const archivePath = path.join(guildDir, `${id}.json`);
  const tempPath = `${archivePath}.tmp`;
  fs.writeFileSync(tempPath, contents);
  fs.renameSync(tempPath, archivePath);

  const history = readHistory();
  const entries = Array.isArray(history[guildId]) ? history[guildId] : [];
  entries.push({
    id,
    createdAt,
    bytes: contents.length,
    roles: Array.isArray(backup.roles) ? backup.roles.length : 0,
    channels: Array.isArray(backup.channels) ? backup.channels.length : 0,
    warnings: countWarnings(backup.botData?.warnings),
    giveaways: Object.keys(backup.botData?.giveaways || {}).length
  });
  entries.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  for (const old of entries.splice(MAX_ARCHIVES_PER_GUILD)) {
    if (typeof old.id === "string") {
      fs.rmSync(path.join(guildDir, `${old.id}.json`), { force: true });
    }
  }

  history[guildId] = entries;
  writeAtomically(HISTORY_FILE, history);
  return entries[0];
}

function listBackupArchives(guildId) {
  safeGuildId(guildId);
  const history = readHistory();
  return (Array.isArray(history[guildId]) ? history[guildId] : [])
    .filter(entry => entry && typeof entry.id === "string")
    .filter(entry => fs.existsSync(path.join(ARCHIVE_DIR, guildId, `${entry.id}.json`)))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

function readBackupArchive(guildId, id) {
  safeGuildId(guildId);
  if (!/^\d{10,20}(?:-\d+)?$/.test(id)) {
    throw new Error("Invalid backup ID.");
  }

  const archivePath = path.join(ARCHIVE_DIR, guildId, `${id}.json`);
  if (!fs.existsSync(archivePath)) throw new Error("That saved backup was not found.");
  const contents = fs.readFileSync(archivePath);
  if (contents.length > 7 * 1024 * 1024) {
    throw new Error("That saved backup is larger than Discord's 7 MB attachment limit.");
  }
  return { contents, filename: `snf-backup-${guildId}-${id}.json` };
}

module.exports = { archiveBackup, listBackupArchives, readBackupArchive };