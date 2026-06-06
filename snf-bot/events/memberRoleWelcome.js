const config = require("../config.json");

module.exports = (client) => {
  client.on("guildMemberUpdate", async (oldMember, newMember) => {
    const role = newMember.guild.roles.cache.find(
      (r) => r.name === config.memberRoleName
    );

    if (!role) return;

    if (
      !oldMember.roles.cache.has(role.id) &&
      newMember.roles.cache.has(role.id)
    ) {
      const channel = newMember.guild.channels.cache.get(
        config.welcomeChannelId
      );

      if (channel) {
        channel.send(
          `🎉 Welcome ${newMember}!\n\nYou are now an official **SNF MEMBER** 🖤\n\nStay active and enjoy!`
        );
      }
    }
  });
};
