import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { executeAnthropicRequest, getAnthropicClientManager } from '@/lib/anthropic-client';
import { generateWithGPT } from '@/lib/openai-client';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const MODE_CONFIG = {
  turbo: { model: 'claude-haiku-3', provider: 'anthropic', maxTokens: 2048 },
  forge: { model: 'claude-sonnet-4', provider: 'anthropic', maxTokens: 4096 },
  anvil: { model: 'claude-opus-4', provider: 'anthropic', maxTokens: 8192 },
  gpt: { model: 'gpt-4o', provider: 'openai', maxTokens: 4096 },
};

/**
 * POST /api/generate/chat
 * Generate code with iterative chat mode - allows users to make changes like "make it blue", "add login form"
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { message, currentCode, conversationHistory = [], mode = 'forge', includeBranding = true } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Build conversation context
    const conversationMessages = [
      ...conversationHistory,
      { role: 'user' as const, content: message },
    ];

    // Create system prompt for iterative changes
    let systemPrompt = `You are an AI code assistant helping a user iteratively improve their code.

Current code:
\`\`\`
${currentCode || '// No code yet'}
\`\`\`

Conversation history:
${conversationHistory.map((msg: any) => `${msg.role}: ${msg.content}`).join('\n')}

User's latest request: ${message}

Instructions:
1. Understand what the user wants to change or add
2. Modify the existing code accordingly
3. Return ONLY the complete updated code (not just the changes)
4. Maintain code quality, structure, and best practices
5. If the user asks to "make it blue", change colors to blue
6. If the user asks to "add [feature]", add that feature to the code
7. If the user asks to "remove [element]", remove it from the code
8. Preserve existing functionality unless explicitly asked to change it
9. Return only code, no explanations or markdown formatting

Return the complete updated code:`;

    const modeConfig = MODE_CONFIG[mode as keyof typeof MODE_CONFIG] || MODE_CONFIG.forge;

    let code = '';
    let promptTokens = 0;
    let completionTokens = 0;
    let modelUsed = modeConfig.model;
    let usedFallback = false;

    // Execute request based on provider
    if (modeConfig.provider === 'openai') {
      try {
        const gptResponse = await generateWithGPT(systemPrompt, modeConfig.maxTokens);
        code = gptResponse.text;
        promptTokens = gptResponse.usage?.prompt_tokens || 0;
        completionTokens = gptResponse.usage?.completion_tokens || 0;
        modelUsed = 'gpt-4o';
      } catch (error: any) {
        console.error('[Generate/Chat] GPT-4o generation failed:', error);
        throw error;
      }
    } else {
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

        promptTokens = (message as any).usage?.input_tokens || 0;
        completionTokens = (message as any).usage?.output_tokens || 0;
        code = (message as any).content?.[0]?.text || '';
        modelUsed = modeConfig.model;
      } catch (error: any) {
        console.error('[Generate/Chat] Claude generation failed, trying GPT-4o fallback:', error);
        
        // Fallback to GPT-4o
        try {
          const gptResponse = await generateWithGPT(systemPrompt, modeConfig.maxTokens);
          code = gptResponse.text;
          promptTokens = gptResponse.usage?.prompt_tokens || 0;
          completionTokens = gptResponse.usage?.completion_tokens || 0;
          modelUsed = 'gpt-4o';
          usedFallback = true;
        } catch (fallbackError: any) {
          console.error('[Generate/Chat] Fallback also failed:', fallbackError);
          throw fallbackError;
        }
      }
    }

    // Clean up code (remove markdown if present)
    code = code.replace(/^```[\w]*\n?/gm, '').replace(/\n?```$/gm, '').trim();

    return NextResponse.json({
      code,
      modelUsed,
      usedFallback,
      tokens: {
        prompt: promptTokens,
        completion: completionTokens,
        total: promptTokens + completionTokens,
      },
    });
  } catch (error: any) {
    console.error('Error in chat generation:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate code' },
      { status: 500 }
    );
  }
}

