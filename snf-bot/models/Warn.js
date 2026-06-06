const mongoose = require("mongoose");

module.exports = mongoose.model(
  "Warn",
  new mongoose.Schema({
    guildId: String,
    userId: String,
    moderatorId: String,
    reason: String,
    date: {
      type: Date,
      default: Date.now
    }
  })
);
