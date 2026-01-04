/**
 * Telegram Bot Starter Template
 * 
 * A production-ready Telegram bot with command handlers, inline keyboards,
 * message handlers, callback queries, and comprehensive error handling.
 * 
 * Features:
 * - Command handlers (/start, /help, /info, /echo)
 * - Inline keyboard support
 * - Callback query handlers
 * - Message handlers
 * - Image/file handling
 * - Error handling and logging
 * - Clean, commented code
 */

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

// Get bot token from environment variables
const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error('❌ Error: TELEGRAM_BOT_TOKEN is not set in .env file');
  console.error('   Please create a .env file with: TELEGRAM_BOT_TOKEN=your_bot_token');
  process.exit(1);
}

// Create bot instance
// Use polling for local development, webhook for production
const bot = new TelegramBot(token, { polling: true });

// =====================================================
// BOT INITIALIZATION
// =====================================================

console.log('🤖 Telegram Bot is starting...');
console.log(`✅ Bot token loaded (${token.substring(0, 10)}...)`);

// Get bot info on startup
bot.getMe().then((botInfo) => {
  console.log(`✅ Bot is running as @${botInfo.username}`);
  console.log(`   Bot name: ${botInfo.first_name}`);
  console.log('🚀 Bot is ready to receive messages!');
}).catch((error) => {
  console.error('❌ Error getting bot info:', error.message);
  process.exit(1);
});

// =====================================================
// COMMAND HANDLERS
// =====================================================

/**
 * /start command - Welcome message with inline keyboard
 */
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name;
  
  const welcomeMessage = `
👋 Welcome, ${firstName}!

I'm a Telegram bot built with node-telegram-bot-api.

Use /help to see all available commands.
  `.trim();

  // Create inline keyboard
  const options = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '📚 Help', callback_data: 'help' },
          { text: 'ℹ️ Info', callback_data: 'info' }
        ],
        [
          { text: '🔗 GitHub', url: 'https://github.com/yagop/node-telegram-bot-api' },
          { text: '📖 Docs', url: 'https://core.telegram.org/bots/api' }
        ]
      ]
    }
  };

  bot.sendMessage(chatId, welcomeMessage, options)
    .catch((error) => {
      console.error('Error sending /start message:', error.message);
    });
});

/**
 * /help command - Show all available commands
 */
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  
  const helpMessage = `
📚 *Available Commands:*

/start - Start the bot and see welcome message
/help - Show this help message
/info - Get information about yourself
/echo <text> - Echo back your message

*Features:*
• Inline keyboards
• Callback query handling
• Image and file handling
• Error handling

Send me a photo or document to see file handling!
  `.trim();

  bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' })
    .catch((error) => {
      console.error('Error sending /help message:', error.message);
    });
});

/**
 * /info command - Get user information
 */
bot.onText(/\/info/, (msg) => {
  const chatId = msg.chat.id;
  const user = msg.from;
  
  const infoMessage = `
ℹ️ *Your Information:*

👤 *Name:* ${user.first_name}${user.last_name ? ' ' + user.last_name : ''}
🆔 *User ID:* \`${user.id}\`
👤 *Username:* ${user.username ? '@' + user.username : 'Not set'}
🌐 *Language:* ${user.language_code || 'Unknown'}

*Chat Information:*
💬 *Chat ID:* \`${chatId}\`
📝 *Chat Type:* ${msg.chat.type}
  `.trim();

  bot.sendMessage(chatId, infoMessage, { parse_mode: 'Markdown' })
    .catch((error) => {
      console.error('Error sending /info message:', error.message);
    });
});

/**
 * /echo command - Echo back the user's message
 */
bot.onText(/\/echo (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const echoText = match[1]; // The captured text after /echo
  
  bot.sendMessage(chatId, `📢 Echo: ${echoText}`)
    .catch((error) => {
      console.error('Error sending echo message:', error.message);
    });
});

// =====================================================
// CALLBACK QUERY HANDLERS (Inline Keyboard Buttons)
// =====================================================

/**
 * Handle callback queries from inline keyboards
 */
