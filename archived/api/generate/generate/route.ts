import { NextRequest, NextResponse } from 'next/server';
import { executeAnthropicRequest } from '@/lib/anthropic-client';
import { generateWithGPT, isOpenAIAvailable } from '@/lib/openai-client';
import { checkRateLimit } from '@/lib/rate-limit';
import { supabase } from '@/lib/supabase';
import { calculateCost, logCost, getCostWarningLevel, shouldRateLimitByCost, getUserMonthlyCost } from '@/lib/cost-tracking';
import { logGeneration, logError } from '@/lib/monitoring';
import { trackPerformance } from '@/lib/performance';
import { detectShopifyApp, getShopifyAppType } from '@/lib/shopify-detector';

// Mode configurations
const MODE_CONFIG = {
  turbo: {
    model: 'claude-haiku-4-20250514',
    provider: 'anthropic' as const,
    credits: 0.5,
    maxTokens: 2048,
  },
  forge: {
    model: 'claude-sonnet-4-20250514',
    provider: 'anthropic' as const,
    credits: 1,
    maxTokens: 4096,
  },
  anvil: {
    model: 'claude-opus-4-20250514',
    provider: 'anthropic' as const,
    credits: 2,
    maxTokens: 8192,
  },
  gpt: {
    model: 'gpt-4o',
    provider: 'openai' as const,
    credits: 1,
    maxTokens: 4096,
  },
};

