const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member) {
    // Find welcome channel (you can customize this)
    const welcomeChannel = member.guild.channels.cache.find(
      channel => channel.name === 'welcome' || channel.name === 'general'
    );
    
    if (!welcomeChannel) return;
    
    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('👋 Welcome!')
      .setDescription(`Welcome to ${member.guild.name}, ${member.user.tag}!`)
      .addFields(
        { name: 'Member Count', value: `${member.guild.memberCount}`, inline: true },
        { name: 'Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true }
      )
      .setThumbnail(member.user.displayAvatarURL())
      .setTimestamp();
    
    await welcomeChannel.send({ embeds: [embed] });
    
    // Optional: Assign default role
    // const defaultRole = member.guild.roles.cache.find(role => role.name === 'Member');
    // if (defaultRole) {
    //   await member.roles.add(defaultRole);
    // }
  },
};

