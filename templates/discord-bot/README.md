# Discord Bot Starter Template

A production-ready Discord.js bot template with slash commands, command handler, event listeners, and comprehensive error handling.

## ✨ Features

- ✅ **Slash Commands** - Modern Discord slash command support
- ✅ **Command Handler** - Organized command system
- ✅ **Event Listeners** - Ready, messageCreate, interactionCreate, guildMemberAdd
- ✅ **Error Handling** - Comprehensive error catching and logging
- ✅ **Moderation Commands** - Kick, ban, clear messages
- ✅ **Welcome Messages** - Automatic welcome embeds for new members
- ✅ **Custom Embeds** - Beautiful embed messages
- ✅ **Reaction Roles** - Utility for reaction-based role assignment
- ✅ **Clean Code** - Well-commented and organized

## 🚀 Quick Start

### 1. Create Discord Bot Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **"New Application"**
3. Give it a name (e.g., "My Bot")
4. Click **"Create"**

### 2. Get Bot Token

1. In your application, go to **"Bot"** tab
2. Click **"Add Bot"** (if not already added)
3. Under **"Token"**, click **"Reset Token"** or **"Copy"**
4. **⚠️ Keep this token secret!** Never share it publicly.

### 3. Get Client ID

1. Go to **"General Information"** tab
2. Copy the **"Application ID"** (this is your Client ID)

### 4. Set Up Bot Permissions

1. Go to **"Bot"** tab
2. Under **"Privileged Gateway Intents"**, enable:
   - ✅ **Message Content Intent** (if you want to read message content)
   - ✅ **Server Members Intent** (if you want member events)
3. Under **"OAuth2"** → **"URL Generator"**:
   - Select scopes: `bot`, `applications.commands`
   - Select bot permissions:
     - ✅ Send Messages
     - ✅ Manage Messages
     - ✅ Kick Members
     - ✅ Ban Members
     - ✅ Manage Roles
     - ✅ Read Message History
   - Copy the generated URL

### 5. Invite Bot to Server

1. Open the URL you copied in step 4
2. Select your Discord server
3. Click **"Authorize"**
4. Complete the CAPTCHA if prompted

### 6. Install Dependencies

```bash
npm install
```

### 7. Configure Environment

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your credentials:
   ```env
   DISCORD_BOT_TOKEN=your_bot_token_here
   DISCORD_CLIENT_ID=your_client_id_here
   ```

### 8. Run the Bot

```bash
npm start
```

You should see:
```
✅ Loaded command: ping
✅ Loaded command: help
✅ Loaded event: ready
✅ BotName#1234 is online!
```

## 📁 Project Structure

```
discord-bot/
├── index.js              # Main bot file
├── commands/             # Slash commands
│   ├── ping.js
│   ├── help.js
│   ├── echo.js
│   ├── kick.js
│   ├── ban.js
│   └── clear.js
├── events/               # Event listeners
│   ├── ready.js
│   ├── interactionCreate.js
│   ├── messageCreate.js
│   └── guildMemberAdd.js
├── utils/                # Utility functions
│   └── reactionRoles.js
├── .env.example          # Environment template
├── .gitignore
├── package.json
└── README.md
```

## 🎮 Available Commands

- `/ping` - Check bot latency
- `/help` - Display all commands
- `/echo <message>` - Echo your message
- `/kick <user> [reason]` - Kick a member (requires permissions)
- `/ban <user> [reason]` - Ban a member (requires permissions)
- `/clear <amount>` - Clear messages (requires permissions)

## 🔧 Customization

### Adding New Commands

1. Create a new file in `commands/` directory:
   ```javascript
   const { SlashCommandBuilder } = require('discord.js');
   
   module.exports = {
     data: new SlashCommandBuilder()
       .setName('mycommand')
       .setDescription('My command description'),
     
     async execute(interaction) {
       await interaction.reply('Hello!');
     },
   };
   ```

2. The bot will automatically load it on restart!

### Adding Event Listeners

1. Create a new file in `events/` directory:
   ```javascript
   module.exports = {
     name: 'eventName',
     once: false, // true for events that should only run once
     execute(...args) {
       // Your event handler code
     },
   };
   ```

### Customizing Welcome Messages

Edit `events/guildMemberAdd.js` to customize welcome behavior.

### Setting Up Reaction Roles

See `utils/reactionRoles.js` for example implementation.

## 🚢 Deployment

### Railway

1. Create account at [Railway](https://railway.app)
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Connect your repository
4. Add environment variables:
   - `DISCORD_BOT_TOKEN`
   - `DISCORD_CLIENT_ID`
5. Railway will automatically deploy and run `npm start`

### Vercel / Other Platforms

Discord bots require a persistent connection, so serverless platforms like Vercel are **not recommended**. Use:
- **Railway** (recommended)
- **Heroku**
- **DigitalOcean**
- **AWS EC2**
- **Your own VPS**

### Running 24/7 Locally

Use a process manager like **PM2**:

```bash
npm install -g pm2
pm2 start index.js --name discord-bot
pm2 save
pm2 startup
```

## 🔒 Security Best Practices

1. **Never commit `.env` file** - It's in `.gitignore` for a reason
2. **Rotate tokens** if exposed - Reset in Discord Developer Portal
3. **Use environment variables** - Never hardcode tokens
4. **Limit bot permissions** - Only grant what's needed
5. **Validate user input** - Always sanitize user-provided data

## 🐛 Troubleshooting

### Bot doesn't respond to commands

- Check that slash commands are registered (you'll see a log on startup)
- Wait a few minutes for global commands to propagate
- Try restarting the bot

### "Missing Permissions" errors

- Check bot has required permissions in server settings
- Verify bot role is above members it's trying to moderate

### Bot goes offline

- Check your hosting platform is running
- Verify `DISCORD_BOT_TOKEN` is correct
- Check logs for error messages

## 📚 Resources

- [Discord.js Documentation](https://discord.js.org)
- [Discord Developer Portal](https://discord.com/developers)
- [Discord.js Guide](https://discordjs.guide)

## 📝 License

MIT License - Feel free to use this template for your own projects!

---

**Made with ❤️ using Discord.js**

