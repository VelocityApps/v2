const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member from the server')
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('The member to ban')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for banning')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  
  async execute(interaction) {
    const target = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    
    const member = interaction.guild.members.cache.get(target.id);
    
    if (member && member.roles.highest.position >= interaction.member.roles.highest.position) {
      return interaction.reply({ 
        content: '❌ You cannot ban this user (they have equal or higher role).', 
        ephemeral: true 
      });
    }
    
    try {
      await interaction.guild.members.ban(target, { reason });
      
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('🔨 Member Banned')
        .addFields(
          { name: 'User', value: `${target.tag}`, inline: true },
          { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
          { name: 'Reason', value: reason, inline: false }
        )
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error banning member:', error);
      await interaction.reply({ 
        content: '❌ Failed to ban member. Check bot permissions.', 
        ephemeral: true 
      });
    }
  },
};

