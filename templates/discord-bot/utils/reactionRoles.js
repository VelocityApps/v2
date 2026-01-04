/**
 * Reaction Roles Utility
 * 
 * Example implementation for reaction roles.
 * Create a message with reactions, and assign roles when users react.
 * 
 * Usage:
 * 1. Send a message with embed
 * 2. Add reactions to the message
 * 3. Listen for reaction events
 * 4. Assign/remove roles based on reactions
 */

const { EmbedBuilder } = require('discord.js');

/**
 * Create a reaction role message
 * @param {Channel} channel - The channel to send the message in
 * @param {Object} roleData - Object mapping emoji to role IDs
 */
async function createReactionRoleMessage(channel, roleData) {
  const roleList = Object.entries(roleData)
    .map(([emoji, roleId]) => {
      const role = channel.guild.roles.cache.get(roleId);
      return role ? `${emoji} - ${role.name}` : `${emoji} - Role not found`;
    })
    .join('\n');
  
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('🎭 Reaction Roles')
    .setDescription('React to this message to get roles!\n\n' + roleList)
    .setFooter({ text: 'Click the reactions below to assign yourself roles' })
    .setTimestamp();
  
  const message = await channel.send({ embeds: [embed] });
  
  // Add reactions
  for (const emoji of Object.keys(roleData)) {
    await message.react(emoji);
  }
  
  return message;
}

/**
 * Handle reaction add/remove for role assignment
 * @param {Reaction} reaction - The reaction object
 * @param {User} user - The user who reacted
 * @param {Object} roleData - Object mapping emoji to role IDs
 * @param {boolean} add - Whether to add or remove the role
 */
async function handleReactionRole(reaction, user, roleData, add = true) {
  if (user.bot) return;
  
  const emoji = reaction.emoji.name;
  const roleId = roleData[emoji];
  
  if (!roleId) return;
  
  const member = reaction.message.guild.members.cache.get(user.id);
  const role = reaction.message.guild.roles.cache.get(roleId);
  
  if (!member || !role) return;
  
  try {
    if (add) {
      await member.roles.add(role);
      console.log(`✅ Added role ${role.name} to ${user.tag}`);
    } else {
      await member.roles.remove(role);
      console.log(`❌ Removed role ${role.name} from ${user.tag}`);
    }
  } catch (error) {
    console.error('Error managing reaction role:', error);
  }
}

module.exports = {
  createReactionRoleMessage,
  handleReactionRole,
};

