# Forge44 Templates

Pre-built templates for common AI app patterns. Select a template from the dropdown in the Forge44 interface to generate code with best practices built-in.

## Available Templates

### 1. Discord Bot Starter
- **Category:** Bots
- **Description:** Production-ready Discord bot with slash commands, command handler, event listeners, and moderation features
- **Tags:** `discord`, `bot`, `javascript`, `nodejs`
- **Location:** `templates/discord-bot/`
- **Features:**
  - Slash commands support
  - Command handler system
  - Event listeners (ready, messageCreate, interactionCreate, guildMemberAdd)
  - Moderation commands (kick, ban, clear)
  - Welcome messages
  - Custom embeds
  - Reaction roles utility
  - Error handling

### 2. Telegram Bot Starter
- **Category:** Bots
- **Description:** Production-ready Telegram bot with inline keyboards, command handlers, and message handlers
- **Tags:** `telegram`, `bot`, `node`
- **Location:** `templates/telegram-bot/`
- **Features:**
  - Command handlers (/start, /help, /info, /echo)
  - Inline keyboard support
  - Callback query handlers
  - Message handlers (text, photo, document, sticker)
  - Error handling and logging
  - Webhook support for production
  - Clean, commented code

### 3. Stripe Payment Integration
- **Category:** Payments
- **Description:** Complete Stripe checkout and subscription system
- **Tags:** `stripe`, `payments`, `subscription`
- **Location:** `templates/stripe-payment/`
- **Features:**
  - Pricing cards with multiple tiers
  - Checkout session creation (one-time and subscriptions)
  - Webhook handler for payment events
  - Success/cancel pages
  - Customer portal integration
  - Fully styled with Tailwind CSS
  - TypeScript support
  - Production ready

### 2. API Wrapper (FastAPI)
**Template ID:** `api-wrapper-fastapi`

A production-ready FastAPI backend with:
- ✅ JWT authentication middleware
- ✅ Rate limiting (slowapi)
- ✅ OpenAPI/Swagger documentation
- ✅ User registration and login
- ✅ Protected API proxy endpoint
- ✅ CORS configuration
- ✅ Error handling

**Usage:**
1. Select "API Wrapper (FastAPI)" from template dropdown
2. Describe your API requirements
3. Generated code includes all dependencies in comments

**Dependencies:**
```bash
pip install fastapi uvicorn slowapi python-jose[cryptography] passlib[bcrypt] python-multipart httpx
```

### 2. API Wrapper (Express)
**Template ID:** `api-wrapper-express`

A production-ready Express.js backend with:
- ✅ JWT authentication middleware
- ✅ Rate limiting (express-rate-limit)
- ✅ Swagger/OpenAPI documentation
- ✅ User registration and login
- ✅ Protected API proxy endpoint
- ✅ CORS and security headers (Helmet)
- ✅ Error handling

**Usage:**
1. Select "API Wrapper (Express)" from template dropdown
2. Describe your API requirements
3. Generated code includes package.json dependencies

**Dependencies:**
```bash
npm install express cors helmet express-rate-limit jsonwebtoken bcrypt swagger-ui-express swagger-jsdoc axios
```

### 3. Discord Bot Starter
**Template ID:** `discord-bot`

A production-ready Discord.js bot with:
- ✅ Slash commands support
- ✅ Command handler system
- ✅ Event listeners (ready, messageCreate, interactionCreate, guildMemberAdd)
- ✅ Moderation commands (kick, ban, clear)
- ✅ Welcome messages with embeds
- ✅ Custom embeds
- ✅ Reaction roles utility
- ✅ Error handling and logging

**Usage:**
1. Select "Discord Bot Starter" from template dropdown
2. Describe your bot features
3. Generated code includes all necessary files

