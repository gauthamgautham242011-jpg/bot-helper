const { SlashCommandBuilder } = require("discord.js");
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

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
    const question = interaction.options.getString("question");

    await interaction.deferReply();

    try {
      const response = await openai.responses.create({
        model: "gpt-4o",
        input: question
      });

      const answer = response.output_text;

      if (answer.length > 2000) {
        await interaction.editReply(answer.substring(0, 1997) + "...");
      } else {
        await interaction.editReply(answer);
      }
    } catch (err) {
      console.error(err);
      await interaction.editReply("❌ Failed to get a response from ChatGPT.");
    }
  }
};
