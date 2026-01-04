# Anthropic API Key Rotation Setup

This guide explains how to configure multiple Anthropic API keys for automatic rotation and error handling.

## Overview

The Anthropic client now supports:
- **Multiple API keys** for automatic failover
- **Automatic key rotation** on 401 (invalid key) or 429 (rate limit) errors
- **Retry logic** with exponential backoff
- **Detailed logging** of which key is being used

## Environment Variables

Add these to your `.env.local` file:

```bash
# Primary key (backward compatible)
ANTHROPIC_API_KEY=sk-ant-api03-your-primary-key-here

# Additional keys for rotation (optional but recommended)
ANTHROPIC_API_KEY_1=sk-ant-api03-your-first-backup-key-here
ANTHROPIC_API_KEY_2=sk-ant-api03-your-second-backup-key-here
ANTHROPIC_API_KEY_3=sk-ant-api03-your-third-backup-key-here
# Add more as needed...
```

### Key Naming Convention

- `ANTHROPIC_API_KEY` - Primary key (required)
- `ANTHROPIC_API_KEY_1` - First backup key
- `ANTHROPIC_API_KEY_2` - Second backup key
- `ANTHROPIC_API_KEY_N` - Nth backup key

The system automatically detects all numbered keys and uses them in order.

## How It Works

### 1. Key Loading
On server startup, the client:
- Loads `ANTHROPIC_API_KEY` (primary)
- Scans for `ANTHROPIC_API_KEY_1`, `ANTHROPIC_API_KEY_2`, etc.
- Creates client instances for each key
- Logs how many keys were loaded

### 2. Request Execution
When making an API request:
- Uses the current active key
- Logs which key is being used (for debugging)

### 3. Error Handling & Rotation

**On 401 (Invalid Key):**
- Automatically rotates to the next available key
- Retries the request with the new key
- Logs the rotation for debugging

**On 429 (Rate Limit):**
- Rotates to the next key to distribute load
- Retries the request
- If all keys are rate-limited, waits with exponential backoff

**On Other Errors:**
- Non-retryable errors (400, 500, etc.) are thrown immediately
- No key rotation occurs

### 4. Retry Logic

- Maximum retries: Number of available keys
- Exponential backoff: If all keys fail, waits before retrying
- User-friendly error messages for rate limits and service unavailability

## Error Messages

The system returns user-friendly error messages:

- **Rate Limit (429):** "Too many requests. Please wait 30 seconds."
- **Invalid Key (401):** "Service temporarily unavailable. Try again soon."
- **Other Errors:** Original error message

## Logging

The client logs important events to help with debugging:

```
[AnthropicClient] Initialized client 1/3
[AnthropicClient] Initialized client 2/3
[AnthropicClient] Initialized client 3/3
[AnthropicClient] Attempt 1/3 using key 1
[AnthropicClient] Rate limit (429) on key 1, rotating...
[AnthropicClient] Rotated from key 1 to key 2
[AnthropicClient] Attempt 2/3 using key 2
[AnthropicClient] Success after 1 retries with key 2
```

## Best Practices

1. **Use Multiple Keys:** Having 2-3 backup keys ensures high availability
2. **Monitor Logs:** Check server logs to see which keys are being used
3. **Rotate Keys Regularly:** Update keys periodically for security
4. **Distribute Load:** Use different keys for different environments (dev/staging/prod)

## Example Configuration

### Development
```bash
ANTHROPIC_API_KEY=sk-ant-api03-dev-key-1
ANTHROPIC_API_KEY_1=sk-ant-api03-dev-key-2
```

### Production
```bash
ANTHROPIC_API_KEY=sk-ant-api03-prod-key-1
ANTHROPIC_API_KEY_1=sk-ant-api03-prod-key-2
ANTHROPIC_API_KEY_2=sk-ant-api03-prod-key-3
ANTHROPIC_API_KEY_3=sk-ant-api03-prod-key-4
```

## Troubleshooting

### "No API keys available"
- Check that `ANTHROPIC_API_KEY` is set in `.env.local`
- Restart your dev server after adding keys
- Verify keys are valid Anthropic API keys

### "All keys exhausted"
- All keys have been rate-limited or are invalid
- Wait a few minutes before retrying
- Check Anthropic dashboard for key status

### Keys not rotating
- Check server logs for rotation messages
- Verify multiple keys are configured
- Ensure keys are valid and not expired

## Migration from Single Key

If you're upgrading from a single key setup:

1. Your existing `ANTHROPIC_API_KEY` will continue to work
2. Add backup keys as `ANTHROPIC_API_KEY_1`, `ANTHROPIC_API_KEY_2`, etc.
3. No code changes needed - rotation happens automatically
4. Restart your server to load new keys

