import OpenAI from 'openai';

/**
 * OpenAI API Client
 * 
 * Features:
 * - Initialize OpenAI client with API key
 * - Generate with GPT-4o model
 * - Error handling
 * - Token usage tracking
 */

let openaiClient: OpenAI | null = null;

/**
 * Get OpenAI client instance
 */
function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set in environment variables');
    }

    openaiClient = new OpenAI({
      apiKey,
    });

    console.log('[OpenAIClient] Initialized OpenAI client');
  }

  return openaiClient;
}

/**
 * Generate text with GPT-4o
 * 
 * @param prompt - The prompt to send to GPT-4o
 * @param maxTokens - Maximum tokens to generate (default: 4096)
 * @returns Promise with the generated text and usage information
 */
export async function generateWithGPT(
  prompt: string,
  maxTokens: number = 4096
): Promise<{
  text: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}> {
  try {
    const client = getOpenAIClient();

    console.log('[OpenAIClient] Generating with GPT-4o');

    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
    });

    const text = response.choices[0]?.message?.content || '';
    const usage = response.usage;

    console.log('[OpenAIClient] Generation complete', {
      tokens: usage?.total_tokens,
      promptTokens: usage?.prompt_tokens,
      completionTokens: usage?.completion_tokens,
    });

    return {
      text,
      usage: usage ? {
        prompt_tokens: usage.prompt_tokens,
        completion_tokens: usage.completion_tokens,
        total_tokens: usage.total_tokens,
      } : undefined,
    };
  } catch (error: any) {
    console.error('[OpenAIClient] Error generating with GPT-4o:', error);
    
    // Handle specific OpenAI errors
    if (error.status === 429) {
      throw new Error('OpenAI rate limit exceeded. Please try again later.');
    }
    
    if (error.status === 401) {
      throw new Error('Invalid OpenAI API key.');
    }

    throw error;
  }
}

/**
 * Check if OpenAI is available (API key is set)
 */
export function isOpenAIAvailable(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

