module.exports = {
  name: 'messageCreate',
  async execute(message) {
    // Ignore messages from bots
    if (message.author.bot) return;
    
    // Welcome message example
    if (message.content.toLowerCase() === 'hello bot') {
      await message.reply(`Hello ${message.author.username}! 👋`);
    }
    
    // Custom command prefix (optional - if you want text commands too)
    const prefix = '!';
    if (!message.content.startsWith(prefix)) return;
    
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    
    // Example: !info command
    if (commandName === 'info') {
      await message.reply({
        content: `**Bot Info**\n` +
                 `Server: ${message.guild.name}\n` +
                 `Members: ${message.guild.memberCount}\n` +
                 `Created: ${message.guild.createdAt.toDateString()}`
      });
    }
  },
};

