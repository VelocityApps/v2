const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Clear messages from a channel')
    .addIntegerOption(option =>
      option
        .setName('amount')
        .setDescription('Number of messages to clear (1-100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  
  async execute(interaction) {
    const amount = interaction.options.getInteger('amount');
    
    try {
      const messages = await interaction.channel.bulkDelete(amount, true);
      
      await interaction.reply({ 
        content: `✅ Deleted ${messages.size} message(s)`, 
        ephemeral: true 
      });
      
      // Delete the reply after 3 seconds
      setTimeout(() => {
        interaction.deleteReply().catch(() => {});
      }, 3000);
    } catch (error) {
      console.error('Error clearing messages:', error);
      await interaction.reply({ 
        content: '❌ Failed to clear messages. Messages may be older than 14 days.', 
        ephemeral: true 
      });
    }
  },
};

