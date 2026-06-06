const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("chatgpt")
    .setDescription("Ask ChatGPT anything")
    .addStringOption((option) =>
      option
        .setName("question")
        .setDescription("Your question")
        .setRequired(true)
    ),

  async execute(interaction) {
    const key = process.env.OPENAI_API_KEY;
    if (!key || key === "PASTE_YOUR_OPENAI_KEY_HERE") {
      return interaction.reply({
        content: "❌ OpenAI key not set. Add `OPENAI_API_KEY` to the `.env` file.",
        ephemeral: true
      });
    }

    const { default: OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey: key });
    const question = interaction.options.getString("question");

    await interaction.deferReply();

    try {
      const response = await openai.responses.create({
        model: "gpt-4o",
        input: question
      });

      const answer = response.output_text;
      await interaction.editReply(answer.length > 2000 ? answer.substring(0, 1997) + "..." : answer);
    } catch (err) {
      console.error(err);
      await interaction.editReply("❌ Failed to get a response from ChatGPT.");
    }
  }
};
