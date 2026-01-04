const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server')
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('The member to kick')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for kicking')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  
  async execute(interaction) {
    const target = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    
    const member = interaction.guild.members.cache.get(target.id);
    
    if (!member) {
      return interaction.reply({ 
        content: '❌ User not found in this server.', 
        ephemeral: true 
      });
    }
    
    if (member.roles.highest.position >= interaction.member.roles.highest.position) {
      return interaction.reply({ 
        content: '❌ You cannot kick this user (they have equal or higher role).', 
        ephemeral: true 
      });
    }
    
    try {
      await member.kick(reason);
      
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('👢 Member Kicked')
        .addFields(
          { name: 'User', value: `${target.tag}`, inline: true },
          { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
          { name: 'Reason', value: reason, inline: false }
        )
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error kicking member:', error);
      await interaction.reply({ 
        content: '❌ Failed to kick member. Check bot permissions.', 
        ephemeral: true 
      });
    }
  },
};

