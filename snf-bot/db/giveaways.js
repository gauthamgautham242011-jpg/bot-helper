const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "giveaways_data.json");

function load() {
  if (!fs.existsSync(FILE)) return {};
  try { return JSON.parse(fs.readFileSync(FILE, "utf8")); } catch { return {}; }
}

function save(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

module.exports = {
  create(messageId, data) {
    const all = load();
    all[messageId] = data;
    save(all);
  },
  get(messageId) {
    return load()[messageId] || null;
  },
  getAll() {
    return load();
  },
  update(messageId, data) {
    const all = load();
    if (!all[messageId]) return;
    all[messageId] = { ...all[messageId], ...data };
    save(all);
  },
  delete(messageId) {
    const all = load();
    delete all[messageId];
    save(all);
  },
  addEntry(messageId, userId) {
    const all = load();
    if (!all[messageId]) return;
    if (!all[messageId].entries) all[messageId].entries = [];
    if (!all[messageId].entries.includes(userId)) {
      all[messageId].entries.push(userId);
      save(all);
      return true;
    }
    return false;
  }
};
