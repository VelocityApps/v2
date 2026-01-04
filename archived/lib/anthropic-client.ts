import Anthropic from '@anthropic-ai/sdk';

/**
 * Anthropic API Client with Key Rotation
 * 
 * Features:
 * - Loads multiple API keys from environment variables
 * - Automatically rotates to next key on 401/429 errors
 * - Retries failed requests with different keys
 * - Logs which key is being used for debugging
 */

interface AnthropicClientConfig {
  apiKeys: string[];
  currentKeyIndex: number;
}

class AnthropicClientManager {
  private config: AnthropicClientConfig;
  private clients: Map<string, Anthropic> = new Map();

  constructor() {
    // Load all available API keys from environment
    const apiKeys = this.loadApiKeys();
    
    if (apiKeys.length === 0) {
      console.error('[AnthropicClient] ❌ No API keys found in environment variables');
      console.error('[AnthropicClient] Please add ANTHROPIC_API_KEY to your .env.local file');
      console.error('[AnthropicClient] Get your key from: https://console.anthropic.com/settings/keys');
    } else {
      console.log(`[AnthropicClient] ✅ Loaded ${apiKeys.length} API key(s)`);
    }

    this.config = {
      apiKeys,
      currentKeyIndex: 0,
    };

    // Pre-create clients for all keys
    apiKeys.forEach((key, index) => {
      const client = new Anthropic({ apiKey: key });
      this.clients.set(key, client);
      console.log(`[AnthropicClient] Initialized client ${index + 1}/${apiKeys.length}`);
    });
  }

  /**
   * Load all available API keys from environment variables
   * Supports ANTHROPIC_API_KEY, ANTHROPIC_API_KEY_1, ANTHROPIC_API_KEY_2, etc.
   */
  private loadApiKeys(): string[] {
    const keys: string[] = [];

    // Check for primary key (backward compatibility)
    if (process.env.ANTHROPIC_API_KEY) {
      keys.push(process.env.ANTHROPIC_API_KEY);
    }

    // Check for numbered keys (ANTHROPIC_API_KEY_1, ANTHROPIC_API_KEY_2, ...)
    let index = 1;
    while (true) {
      const key = process.env[`ANTHROPIC_API_KEY_${index}`];
      if (!key) break;
      keys.push(key);
      index++;
    }

    // Remove duplicates
    return Array.from(new Set(keys));
  }

  /**
   * Get the current API key
   */
  private getCurrentKey(): string | null {
    if (this.config.apiKeys.length === 0) {
      return null;
    }
    return this.config.apiKeys[this.config.currentKeyIndex];
  }

  /**
   * Rotate to the next API key
   */
  private rotateKey(): void {
    if (this.config.apiKeys.length <= 1) {
      console.warn('[AnthropicClient] No alternative keys available for rotation');
      return;
    }

    const previousIndex = this.config.currentKeyIndex;
    this.config.currentKeyIndex = (this.config.currentKeyIndex + 1) % this.config.apiKeys.length;
    
    console.log(
      `[AnthropicClient] Rotated from key ${previousIndex + 1} to key ${this.config.currentKeyIndex + 1}`
    );
  }

  /**
   * Get the current Anthropic client instance
   */
  getClient(): Anthropic {
    const currentKey = this.getCurrentKey();
    
    if (!currentKey) {
      throw new Error('No Anthropic API keys configured');
    }

    const client = this.clients.get(currentKey);
    if (!client) {
      throw new Error(`Client not found for key index ${this.config.currentKeyIndex}`);
    }

    return client;
  }