// Shopify mode configurations (2x credits)
const SHOPIFY_MODE_CONFIG = {
  turbo: {
    ...MODE_CONFIG.turbo,
    credits: 1, // 2x
  },
  forge: {
    ...MODE_CONFIG.forge,
    credits: 2, // 2x
  },
  anvil: {
    ...MODE_CONFIG.anvil,
    credits: 4, // 2x
  },
  gpt: {
    ...MODE_CONFIG.gpt,
    credits: 2, // 2x
  },
};

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let user: any = null;
  
  try {
    // Authenticate user
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: authenticatedUser }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !authenticatedUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    user = authenticatedUser;

    // Check cost warning level first (to determine rate limit type)
    const costWarning = await getCostWarningLevel(user.id);
    const useHourlyLimit = costWarning === 'rate_limit';

    // Check rate limit (hourly if cost > $30, otherwise per-minute)
    const rateLimit = checkRateLimit(user.id, useHourlyLimit);
    if (!rateLimit.allowed) {
      const errorMessage = useHourlyLimit
        ? "You're using a lot of resources. Consider upgrading to Enterprise. (Limited to 1 generation per hour)"
        : "⏱️ Whoa there! You're generating too fast. Wait 30 seconds.";
      
      return NextResponse.json(
        { 
          error: errorMessage,
          rateLimit: {
            remaining: 0,
            resetIn: rateLimit.resetIn,
          }
        },
        { status: 429 }
      );
    }

    // Log warning if cost > $25 but < $30
    if (costWarning === 'warning') {
      console.warn(`[CostTracking] User ${user.id} has monthly cost > $25`);
    }

    const { prompt, template, mode = 'forge', includeBranding = true } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Detect if this is a Shopify app request
    const shopifyDetection = detectShopifyApp(prompt);
    const isShopifyApp = shopifyDetection.isShopifyApp || template === 'shopify';
    const shopifyAppType = shopifyDetection.appType || 'custom';

    // Template-specific prompts
    let systemPrompt = `Generate code for an AI app based on this description: ${prompt}. Return only the code without any markdown formatting or code blocks.`;

    if (isShopifyApp) {
      // Shopify app generation with Remix + Polaris
      const appTypeDescription = shopifyAppType === 'reviews' 
        ? 'product reviews app with star ratings, customer submission form, and moderation'
        : shopifyAppType === 'inventory'
        ? 'inventory tracker with real-time stock levels, low stock alerts, and reorder recommendations'
        : shopifyAppType === 'orders'
        ? 'order management dashboard with order list, filters, bulk actions, and custom notes'
        : shopifyAppType === 'email'
        ? 'email automation app with abandoned cart recovery, order confirmations, and custom templates'
        : shopifyAppType === 'analytics'
        ? 'analytics dashboard with sales metrics, revenue trends, and top products'
        : 'Shopify app';

      systemPrompt = `Generate a complete Shopify app using Remix framework based on: ${prompt}. This is a ${appTypeDescription}.

REQUIRED TECH STACK:
- Framework: Remix (Shopify's recommended framework)
- UI Library: @shopify/polaris (use Polaris components exclusively)
- Auth: @shopify/shopify-app-remix
- API: @shopify/shopify-api (use GraphQL Admin API, not REST)
- Database: Prisma + PostgreSQL
- Styling: Shopify Polaris (no custom CSS unless absolutely necessary)

REQUIRED FILE STRUCTURE:
/shopify-app
  /app
    /routes
      _index.jsx              # Main app page (redirects to authenticated routes)
      app._index.jsx          # Authenticated app routes (main functionality)
      auth.$.jsx              # OAuth callback handler
      webhooks.jsx            # Shopify webhooks handler
    /components
      ProductList.jsx         # Example component (adapt based on app type)
      AppBridge.jsx           # Shopify App Bridge setup
    shopify.server.js        # Shopify authentication utilities
  /prisma
    schema.prisma             # Database schema for app data
  /public
    /images
  .env.example                # Environment variables template
  package.json                # Dependencies including @shopify/polaris, @shopify/shopify-app-remix, @shopify/shopify-api, @prisma/client, prisma
  remix.config.js            # Remix configuration
  shopify.app.toml           # Shopify app configuration file
  README.md                  # Setup instructions

REQUIRED COMPONENTS:
1. OAuth Authentication:
   - Use @shopify/shopify-app-remix authenticate.admin() for admin routes
   - Use authenticate.webhook() for webhook routes
   - Proper redirect handling

2. Shopify Polaris UI Components (use these exclusively):
   - Page (top-level wrapper)
   - Card (content containers)
   - DataTable (tabular data)
   - Button (actions)
   - TextField (inputs)
   - Select (dropdowns)
   - Modal (dialogs)
   - Toast (notifications via useToast hook)
   - Badge (status indicators)
   - EmptyState (no data states)
   - Layout (app layout)
   - Navigation (sidebar navigation)

3. GraphQL Queries:
   - Use Shopify Admin GraphQL API
   - Query products, orders, customers as needed
   - Include proper error handling

4. Webhooks (if applicable):
   - products/create, products/update
   - orders/create, orders/update
   - customers/create, customers/update
   - Include HMAC verification
   - Include GDPR webhooks: customers/data_request, customers/redact, shop/redact

5. Database Schema:
   - Use Prisma for database operations
   - Store app-specific data (reviews, inventory, etc.)
   - Link to Shopify IDs (product.id, order.id, etc.)

6. Error Handling:
   - Proper error boundaries
   - Loading states for all API calls
   - User-friendly error messages

7. App Configuration (shopify.app.toml):
   - name: App name
   - client_id: "YOUR_CLIENT_ID" (placeholder)
   - application_url: "https://your-app.fly.dev" (placeholder)
   - embedded: true
   - access_scopes: Appropriate scopes (read_products, write_products, read_orders, etc.)
   - auth.redirect_urls: OAuth callback URLs
   - webhooks: Configure webhook subscriptions

EXAMPLE STRUCTURE FOR ${shopifyAppType.toUpperCase()} APP:

app/routes/app._index.jsx should:
- Use authenticate.admin() to get admin GraphQL client
- Query Shopify data using GraphQL
- Display data using Polaris components
- Include proper loading and error states

app/routes/webhooks.jsx should:
- Use authenticate.webhook() for verification
- Handle webhook events
- Update database accordingly

shopify.app.toml should include:
- Proper scopes for the app type
- Webhook subscriptions
- OAuth redirect URLs

IMPORTANT:
- Return COMPLETE, FUNCTIONAL code, not boilerplate
- All files must be properly structured
- Include proper imports and dependencies
- Code should work out of the box after setup
- Use TypeScript where possible (but JavaScript is acceptable)
- Follow Shopify's embedded app guidelines
- Include proper App Bridge initialization
- Add proper error boundaries and loading states

Return all files with clear file path markers like:
// === app/routes/app._index.jsx ===
[code here]

// === shopify.app.toml ===
[config here]

// === package.json ===
[dependencies here]

Return only the complete code files without markdown formatting.`;
    } else if (template === 'api-wrapper-fastapi') {
      systemPrompt = `Generate a FastAPI backend API wrapper based on: ${prompt}. Include:
- FastAPI setup with CORS
- JWT authentication middleware
- Rate limiting using slowapi
- OpenAPI/Swagger documentation
- User registration and login endpoints
- Protected API proxy endpoint
- Error handling
- Production-ready structure

Return only the complete Python code without markdown formatting.`;
    } else if (template === 'api-wrapper-express') {
      systemPrompt = `Generate an Express.js backend API wrapper based on: ${prompt}. Include:
- Express setup with CORS and Helmet
- JWT authentication middleware
- Rate limiting
- Swagger/OpenAPI documentation
- User registration and login endpoints
- Protected API proxy endpoint
- Error handling
- Production-ready structure

Return only the complete JavaScript code without markdown formatting.`;
    } else if (template === 'supabase-starter') {
      systemPrompt = `Generate a Next.js + Supabase full-stack application based on: ${prompt}. Include:
- Complete Next.js 14 App Router structure
- Supabase authentication (email/password + OAuth)
- Database CRUD operations with Row Level Security
- Real-time subscriptions for live data updates
- File upload to Supabase Storage
- Protected routes with middleware
- User profile management
- Server-side and client-side Supabase clients
- TypeScript throughout
- Tailwind CSS styling
- Production-ready code structure

Return only the complete code files without markdown formatting. Include all necessary files: pages, components, lib utilities, database migrations, package.json, and README.`;
    } else if (template === 'chrome-extension') {
      systemPrompt = `Generate a Chrome Extension with AI integration based on: ${prompt}. Include:
- Manifest V3 configuration
- Background service worker script
- Content script for page interaction
- Popup HTML/CSS/JS with AI chat interface
- OpenAI API integration
- Message passing between components
- Storage for API keys and settings

Return only the complete code files without markdown formatting. Structure as separate files.`;
    } else if (template === 'discord-bot') {
      systemPrompt = `Generate a Discord.js bot based on: ${prompt}. Include:
- Bot initialization with Discord.js v14
- Command handler system (commands in separate files)
- Slash commands support
- Event listeners (ready, interactionCreate, messageCreate, guildMemberAdd)
- Error handling and logging
- Custom embeds using EmbedBuilder
- Moderation commands (kick, ban, clear) if needed
- Welcome messages for new members
- Reaction roles utility if requested
- Clean, commented code structure

Return only the complete JavaScript code files without markdown formatting. Structure as:
- index.js (main bot file)
- commands/ directory with command files
- events/ directory with event handlers
- utils/ directory for utilities
- package.json with discord.js dependency
- .env.example file
- README.md with setup instructions`;
    }

    // Get mode configuration (use Shopify config if Shopify app)
    const baseModeConfig = MODE_CONFIG[mode as keyof typeof MODE_CONFIG] || MODE_CONFIG.forge;
    const modeConfig = isShopifyApp 
      ? (SHOPIFY_MODE_CONFIG[mode as keyof typeof SHOPIFY_MODE_CONFIG] || SHOPIFY_MODE_CONFIG.forge)
      : baseModeConfig;

    // Early check for API key configuration (for Anthropic modes)
    if (modeConfig.provider === 'anthropic') {
      const { getAnthropicClientManager } = await import('@/lib/anthropic-client');
      const manager = getAnthropicClientManager();
      const keyCount = manager.getKeyCount();
      
      if (keyCount === 0) {
        console.error('[Generate] No Anthropic API keys configured');
        return NextResponse.json(
          { 
            error: 'No Anthropic API keys configured. Please add ANTHROPIC_API_KEY to your .env.local file.',
            details: 'Get your key from: https://console.anthropic.com/settings/keys',
            help: 'See ENV_CHECKLIST.md for setup instructions'
          },
          { status: 500 }
        );
      }
    }

    let code = '';
    let promptTokens = 0;
    let completionTokens = 0;
    let modelUsed = modeConfig.model;
    let usedFallback = false;

    // Execute request based on provider
    if (modeConfig.provider === 'openai') {
      // Use GPT-4o
      try {
        const gptResponse = await generateWithGPT(systemPrompt, modeConfig.maxTokens);
        code = gptResponse.text;
        promptTokens = gptResponse.usage?.prompt_tokens || 0;
        completionTokens = gptResponse.usage?.completion_tokens || 0;
        modelUsed = 'gpt-4o';
        console.log('[Generate] Used GPT-4o for generation');
      } catch (error: any) {
        console.error('[Generate] GPT-4o generation failed:', error);
        throw error;
      }
    } else {
      // Use Claude with fallback to GPT-4o
      try {
        const message = await executeAnthropicRequest(async (client) => {
          return client.messages.create({
            model: modeConfig.model,
            max_tokens: modeConfig.maxTokens,
            messages: [
              {
                role: 'user',
                content: systemPrompt,
              },
            ],
          });
        });

        // Extract token usage if available
        promptTokens = (message as any).usage?.input_tokens || 0;
        completionTokens = (message as any).usage?.output_tokens || 0;
        code = (message as any).content?.[0]?.text || '';
        modelUsed = modeConfig.model;
      } catch (error: any) {
        console.error('[Generate] Claude generation failed, attempting GPT-4o fallback:', error);
        
        // Fallback to GPT-4o if available
        if (isOpenAIAvailable()) {
          try {
            console.log('[Generate] Falling back to GPT-4o');
            const gptResponse = await generateWithGPT(systemPrompt, modeConfig.maxTokens);
            code = gptResponse.text;
            promptTokens = gptResponse.usage?.prompt_tokens || 0;
            completionTokens = gptResponse.usage?.completion_tokens || 0;
            modelUsed = 'gpt-4o';
            usedFallback = true;
            
            // Log fallback event
            await logGeneration(user.id, {
              mode: 'fallback',
              template: template || 'custom',
              prompt_length: prompt.length,
              response_time_ms: Date.now() - startTime,
              model_used: 'gpt-4o',
              used_fallback: true,
              fallback_reason: error.message || 'Claude API unavailable',
            });
            
            console.log('[Generate] Successfully used GPT-4o fallback');
          } catch (fallbackError: any) {
            console.error('[Generate] GPT-4o fallback also failed:', fallbackError);
            throw new Error('Claude unavailable, and GPT-4o fallback failed. Please try again later.');
          }
        } else {
          // No fallback available, throw original error
          throw error;
        }
      }
    }

    // Calculate and log cost (use actual model if fallback occurred)
    const generationId = `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const cost = calculateCost(mode, promptTokens, completionTokens, modelUsed);
    await logCost(user.id, generationId, cost);

    // Check and alert if user costs > $25 this month
    const monthlyCost = await getUserMonthlyCost(user.id);
    if (monthlyCost > 25) {
      console.warn(`[CostAlert] User ${user.id} (${user.email}) has exceeded $25 in costs this month: $${monthlyCost.toFixed(2)}`);
    }

    // Calculate response time
    const responseTime = Date.now() - startTime;

    // Log generation event
    await logGeneration(user.id, {
      mode,
      template: isShopifyApp ? 'shopify' : (template || 'custom'),
      prompt_length: prompt.length,
      response_time_ms: responseTime,
      model_used: modelUsed,
      used_fallback: usedFallback,
      shopify_app_type: isShopifyApp ? shopifyAppType : undefined,
      is_shopify_app: isShopifyApp,
    });

    // Track performance
    await trackPerformance({
      route: '/api/generate',
      method: 'POST',
      duration: responseTime,
      statusCode: 200,
      userId: user.id,
    });

    if (includeBranding) {
      // Append \"Made with VelocityApps\" badge for HTML/React outputs
      // Subtle: HTML comment for HTML, line comment for JS/React.
      const trimmed = code.trim();
      const looksLikeHtml = /<html|<body|<!DOCTYPE|<head|<\/?[a-z]+[^>]*>/i.test(trimmed);
      const looksLikeReact =
        trimmed.includes('export default') ||
        trimmed.includes('ReactDOM.createRoot') ||
        trimmed.includes('function App(') ||
        trimmed.includes('const App =') ||
        trimmed.includes('import React') ||
        trimmed.includes('React.createElement');

      if (looksLikeHtml) {
        code += '\n\n<!-- Made with VelocityApps - https://velocityapps.dev?ref=generated -->\n';
      } else if (looksLikeReact) {
        code += '\n\n// Made with VelocityApps - https://velocityapps.dev?ref=generated\n';
      } else {
        // Fallback: generic line comment that should be safe in most code
        code += '\n\n// Made with VelocityApps - https://velocityapps.dev?ref=generated\n';
      }
    }

    return NextResponse.json({ 
      code,
      creditsUsed: modeConfig.credits,
      mode: mode,
      modelUsed: modelUsed,
      usedFallback: usedFallback,
      rateLimit: {
        remaining: rateLimit.remaining,
        resetIn: rateLimit.resetIn,
      }
    });
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    // Track performance for error case
    await trackPerformance({
      route: '/api/generate',
      method: 'POST',
      duration: responseTime,
      statusCode: error.status || 500,
      userId: user?.id,
    });

    // Log error to monitoring
    await logError(error, {
      component: 'api/generate',
      route: '/api/generate',
      userId: user?.id,
    });

    console.error('Error calling Anthropic API:', error);
    
    // Return user-friendly error messages
    const errorMessage = error.message || 'Failed to generate code';
    
    // Check for specific error types
    if (errorMessage.includes('Too many requests')) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait 30 seconds.' },
        { status: 429 }
      );
    }
    
    // Check for API key configuration errors
    if (errorMessage.includes('No Anthropic API keys configured') || errorMessage.includes('No API keys available')) {
      console.error('[Generate] API key configuration error:', errorMessage);
      return NextResponse.json(
        { 
          error: 'API keys not configured. Please add ANTHROPIC_API_KEY to your .env.local file. See ENV_CHECKLIST.md for setup instructions.',
          details: 'Get your key from: https://console.anthropic.com/settings/keys'
        },
        { status: 500 }
      );
    }
    
    // Check for invalid API keys
    if (errorMessage.includes('All API keys are invalid') || errorMessage.includes('invalid key')) {
      console.error('[Generate] Invalid API keys error:', errorMessage);
      return NextResponse.json(
        { 
          error: 'API keys are invalid. Please verify your ANTHROPIC_API_KEY in .env.local is correct.',
          details: 'Keys should start with "sk-ant-api03-". Get a valid key from: https://console.anthropic.com/settings/keys'
        },
        { status: 500 }
      );
    }
    
    // Check for service unavailable (503)
    if (errorMessage.includes('Service temporarily unavailable') || errorMessage.includes('temporarily unavailable') || errorMessage.includes('503')) {
      return NextResponse.json(
        { error: 'Anthropic service is temporarily unavailable. Please try again in a few moments.' },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

