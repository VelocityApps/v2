# Telegram Bot Starter Template

A production-ready Telegram bot template with command handlers, inline keyboards, callback queries, message handlers, and comprehensive error handling.

## ✨ Features

- ✅ **Command Handlers** - `/start`, `/help`, `/info`, `/echo` commands
- ✅ **Inline Keyboards** - Interactive buttons with callback queries
- ✅ **Message Handlers** - Text, photo, document, sticker handling
- ✅ **Callback Queries** - Handle button clicks and interactions
- ✅ **Error Handling** - Comprehensive error catching and logging
- ✅ **File Handling** - Photo and document processing
- ✅ **Clean Code** - Well-commented and organized
- ✅ **Production Ready** - Webhook support for production deployment

## 🚀 Quick Start

### 1. Create Bot with BotFather

1. Open Telegram and search for [@BotFather](https://t.me/BotFather)
2. Start a chat with BotFather
3. Send `/newbot` command
4. Follow the instructions:
   - Choose a name for your bot (e.g., "My Awesome Bot")
   - Choose a username (must end with `bot`, e.g., "my_awesome_bot")
5. BotFather will give you a **bot token** (looks like: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)
6. **⚠️ Keep this token secret!** Never share it publicly.

### 2. Get Bot Token

Your bot token will be provided by BotFather when you create the bot. It looks like:
```
123456789:ABCdefGHIjklMNOpqrsTUVwxyz
```

### 3. Set Up Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and add your bot token:
   ```env
   TELEGRAM_BOT_TOKEN=your_bot_token_here
   ```

### 4. Install Dependencies

```bash
npm install
```

### 5. Run Locally (Polling)

For local development, the bot uses polling to receive updates:

```bash
npm start
```

You should see:
```
🤖 Telegram Bot is starting...
✅ Bot token loaded (1234567890...)
✅ Bot is running as @your_bot_username
   Bot name: Your Bot Name
🚀 Bot is ready to receive messages!
```

### 6. Test Your Bot

1. Open Telegram and search for your bot by username
2. Send `/start` to your bot
3. Try other commands: `/help`, `/info`, `/echo Hello World`
4. Send a photo or document to test file handling
5. Click the inline keyboard buttons

## 📦 Project Structure

```
telegram-bot/
├── bot.js          # Main bot file with all handlers
├── package.json    # Dependencies and scripts
├── .env.example    # Environment variables template
└── README.md       # This file
```

## 🔧 Available Commands

- `/start` - Start the bot and see welcome message with inline keyboard
- `/help` - Show all available commands
- `/info` - Get information about yourself
- `/echo <text>` - Echo back your message

## 🎨 Features Explained

### Inline Keyboards

The bot includes inline keyboards (buttons) that users can click. When clicked, they trigger callback queries that the bot handles.

Example from `/start` command:
```javascript
const options = {
  reply_markup: {
    inline_keyboard: [
      [
        { text: '📚 Help', callback_data: 'help' },
        { text: 'ℹ️ Info', callback_data: 'info' }
      ]
    ]
  }
};
```

### Callback Queries

When users click inline keyboard buttons, the bot receives a callback query. Handle them with:

```javascript
bot.on('callback_query', (query) => {
  const data = query.data; // The callback_data from the button
  // Handle the callback
});
```

### Message Handlers

The bot handles different message types:
- **Text messages** - Regular text (not commands)
- **Photos** - Image files
- **Documents** - Files and documents
- **Stickers** - Telegram stickers

## 🚀 Deploy to Production

### Option 1: Using Webhooks (Recommended for Production)

Webhooks are more efficient than polling for production. Telegram sends updates directly to your server.

#### 1. Set Up HTTPS Server

You need a server with HTTPS (Telegram requires HTTPS for webhooks). You can use:
- **Heroku** - Free tier available
- **Railway** - Easy deployment
- **Render** - Free tier available
- **VPS** - Your own server with SSL certificate

#### 2. Create Express Server

Create a new file `server.js`:

```javascript
require('dotenv').config();
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token);

// Set webhook URL (replace with your domain)
const webhookUrl = 'https://yourdomain.com/webhook';
bot.setWebHook(webhookUrl);

// Express server to receive webhooks
const app = express();
app.use(express.json());

app.post('/webhook', (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

#### 3. Update package.json

Add express dependency:

```json
{
  "dependencies": {
    "node-telegram-bot-api": "^0.66.0",
    "dotenv": "^16.4.5",
    "express": "^4.18.2"
  }
}
```

#### 4. Set Webhook

After deploying, set your webhook URL:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://yourdomain.com/webhook"
```

Or use the Telegram Bot API:

```javascript
bot.setWebHook('https://yourdomain.com/webhook')
  .then(() => console.log('Webhook set successfully'))
  .catch((error) => console.error('Error setting webhook:', error));
```

#### 5. Deploy

Deploy your code to your hosting platform. Make sure to:
- Set `TELEGRAM_BOT_TOKEN` as an environment variable
- Your server has HTTPS enabled
- The webhook URL is accessible

### Option 2: Keep Using Polling

For simple deployments, you can keep using polling. Just make sure your server stays running:

```bash
# Use PM2 or similar process manager
npm install -g pm2
pm2 start bot.js
pm2 save
pm2 startup
```

## 🔒 Security Best Practices

1. **Never commit `.env` file** - Add it to `.gitignore`
2. **Keep bot token secret** - Don't share it publicly
3. **Use environment variables** - Store tokens in environment variables
4. **Validate user input** - Always validate and sanitize user input
5. **Rate limiting** - Consider adding rate limiting for production
6. **Error handling** - Don't expose sensitive information in error messages

## 📚 Resources

- [node-telegram-bot-api Documentation](https://github.com/yagop/node-telegram-bot-api)
- [Telegram Bot API Documentation](https://core.telegram.org/bots/api)
- [Telegram Bot Examples](https://core.telegram.org/bots/samples)
- [BotFather Commands](https://core.telegram.org/bots#6-botfather)

## 🛠️ Customization

### Adding New Commands

1. Add command handler in `bot.js`:

```javascript
bot.onText(/\/mycommand/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'My custom command response!');
});
```

### Adding New Callback Handlers

Add cases to the callback query handler:

```javascript
bot.on('callback_query', (query) => {
  const data = query.data;
  
  switch (data) {
    case 'my_callback':
      // Handle your callback
      break;
  }
});
```

### Adding New Message Handlers

Add handlers for different message types:

```javascript
bot.on('video', (msg) => {
  // Handle video messages
});

bot.on('voice', (msg) => {
  // Handle voice messages
});
```

## 🐛 Troubleshooting

### Bot not responding

1. Check that bot token is correct in `.env`
2. Make sure bot is running (`npm start`)
3. Check that you've started a chat with the bot in Telegram
4. Verify bot is not blocked

### Webhook not working

1. Ensure your server has HTTPS
2. Check webhook URL is correct
3. Verify webhook is set: `https://api.telegram.org/bot<TOKEN>/getWebhookInfo`
4. Check server logs for errors

### Polling errors

1. Check internet connection
2. Verify bot token is valid
3. Check for rate limiting from Telegram
4. Review error logs

## 📝 License

MIT

## 🤝 Contributing

Feel free to customize this template for your needs. This is a starting point - add your own features and make it your own!

---

**Happy Bot Building! 🤖**