**Setup:**
1. Create Discord bot application at [Discord Developer Portal](https://discord.com/developers/applications)
2. Get bot token and client ID
3. Invite bot to server with required permissions
4. Configure `.env` file with credentials
5. Run `npm install` and `npm start`

**Dependencies:**
```bash
npm install discord.js dotenv
```

**File Structure:**
```
discord-bot/
├── index.js
├── commands/
│   ├── ping.js
│   ├── help.js
│   ├── echo.js
│   ├── kick.js
│   ├── ban.js
│   └── clear.js
├── events/
│   ├── ready.js
│   ├── interactionCreate.js
│   ├── messageCreate.js
│   └── guildMemberAdd.js
├── utils/
│   └── reactionRoles.js
├── package.json
├── .env.example
└── README.md
```

### 4. Telegram Bot Starter
**Template ID:** `telegram-bot`

A production-ready Telegram bot with:
- ✅ Command handlers (/start, /help, /info, /echo)
- ✅ Inline keyboard support
- ✅ Callback query handlers
- ✅ Message handlers (text, photo, document, sticker)
- ✅ Error handling and logging
- ✅ Webhook support for production
- ✅ Clean, commented code

**Usage:**
1. Select "Telegram Bot Starter" from template dropdown
2. Describe your bot features
3. Generated code includes all necessary files

**Setup:**
1. Create bot with [@BotFather](https://t.me/BotFather) on Telegram
2. Get bot token from BotFather
3. Configure `.env` file with `TELEGRAM_BOT_TOKEN`
4. Run `npm install` and `npm start`

**Dependencies:**
```bash
npm install node-telegram-bot-api dotenv
```

**File Structure:**
```
telegram-bot/
├── bot.js          # Main bot file with all handlers
├── package.json    # Dependencies and scripts
├── .env.example    # Environment variables template
└── README.md       # Setup instructions
```

### 5. Stripe Payment Integration
**Template ID:** `stripe-payment`

A complete Stripe payment integration with:
- ✅ Pricing cards with multiple tiers
- ✅ Checkout session creation (one-time and subscriptions)
- ✅ Webhook handler for payment events
- ✅ Success/cancel pages
- ✅ Customer portal integration
- ✅ Fully styled with Tailwind CSS
- ✅ TypeScript support
- ✅ Production ready

**Usage:**
1. Select "Stripe Payment Integration" from template dropdown
2. Describe your payment requirements
3. Generated code includes all necessary files

**Setup:**
1. Get Stripe API keys from [Stripe Dashboard](https://dashboard.stripe.com)
2. Create products and prices in Stripe
3. Set up webhook endpoint
4. Configure `.env.local` with Stripe keys
5. Run `npm install` and `npm run dev`

**Dependencies:**
```bash
npm install stripe @stripe/stripe-js
```

**File Structure:**
```
stripe-payment/
├── app/
│   ├── api/
│   │   ├── checkout/session/route.ts
│   │   ├── webhooks/stripe/route.ts
│   │   └── customer-portal/route.ts
│   └── checkout/
│       ├── success/page.tsx
│       └── cancel/page.tsx
├── components/
│   ├── PricingCard.tsx
│   └── CheckoutButton.tsx
├── pricing-page.tsx
├── package.json
└── README.md
```

### 6. Supabase Full-Stack Starter
**Template ID:** `supabase-starter`

A complete Next.js + Supabase application with:
- ✅ Email/password authentication
- ✅ OAuth (GitHub, Google, Apple)
- ✅ Database CRUD operations
- ✅ Row Level Security policies
- ✅ Real-time subscriptions
- ✅ File upload to Supabase Storage
- ✅ Protected routes
- ✅ User profiles

**Usage:**
1. Select "Supabase Full-Stack Starter" from template dropdown
2. Generated code includes complete Next.js app structure
3. Follow README instructions to set up Supabase

**Setup:**
1. Create Supabase project at [supabase.com](https://supabase.com)
2. Run SQL migration in Supabase SQL Editor
3. Get API keys from Supabase dashboard
4. Configure `.env.local` with Supabase credentials
5. Run `npm install` and `npm run dev`

**Dependencies:**
```bash
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs @supabase/ssr
```

**File Structure:**
```
supabase-starter/
├── app/
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   ├── dashboard/page.tsx
│   ├── profile/page.tsx
│   └── auth/callback/route.ts
├── components/
│   ├── DataTable.tsx
│   └── FileUpload.tsx
├── lib/
│   ├── supabase-client.ts
│   └── supabase-server.ts
├── supabase/migrations/
│   └── 001_initial_schema.sql
└── README.md
```

### 7. Chrome Extension + AI
**Template ID:** `chrome-extension`

A complete Chrome Extension with AI integration:
- ✅ Manifest V3 compliant
- ✅ Background service worker
- ✅ Content script for page interaction
- ✅ Popup with AI chat interface
- ✅ OpenAI API integration
- ✅ Message passing between components
- ✅ Storage for settings and API keys

**Usage:**
1. Select "Chrome Extension + AI" from template dropdown
2. Describe your extension features
3. Generated code includes all necessary files

**Setup:**
1. Create a new folder for your extension
2. Copy generated files
3. Add icon files (16x16, 48x48, 128x128 PNG) to `icons/` folder
4. Load unpacked extension in Chrome: `chrome://extensions/`
5. Configure OpenAI API key in extension settings

**File Structure:**
```
chrome-extension/
├── manifest.json
├── background.js
├── content.js
├── content.css
├── popup.html
├── popup.css
├── popup.js
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Custom Template

Select "Custom App" to generate code without a specific template. The AI will generate code based on your description.

## Tips

- **Be specific**: The more details you provide, the better the generated code
- **Review generated code**: Always review and test the generated code
- **Customize**: Templates provide a starting point - customize as needed
- **Security**: Remember to set environment variables and API keys securely
- **Testing**: Test all functionality before deploying to production

## Template Customization

Templates are designed to be starting points. You can:
- Modify the generated code
- Add additional features
- Change styling and UI
- Integrate with other services
- Deploy to your preferred platform

