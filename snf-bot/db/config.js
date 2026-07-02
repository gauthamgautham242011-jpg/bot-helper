const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "server_config.json");

function load() {
  if (!fs.existsSync(FILE)) return {};
  try { return JSON.parse(fs.readFileSync(FILE, "utf8")); } catch { return {}; }
}

function save(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

module.exports = {
  get(guildId, key) {
    const data = load();
    return data[guildId]?.[key];
  },
  set(guildId, key, value) {
    const data = load();
    if (!data[guildId]) data[guildId] = {};
    data[guildId][key] = value;
    save(data);
  },
  getAll(guildId) {
    return load()[guildId] || {};
  }
};
