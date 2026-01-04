const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Display all available commands'),
  
  async execute(interaction) {
    const commands = interaction.client.commands;
    const commandList = commands.map(cmd => 
      `**/${cmd.data.name}** - ${cmd.data.description}`
    ).join('\n');
    
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('📚 Available Commands')
      .setDescription(commandList || 'No commands available')
      .setFooter({ text: 'Use / before command names to execute them' })
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  },
};

