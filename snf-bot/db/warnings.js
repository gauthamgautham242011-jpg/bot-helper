const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "warnings_data.json");

function load() {
  if (!fs.existsSync(FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    return {};
  }
}

function save(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

module.exports = {
  addWarn(guildId, userId, moderatorId, reason) {
    const data = load();
    const key = `${guildId}_${userId}`;
    if (!data[key]) data[key] = [];
    data[key].push({ moderatorId, reason, date: new Date().toISOString() });
    save(data);
    return data[key].length;
  },

  getWarns(guildId, userId) {
    const data = load();
    return data[`${guildId}_${userId}`] || [];
  },

  clearWarns(guildId, userId) {
    const data = load();
    const key = `${guildId}_${userId}`;
    const count = (data[key] || []).length;
    delete data[key];
    save(data);
    return count;
  }
};
