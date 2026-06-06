const mongoose = require("mongoose");

module.exports = async () => {
  if (!process.env.MONGO_URI || process.env.MONGO_URI === "PASTE_YOUR_MONGODB_URI_HERE") {
    console.log("⚠️  MONGO_URI not set — warn/warnings commands will be disabled.");
    return;
  }
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Connected");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
  }
};