  /**
   * Execute a request with automatic retry and key rotation
   */
  async executeWithRetry<T>(
    requestFn: (client: Anthropic) => Promise<T>,
    maxRetries: number = this.config.apiKeys.length
  ): Promise<T> {
    let lastError: Error | null = null;
    const initialKeyIndex = this.config.currentKeyIndex;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const currentKey = this.getCurrentKey();
        if (!currentKey) {
          throw new Error('No API keys available');
        }

        const client = this.getClient();
        console.log(
          `[AnthropicClient] Attempt ${attempt + 1}/${maxRetries} using key ${this.config.currentKeyIndex + 1}`
        );

        const result = await requestFn(client);
        
        // Success - log which key worked
        if (attempt > 0) {
          console.log(
            `[AnthropicClient] Success after ${attempt} retries with key ${this.config.currentKeyIndex + 1}`
          );
        }

        return result;
      } catch (error: any) {
        lastError = error;
        
        // Check if error is retryable (401 = invalid key, 429 = rate limit)
        const status = (error as any)?.status || (error as any)?.statusCode || (error as any)?.response?.status;
        const isRetryable = status === 401 || status === 429;

        if (!isRetryable) {
          // Non-retryable error (e.g., 400 bad request, 500 server error)
          console.error(`[AnthropicClient] Non-retryable error (${status}):`, error.message);
          throw error;
        }

        // Log the error
        if (status === 401) {
          console.warn(
            `[AnthropicClient] Invalid API key (401) on key ${this.config.currentKeyIndex + 1}, rotating...`
          );
        } else if (status === 429) {
          console.warn(
            `[AnthropicClient] Rate limit (429) on key ${this.config.currentKeyIndex + 1}, rotating...`
          );
        }

        // Rotate to next key if we have more attempts
        if (attempt < maxRetries - 1) {
          this.rotateKey();
          
          // If we've tried all keys, wait a bit before retrying
          if (this.config.currentKeyIndex === initialKeyIndex && attempt > 0) {
            const waitTime = Math.min(1000 * Math.pow(2, attempt), 10000); // Exponential backoff, max 10s
            console.log(`[AnthropicClient] All keys exhausted, waiting ${waitTime}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
      }
    }

    // All retries exhausted
    const lastErrorAny = lastError as any;
    const status = lastErrorAny?.status || lastErrorAny?.statusCode || lastErrorAny?.response?.status;
    const errorMessage = lastErrorAny?.message || 'Unknown error';
    
    // Check if we have any keys configured
    if (this.config.apiKeys.length === 0) {
      throw new Error('No Anthropic API keys configured. Please add ANTHROPIC_API_KEY to your .env.local file. Get your key from: https://console.anthropic.com/settings/keys');
    }
    
    if (status === 429) {
      console.error(`[AnthropicClient] All ${this.config.apiKeys.length} API key(s) are rate limited`);
      throw new Error('Too many requests. Please wait 30 seconds.');
    } else if (status === 401) {
      console.error(`[AnthropicClient] All ${this.config.apiKeys.length} API key(s) returned 401 (invalid key)`);
      console.error(`[AnthropicClient] Please verify your API keys are correct in .env.local`);
      console.error(`[AnthropicClient] Keys should start with 'sk-ant-api03-'`);
      throw new Error('All API keys are invalid. Please check your ANTHROPIC_API_KEY in .env.local. Get a valid key from: https://console.anthropic.com/settings/keys');
    } else if (status === 503 || errorMessage.includes('503') || errorMessage.includes('Service Unavailable')) {
      console.error(`[AnthropicClient] Anthropic service is temporarily unavailable (503)`);
      throw new Error('Anthropic service is temporarily unavailable. Please try again in a few moments.');
    }

    console.error(`[AnthropicClient] Request failed after ${maxRetries} attempts with status ${status}`);
    throw lastError || new Error(`Failed to execute request after all retries: ${errorMessage}`);
  }

  /**
   * Get the number of available API keys
   */
  getKeyCount(): number {
    return this.config.apiKeys.length;
  }

  /**
   * Get the current key index (1-based for logging)
   */
  getCurrentKeyIndex(): number {
    return this.config.currentKeyIndex + 1;
  }
}

// Singleton instance
let clientManager: AnthropicClientManager | null = null;

/**
 * Get the Anthropic client manager instance
 */
export function getAnthropicClientManager(): AnthropicClientManager {
  if (!clientManager) {
    clientManager = new AnthropicClientManager();
  }
  return clientManager;
}

/**
 * Execute a request with automatic retry and key rotation
 */
export async function executeAnthropicRequest<T>(
  requestFn: (client: Anthropic) => Promise<T>
): Promise<T> {
  const manager = getAnthropicClientManager();
  return manager.executeWithRetry(requestFn);
}

