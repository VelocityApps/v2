const { ActivityType } = require('discord.js');

module.exports = {
  name: 'ready',
  once: true,
  execute(client) {
    console.log(`✅ ${client.user.tag} is online!`);
    console.log(`📊 Serving ${client.guilds.cache.size} server(s)`);
    console.log(`👥 Watching ${client.users.cache.size} user(s)`);
    
    // Set bot activity/status
    client.user.setActivity('with Discord.js', { 
      type: ActivityType.Playing 
    });
    
    // Register slash commands globally
    const { REST, Routes } = require('discord.js');
    const fs = require('fs');
    const path = require('path');
    
    const commands = [];
    const commandsPath = path.join(__dirname, '../commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
      const command = require(path.join(commandsPath, file));
      commands.push(command.data.toJSON());
    }
    
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);
    
    (async () => {
      try {
        console.log('🔄 Registering slash commands...');
        
        const data = await rest.put(
          Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
          { body: commands }
        );
        
        console.log(`✅ Successfully registered ${data.length} slash command(s)`);
      } catch (error) {
        console.error('❌ Error registering commands:', error);
      }
    })();
  },
};