bot.on('callback_query', (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;
  const messageId = query.message.message_id;

  // Answer the callback query to remove loading state
  bot.answerCallbackQuery(query.id).catch(() => {});

  switch (data) {
    case 'help':
      const helpText = `
📚 *Help Menu*

*Commands:*
/start - Start the bot
/help - Show help
/info - Get user info
/echo <text> - Echo message

*Try sending:*
• A photo
• A document
• Any text message
      `.trim();
      
      bot.editMessageText(helpText, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔙 Back', callback_data: 'back' }]
          ]
        }
      }).catch((error) => {
        console.error('Error editing help message:', error.message);
      });
      break;

    case 'info':
      const user = query.from;
      const infoText = `
ℹ️ *Your Info:*

👤 *Name:* ${user.first_name}${user.last_name ? ' ' + user.last_name : ''}
🆔 *ID:* \`${user.id}\`
👤 *Username:* ${user.username ? '@' + user.username : 'Not set'}
      `.trim();
      
      bot.editMessageText(infoText, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔙 Back', callback_data: 'back' }]
          ]
        }
      }).catch((error) => {
        console.error('Error editing info message:', error.message);
      });
      break;

    case 'back':
      const backMessage = `
👋 Welcome back!

Use /help to see all available commands.
      `.trim();
      
      bot.editMessageText(backMessage, {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: {
          inline_keyboard: [
            [
              { text: '📚 Help', callback_data: 'help' },
              { text: 'ℹ️ Info', callback_data: 'info' }
            ],
            [
              { text: '🔗 GitHub', url: 'https://github.com/yagop/node-telegram-bot-api' },
              { text: '📖 Docs', url: 'https://core.telegram.org/bots/api' }
            ]
          ]
        }
      }).catch((error) => {
        console.error('Error editing back message:', error.message);
      });
      break;

    default:
      bot.sendMessage(chatId, `Unknown callback: ${data}`)
        .catch((error) => {
          console.error('Error sending callback response:', error.message);
        });
  }
});

// =====================================================
// MESSAGE HANDLERS
// =====================================================

/**
 * Handle text messages (not commands)
 */
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const messageText = msg.text;

  // Skip if it's a command (handled by onText)
  if (messageText && messageText.startsWith('/')) {
    return;
  }

  // Handle regular text messages
  if (messageText) {
    const response = `You said: "${messageText}"\n\nUse /help to see available commands.`;
    bot.sendMessage(chatId, response)
      .catch((error) => {
        console.error('Error sending message response:', error.message);
      });
  }
});

/**
 * Handle photo messages
 */
bot.on('photo', (msg) => {
  const chatId = msg.chat.id;
  const photo = msg.photo;
  
  // Get the largest photo size
  const largestPhoto = photo[photo.length - 1];
  
  bot.sendMessage(
    chatId,
    `📸 Thanks for the photo!\n\n` +
    `Photo ID: ${largestPhoto.file_id}\n` +
    `Size: ${largestPhoto.width}x${largestPhoto.height}\n` +
    `File size: ${largestPhoto.file_size ? (largestPhoto.file_size / 1024).toFixed(2) + ' KB' : 'Unknown'}`
  ).catch((error) => {
    console.error('Error sending photo response:', error.message);
  });
});

/**
 * Handle document messages
 */
bot.on('document', (msg) => {
  const chatId = msg.chat.id;
  const doc = msg.document;
  
  bot.sendMessage(
    chatId,
    `📄 Document received!\n\n` +
    `Name: ${doc.file_name || 'Unknown'}\n` +
    `Type: ${doc.mime_type || 'Unknown'}\n` +
    `Size: ${doc.file_size ? (doc.file_size / 1024).toFixed(2) + ' KB' : 'Unknown'}\n` +
    `File ID: ${doc.file_id}`
  ).catch((error) => {
    console.error('Error sending document response:', error.message);
  });
});

/**
 * Handle sticker messages
 */
bot.on('sticker', (msg) => {
  const chatId = msg.chat.id;
  const sticker = msg.sticker;
  
  bot.sendMessage(
    chatId,
    `😊 Nice sticker!\n\n` +
    `Emoji: ${sticker.emoji || 'None'}\n` +
    `Set: ${sticker.set_name || 'Unknown'}\n` +
    `Size: ${sticker.width}x${sticker.height}`
  ).catch((error) => {
    console.error('Error sending sticker response:', error.message);
  });
});

// =====================================================
// ERROR HANDLING
// =====================================================

/**
 * Handle polling errors
 */
bot.on('polling_error', (error) => {
  console.error('❌ Polling error:', error.message);
  // Bot will automatically retry, but you can add custom retry logic here
});

/**
 * Handle general errors
 */
bot.on('error', (error) => {
  console.error('❌ Bot error:', error.message);
});

// =====================================================
// GRACEFUL SHUTDOWN
// =====================================================

process.once('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, stopping bot...');
  bot.stopPolling();
  process.exit(0);
});

process.once('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, stopping bot...');
  bot.stopPolling();
  process.exit(0);
});

// =====================================================
// WEBHOOK SETUP (For Production)
// =====================================================

/**
 * To use webhooks instead of polling (for production):
 * 
 * 1. Set webhook URL:
 *    bot.setWebHook('https://yourdomain.com/webhook');
 * 
 * 2. Remove polling initialization:
 *    const bot = new TelegramBot(token); // Remove { polling: true }
 * 
 * 3. Create Express server to receive webhooks:
 *    const express = require('express');
 *    const app = express();
 *    app.use(express.json());
 *    app.post('/webhook', (req, res) => {
 *      bot.processUpdate(req.body);
 *      res.sendStatus(200);
 *    });
 *    app.listen(3000);
 * 
 * 4. Make sure your server has HTTPS (required by Telegram)
 */

