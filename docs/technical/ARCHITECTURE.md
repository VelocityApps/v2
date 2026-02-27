# VelocityApps Technical Architecture

## 📊 Overview

This document outlines the technical architecture for VelocityApps, based on best practices from successful Shopify apps (Klaviyo, Recharge, Bold Commerce).

**Principles:**
- **Reliability First** - 99.9% uptime, graceful degradation
- **Scale Ready** - Handle 100k+ stores, millions of events/day
- **Security Focused** - Encrypt everything, validate all inputs
- **Developer Friendly** - Clear patterns, easy to extend

---

## 🏗️ System Architecture

### Multi-Tenant Database Design

**Pattern:** Single database, tenant isolation via `store_id`

**Why:** 
- Cost-effective (one DB vs thousands)
- Easier to maintain (one schema, one backup)
- Better analytics (cross-store insights)
- Industry standard (Klaviyo, Recharge use this)

**Implementation:**

```sql
-- Core tables with tenant isolation
CREATE TABLE user_automations (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  automation_id UUID NOT NULL,
  store_id TEXT NOT NULL, -- Shopify store domain
  shopify_access_token_encrypted TEXT NOT NULL, -- Encrypted
  status TEXT NOT NULL,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for fast tenant queries
  INDEX idx_user_automations_store_id (store_id),
  INDEX idx_user_automations_user_id (user_id),
  INDEX idx_user_automations_status (status)
);

-- Row Level Security (RLS) for tenant isolation
ALTER TABLE user_automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own automations"
  ON user_automations
  FOR ALL
  USING (auth.uid() = user_id);
```

**Best Practices:**
- ✅ Always filter by `store_id` in queries
- ✅ Use RLS policies for automatic tenant isolation
- ✅ Index `store_id` for fast queries
- ✅ Encrypt sensitive data (tokens, API keys)

**Reference:** Recharge uses similar pattern (single DB, tenant isolation)

---

### Webhook Handling

**Pattern:** Fast response (<2s), async processing, idempotent

**Why:**
- Shopify timeout: 5 seconds (must respond quickly)
- Webhooks can be retried (must be idempotent)
- Processing can be slow (move to background)

**Implementation:**

```typescript
// app/api/webhooks/shopify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/shopify/oauth';
import { queueWebhookProcessing } from '@/lib/queue';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('x-shopify-hmac-sha256');
  
  // 1. Verify signature (<100ms)
  const isValid = await verifyWebhookSignature(body, signature);
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }
  
  const event = JSON.parse(body);
  
  // 2. Check idempotency (<50ms)
  const eventId = event.id || `${event.topic}-${event.shop}-${Date.now()}`;
  const isDuplicate = await checkEventProcessed(eventId);
  if (isDuplicate) {
    return NextResponse.json({ received: true }); // Already processed
  }
  
  // 3. Queue for processing (<50ms)
  await queueWebhookProcessing({
    eventId,
    topic: event.topic,
    shop: event.shop,
    payload: event,
  });
  
  // 4. Respond immediately (<2s total)
  return NextResponse.json({ received: true }, { status: 200 });
}

// Background processing (async)
async function processWebhook(job: WebhookJob) {
  const { eventId, topic, shop, payload } = job;
  
  // Get store's automations
  const automations = await getActiveAutomationsForStore(shop);
  
  // Process each automation
  for (const automation of automations) {
    try {
      await automation.handleWebhook(topic, payload);
      await markEventProcessed(eventId, automation.id);
    } catch (error) {
      await logError(error, { automationId: automation.id, eventId });
      // Don't throw - continue processing other automations
    }
  }
}
```

**Best Practices:**
- ✅ Verify HMAC signature (prevent fake webhooks)
- ✅ Check idempotency (prevent duplicate processing)
- ✅ Respond quickly (<2s, queue for processing)
- ✅ Process async (background jobs)
- ✅ Handle errors gracefully (log, don't crash)

**Reference:** Klaviyo processes webhooks in <1s, queues for async processing

---

### Background Job Processing

**Pattern:** Queue system (BullMQ/Inngest) for long-running tasks

**Why:**
- Webhooks must respond quickly (<5s)
- Some tasks take minutes (Pinterest API calls, email sending)
- Need retries (exponential backoff)
- Need monitoring (see failed jobs)

**Implementation:**

```typescript
// lib/queue.ts
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';

const connection = new Redis(process.env.REDIS_URL);

// Queue for webhook processing
export const webhookQueue = new Queue('webhooks', { connection });

// Queue for automation execution
export const automationQueue = new Queue('automations', { connection });

// Worker for processing jobs
const worker = new Worker('automations', async (job) => {
  const { automationId, userAutomationId, event } = job.data;
  
  try {
    const automation = await getAutomation(automationId);
    await automation.execute(userAutomationId, event);
    
    // Track success
    await trackAutomationExecution(userAutomationId, true);
  } catch (error) {
    // Track failure
    await trackAutomationExecution(userAutomationId, false, error);
    
    // Retry with exponential backoff
    throw error; // BullMQ will retry automatically
  }
}, {
  connection,
  concurrency: 10, // Process 10 jobs concurrently
  limiter: {
    max: 100, // Max 100 jobs
    duration: 1000, // Per second
  },
});

// Add job to queue
export async function queueAutomationExecution(
  automationId: string,
  userAutomationId: string,
  event: any
) {
  await automationQueue.add('execute', {
    automationId,
    userAutomationId,
    event,
  }, {
    attempts: 3, // Retry 3 times
    backoff: {
      type: 'exponential',
      delay: 2000, // Start with 2s delay
    },
    removeOnComplete: {
      age: 3600, // Keep completed jobs for 1 hour
    },
    removeOnFail: {
      age: 86400, // Keep failed jobs for 24 hours
  },
  });
}
```

**Best Practices:**
- ✅ Use Redis for queue (fast, reliable)
- ✅ Set concurrency limits (don't overwhelm APIs)
- ✅ Exponential backoff (retry with delays)
- ✅ Dead letter queue (handle permanently failed jobs)
- ✅ Monitor queue depth (alert if queue grows)

**Reference:** Recharge uses BullMQ for subscription processing

---

### Rate Limiting

**Pattern:** Token bucket algorithm, per-store limits

**Why:**
- Shopify: 2 requests/second per store
- Pinterest: 200 requests/hour
- Prevent abuse
- Fair resource allocation

**Implementation:**

```typescript
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
});

// Shopify rate limiter (2 req/sec per store)
export const shopifyRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(2, '1 s'),
  analytics: true,
  prefix: 'ratelimit:shopify',
});

// Pinterest rate limiter (200 req/hour)
export const pinterestRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(200, '1 h'),
  analytics: true,
  prefix: 'ratelimit:pinterest',
});

// Use in API calls
export async function callShopifyAPI(storeId: string, endpoint: string) {
  // Check rate limit
  const { success, limit, remaining, reset } = await shopifyRateLimit.limit(storeId);
  
  if (!success) {
    throw new RateLimitError(
      `Rate limit exceeded. ${remaining}/${limit} remaining. Resets at ${new Date(reset)}`
    );
  }
  
  // Make API call
  const response = await fetch(`https://${storeId}/admin/api/2024-01/${endpoint}`, {
    headers: {
      'X-Shopify-Access-Token': await getAccessToken(storeId),
    },
  });
  
  return response.json();
}
```

**Best Practices:**
- ✅ Per-store limits (isolate stores)
- ✅ Token bucket algorithm (smooth rate limiting)
- ✅ Return rate limit headers (X-RateLimit-*)
- ✅ Graceful handling (queue for later, don't fail)
- ✅ Monitor rate limit hits (alert if frequent)

**Reference:** Klaviyo uses similar pattern (per-store rate limiting)

---

### Error Handling & Retries

**Pattern:** Exponential backoff, circuit breakers, dead letter queues

**Why:**
- APIs fail (network issues, rate limits, downtime)
- Retries help (transient failures)
- Circuit breakers prevent cascading failures
- Dead letter queues handle permanent failures

**Implementation:**

```typescript
// lib/retry.ts
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffMultiplier = 2,
  } = options;
  
  let lastError: Error;
  let delay = initialDelay;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on 4xx errors (client errors)
      if (error.status >= 400 && error.status < 500) {
        throw error;
      }
      
      // Don't retry on last attempt
      if (attempt === maxAttempts) {
        break;
      }
      
      // Wait before retry
      await sleep(delay);
      
      // Exponential backoff
      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }
  
  throw lastError!;
}

// Circuit breaker pattern
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  constructor(
    private threshold: number = 5,
    private timeout: number = 60000
  ) {}
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess() {
    this.failures = 0;
    this.state = 'closed';
  }
  
  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'open';
    }
  }
}

// Use circuit breaker for external APIs
const pinterestCircuitBreaker = new CircuitBreaker(5, 60000);

export async function callPinterestAPI(endpoint: string) {
  return pinterestCircuitBreaker.execute(async () => {
    return await fetch(`https://api.pinterest.com/v5/${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${process.env.PINTEREST_ACCESS_TOKEN}`,
      },
    });
  });
}
```

**Best Practices:**
- ✅ Exponential backoff (1s, 2s, 4s, 8s)
- ✅ Don't retry 4xx errors (client errors)
- ✅ Circuit breakers (stop calling failing services)
- ✅ Dead letter queues (handle permanent failures)
- ✅ Log all retries (monitor retry patterns)

**Reference:** Bold Commerce uses circuit breakers for external APIs

---

### Monitoring & Alerting

**Pattern:** Structured logging, metrics, alerts

**Why:**
- Know when automations fail (before customers complain)
- Track performance (response times, success rates)
- Debug issues (structured logs)
- Alert on critical failures

**Implementation:**

```typescript
// lib/monitoring.ts
import { logError, logEvent } from '@/lib/monitoring';

// Track automation execution
export async function trackAutomationExecution(
  userAutomationId: string,
  success: boolean,
  executionTime: number,
  error?: Error
) {
  // Log to database
  await logEvent('automation_execution', {
    userAutomationId,
    success,
    executionTime,
    error: error?.message,
  });
  
  // Log to monitoring service (Sentry)
  if (!success && error) {
    await logError(error, {
      component: 'automation',
      userAutomationId,
      executionTime,
    });
  }
  
  // Alert on critical failures
  if (!success && error?.message.includes('store')) {
    await sendAlert({
      severity: 'critical',
      message: `Automation failed for store: ${userAutomationId}`,
      error: error.message,
    });
  }
}

// Metrics tracking
export class Metrics {
  private static metrics: Map<string, number[]> = new Map();
  
  static record(metric: string, value: number) {
    if (!this.metrics.has(metric)) {
      this.metrics.set(metric, []);
    }
    this.metrics.get(metric)!.push(value);
  }
  
  static getAverage(metric: string): number {
    const values = this.metrics.get(metric) || [];
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
  
  static getP95(metric: string): number {
    const values = this.metrics.get(metric) || [];
    const sorted = values.sort((a, b) => a - b);
    const index = Math.floor(sorted.length * 0.95);
    return sorted[index] || 0;
  }
}

// Use in code
Metrics.record('webhook_response_time', responseTime);
Metrics.record('automation_execution_time', executionTime);

// Alert if metrics exceed thresholds
if (Metrics.getP95('webhook_response_time') > 2000) {
  await sendAlert({
    severity: 'warning',
    message: 'Webhook response time P95 > 2s',
  });
}
```

**Best Practices:**
- ✅ Structured logging (JSON format)
- ✅ Track key metrics (response time, success rate)
- ✅ Alert on thresholds (P95 > 2s, error rate > 1%)
- ✅ Use monitoring service (Sentry, DataDog)
- ✅ Dashboard for visibility (Grafana, custom)

**Reference:** Klaviyo has comprehensive monitoring (response times, error rates, queue depth)

---

### Security

**Pattern:** Encrypt sensitive data, validate all inputs, audit logging

**Why:**
- Shopify tokens are sensitive (full store access)
- Webhooks can be faked (must verify signatures)
- SQL injection is dangerous (parameterized queries)
- Need audit trail (who did what when)

**Implementation:**

```typescript
// lib/security.ts
import crypto from 'crypto';

// Encrypt Shopify access tokens
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!;
const ALGORITHM = 'aes-256-gcm';

export async function encryptToken(token: string): Promise<string> {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Return: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export async function decryptToken(encryptedToken: string): Promise<string> {
  const [ivHex, authTagHex, encrypted] = encryptedToken.split(':');
  
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// Validate webhook signatures
export async function verifyWebhookSignature(
  body: string,
  signature: string | null
): Promise<boolean> {
  if (!signature) return false;
  
  const hmac = crypto.createHmac('sha256', process.env.SHOPIFY_WEBHOOK_SECRET!);
  hmac.update(body, 'utf8');
  const hash = hmac.digest('base64');
  
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
}

// SQL injection prevention (use parameterized queries)
export async function getAutomationsForStore(storeId: string) {
  // ✅ Good: Parameterized query
  const { data } = await supabase
    .from('user_automations')
    .select('*')
    .eq('store_id', storeId); // Parameterized, safe
  
  // ❌ Bad: String concatenation (vulnerable to SQL injection)
  // const query = `SELECT * FROM user_automations WHERE store_id = '${storeId}'`;
  
  return data;
}

// XSS prevention (sanitize user input)
import DOMPurify from 'isomorphic-dompurify';

export function sanitizeInput(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // No HTML tags
    ALLOWED_ATTR: [], // No attributes
  });
}

// Audit logging
export async function auditLog(
  userId: string,
  action: string,
  resource: string,
  details?: any
) {
  await supabase.from('audit_logs').insert({
    user_id: userId,
    action,
    resource,
    details,
    ip_address: getClientIP(),
    user_agent: getUserAgent(),
    timestamp: new Date(),
  });
}
```

**Best Practices:**
- ✅ Encrypt all tokens (AES-256-GCM)
- ✅ Verify webhook signatures (HMAC-SHA256)
- ✅ Parameterized queries (prevent SQL injection)
- ✅ Sanitize user input (prevent XSS)
- ✅ Audit logging (who did what when)
- ✅ HTTPS everywhere (no HTTP)
- ✅ Rate limiting (prevent abuse)

**Reference:** Recharge encrypts all Shopify tokens, validates all webhooks

---

## 📈 Scalability Patterns

### Database Indexing Strategy

**Pattern:** Index frequently queried columns, composite indexes for common queries

**Why:**
- Fast queries at scale (100k+ stores)
- Slow queries = slow app
- Indexes speed up SELECT, WHERE, JOIN

**Implementation:**

```sql
-- Core indexes
CREATE INDEX idx_user_automations_store_id ON user_automations(store_id);
CREATE INDEX idx_user_automations_user_id ON user_automations(user_id);
CREATE INDEX idx_user_automations_status ON user_automations(status);

-- Composite index for common query pattern
CREATE INDEX idx_user_automations_store_status 
  ON user_automations(store_id, status) 
  WHERE status = 'active';

-- Index for JSONB queries (automation config)
CREATE INDEX idx_user_automations_config_gin 
  ON user_automations USING GIN (config);

-- Index for time-based queries
CREATE INDEX idx_automation_logs_created_at 
  ON automation_logs(created_at DESC);

-- Partial index for active automations only
CREATE INDEX idx_user_automations_active 
  ON user_automations(id, store_id) 
  WHERE status = 'active';
```

**Best Practices:**
- ✅ Index foreign keys (user_id, automation_id)
- ✅ Index frequently filtered columns (status, store_id)
- ✅ Composite indexes for common query patterns
- ✅ Partial indexes for filtered queries (WHERE status = 'active')
- ✅ Monitor query performance (slow query log)

**Reference:** Klaviyo uses similar indexing strategy (composite indexes for common queries)

---

### Caching Layers

**Pattern:** Redis for frequently accessed data, cache invalidation strategy

**Why:**
- Reduce database load (cache hits = no DB query)
- Faster response times (Redis <1ms vs DB 10-50ms)
- Cost-effective (Redis cheaper than DB queries)

**Implementation:**

```typescript
// lib/cache.ts
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export class Cache {
  private static defaultTTL = 3600; // 1 hour
  
  static async get<T>(key: string): Promise<T | null> {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  }
  
  static async set(key: string, value: any, ttl?: number): Promise<void> {
    await redis.setex(key, ttl || this.defaultTTL, JSON.stringify(value));
  }
  
  static async invalidate(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}

// Cache automation configs
export async function getAutomationConfig(userAutomationId: string) {
  const cacheKey = `automation:config:${userAutomationId}`;
  
  // Try cache first
  const cached = await Cache.get(cacheKey);
  if (cached) return cached;
  
  // Fetch from database
  const { data } = await supabase
    .from('user_automations')
    .select('config')
    .eq('id', userAutomationId)
    .single();
  
  // Cache for 1 hour
  await Cache.set(cacheKey, data.config, 3600);
  
  return data.config;
}

// Invalidate cache on update
export async function updateAutomationConfig(
  userAutomationId: string,
  config: any
) {
  await supabase
    .from('user_automations')
    .update({ config })
    .eq('id', userAutomationId);
  
  // Invalidate cache
  await Cache.invalidate(`automation:config:${userAutomationId}`);
}
```

**Best Practices:**
- ✅ Cache frequently accessed data (automation configs, store info)
- ✅ Set appropriate TTL (1 hour for configs, 5 minutes for dynamic data)
- ✅ Invalidate on updates (don't serve stale data)
- ✅ Use cache keys with prefixes (automation:config:*)
- ✅ Monitor cache hit rate (aim for >80%)

**Reference:** Recharge caches subscription data (reduces DB load by 70%)

---

### Queue Systems

**Pattern:** BullMQ for job queues, Inngest for workflow orchestration

**Why:**
- Handle long-running tasks (Pinterest API calls, email sending)
- Retry failed jobs (exponential backoff)
- Monitor queue depth (alert if queue grows)
- Scale workers independently (add more workers as needed)

**Implementation:**

```typescript
// lib/queue.ts (already shown above, but here's more detail)

// Queue configuration
export const automationQueue = new Queue('automations', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 3600, // Keep completed jobs for 1 hour
      count: 1000, // Keep last 1000 jobs
    },
    removeOnFail: {
      age: 86400, // Keep failed jobs for 24 hours
    },
  },
});

// Worker configuration
const worker = new Worker('automations', processAutomationJob, {
  connection: redis,
  concurrency: 10, // Process 10 jobs concurrently
  limiter: {
    max: 100, // Max 100 jobs
    duration: 1000, // Per second
  },
});

// Monitor queue depth
setInterval(async () => {
  const waiting = await automationQueue.getWaitingCount();
  const active = await automationQueue.getActiveCount();
  const completed = await automationQueue.getCompletedCount();
  const failed = await automationQueue.getFailedCount();
  
  // Alert if queue depth > 1000
  if (waiting > 1000) {
    await sendAlert({
      severity: 'warning',
      message: `Queue depth is high: ${waiting} jobs waiting`,
    });
  }
  
  // Log metrics
  Metrics.record('queue_waiting', waiting);
  Metrics.record('queue_active', active);
  Metrics.record('queue_completed', completed);
  Metrics.record('queue_failed', failed);
}, 60000); // Every minute
```

**Best Practices:**
- ✅ Use Redis for queue (fast, reliable)
- ✅ Set concurrency limits (don't overwhelm APIs)
- ✅ Monitor queue depth (alert if queue grows)
- ✅ Dead letter queue (handle permanently failed jobs)
- ✅ Scale workers independently (add more workers as needed)

**Reference:** Klaviyo uses similar queue system (processes millions of jobs/day)

---

### Horizontal Scaling

**Pattern:** Stateless servers, load balancer, shared Redis/DB

**Why:**
- Scale by adding servers (not upgrading hardware)
- Handle traffic spikes (Black Friday, sales)
- Cost-effective (pay for what you use)

**Implementation:**

```typescript
// All servers are stateless (no local state)
// - All state in database/Redis
// - All servers can handle any request
// - Load balancer distributes traffic

// Example: Next.js API routes are stateless
export async function POST(request: NextRequest) {
  // No local state - everything from DB/Redis
  const data = await request.json();
  const result = await processRequest(data);
  return NextResponse.json(result);
}

// Load balancer configuration (Vercel/Cloudflare)
// - Health checks on /api/health
// - Auto-scale based on traffic
// - Distribute traffic across servers
```

**Best Practices:**
- ✅ Stateless servers (no local state)
- ✅ Shared database (all servers use same DB)
- ✅ Shared Redis (all servers use same cache)
- ✅ Load balancer (distribute traffic)
- ✅ Health checks (remove unhealthy servers)

**Reference:** Recharge scales horizontally (adds servers during peak times)

---

### Database Connection Pooling

**Pattern:** Connection pool, limit connections per server

**Why:**
- Database has connection limit (typically 100-1000)
- Each server needs connections (but not unlimited)
- Connection pooling reuses connections (efficient)

**Implementation:**

```typescript
// lib/db.ts
import { createClient } from '@supabase/supabase-js';

// Supabase client with connection pooling
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'x-connection-pool-size': '10', // Max 10 connections per server
      },
    },
  }
);

// For direct PostgreSQL connections (if needed)
import { Pool } from 'pg';

export const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10, // Max 10 connections per server
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

**Best Practices:**
- ✅ Limit connections per server (10-20)
- ✅ Use connection pooling (reuse connections)
- ✅ Monitor connection usage (alert if high)
- ✅ Set idle timeout (close idle connections)

**Reference:** Klaviyo uses connection pooling (limits connections per server)

---

### CDN for Static Assets

**Pattern:** CDN for images, fonts, JS bundles

**Why:**
- Faster load times (CDN closer to users)
- Reduce server load (static assets from CDN)
- Cost-effective (CDN cheaper than server bandwidth)

**Implementation:**

```typescript
// next.config.ts
const nextConfig = {
  // Use Vercel CDN (automatic)
  // Or configure custom CDN
  assetPrefix: process.env.CDN_URL,
  
  // Optimize images
  images: {
    domains: ['cdn.velocityapps.com'],
    formats: ['image/avif', 'image/webp'],
  },
};

// Serve static assets from CDN
// - Upload to CDN on build
// - Reference CDN URLs in code
// - Cache for 1 year (immutable assets)
```

**Best Practices:**
- ✅ Use CDN for static assets (images, fonts, JS)
- ✅ Cache for long time (1 year for immutable assets)
- ✅ Optimize images (WebP, AVIF formats)
- ✅ Monitor CDN performance (cache hit rate)

**Reference:** All major apps use CDN (Cloudflare, CloudFront, Vercel)

---

## 🔒 Reliability Patterns

### Webhook Signature Verification

**Pattern:** HMAC-SHA256 verification, reject invalid signatures

**Why:**
- Webhooks can be faked (must verify signatures)
- Security critical (unauthorized webhooks = data breach)
- Industry standard (all major apps verify signatures)

**Implementation:**

```typescript
// lib/shopify/oauth.ts (already shown, but here's the full version)

export async function verifyWebhookSignature(
  body: string,
  signature: string | null
): Promise<boolean> {
  if (!signature) {
    return false;
  }
  
  const hmac = crypto.createHmac('sha256', process.env.SHOPIFY_WEBHOOK_SECRET!);
  hmac.update(body, 'utf8');
  const hash = hmac.digest('base64');
  
  // Use timing-safe comparison (prevent timing attacks)
  return crypto.timingSafeEqual(
    Buffer.from(hash),
    Buffer.from(signature)
  );
}

// Use in webhook handler
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('x-shopify-hmac-sha256');
  
  if (!await verifyWebhookSignature(body, signature)) {
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 401 }
    );
  }
  
  // Process webhook...
}
```

**Best Practices:**
- ✅ Always verify signatures (never skip)
- ✅ Use timing-safe comparison (prevent timing attacks)
- ✅ Reject invalid signatures (401 Unauthorized)
- ✅ Log signature failures (monitor for attacks)

**Reference:** All major apps verify webhook signatures (Klaviyo, Recharge, Bold)

---

### Idempotency

**Pattern:** Process each event exactly once, use event IDs

**Why:**
- Webhooks can be retried (Shopify retries failed webhooks)
- Duplicate processing = duplicate actions (bad)
- Idempotency = safe to retry

**Implementation:**

```typescript
// lib/idempotency.ts
export async function isEventProcessed(eventId: string): Promise<boolean> {
  const cacheKey = `event:processed:${eventId}`;
  const processed = await Cache.get(cacheKey);
  return !!processed;
}

export async function markEventProcessed(
  eventId: string,
  result?: any
): Promise<void> {
  const cacheKey = `event:processed:${eventId}`;
  await Cache.set(cacheKey, result || true, 86400); // 24 hours
}

// Use in webhook handler
export async function POST(request: NextRequest) {
  const event = await request.json();
  const eventId = event.id || `${event.topic}-${event.shop}-${Date.now()}`;
  
  // Check if already processed
  if (await isEventProcessed(eventId)) {
    return NextResponse.json({ received: true }); // Already processed
  }
  
  // Process event
  await processWebhook(event);
  
  // Mark as processed
  await markEventProcessed(eventId);
  
  return NextResponse.json({ received: true });
}
```

**Best Practices:**
- ✅ Use event IDs (Shopify provides event.id)
- ✅ Check before processing (prevent duplicates)
- ✅ Mark after processing (cache for 24 hours)
- ✅ Handle race conditions (use Redis SETNX)

**Reference:** Klaviyo uses idempotency (processes each event exactly once)

---

### Dead Letter Queues

**Pattern:** Queue for permanently failed jobs, manual review

**Why:**
- Some jobs fail permanently (invalid data, API changes)
- Need to review failures (fix issues, retry manually)
- Prevent queue from filling with failed jobs

**Implementation:**

```typescript
// lib/queue.ts
const deadLetterQueue = new Queue('dead-letters', { connection });

// Worker with dead letter queue
const worker = new Worker('automations', async (job) => {
  try {
    await processJob(job);
  } catch (error: any) {
    // If job failed after all retries
    if (job.attemptsMade >= job.opts.attempts!) {
      // Move to dead letter queue
      await deadLetterQueue.add('failed-job', {
        originalJob: job.data,
        error: error.message,
        failedAt: new Date(),
      });
      
      // Alert team
      await sendAlert({
        severity: 'error',
        message: `Job permanently failed: ${job.id}`,
        error: error.message,
      });
    }
    
    throw error; // Let BullMQ handle retry
  }
}, {
  connection,
  maxStalledCount: 1, // Mark as failed after 1 stall
});

// Review dead letter queue
export async function reviewDeadLetterQueue() {
  const jobs = await deadLetterQueue.getJobs(['failed'], 0, 100);
  
  for (const job of jobs) {
    // Review each failed job
    // - Fix data issues
    // - Retry manually
    // - Delete if not fixable
  }
}
```

**Best Practices:**
- ✅ Move permanently failed jobs to DLQ
- ✅ Alert team on DLQ additions
- ✅ Review DLQ regularly (daily)
- ✅ Retry manually after fixing issues

**Reference:** Recharge uses dead letter queues (reviews failed subscription jobs)

---

### Circuit Breakers

**Pattern:** Stop calling failing services, auto-recover after timeout

**Why:**
- External APIs can fail (Pinterest down, Shopify rate limit)
- Cascading failures (one failure causes more failures)
- Circuit breakers prevent cascading failures

**Implementation:**

```typescript
// lib/circuit-breaker.ts (already shown above, but here's more detail)

class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  constructor(
    private threshold: number = 5,
    private timeout: number = 60000,
    private name: string = 'circuit-breaker'
  ) {}
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // If open, check if timeout has passed
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open'; // Try again
      } else {
        throw new CircuitBreakerOpenError(
          `Circuit breaker ${this.name} is open`
        );
      }
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess() {
    this.failures = 0;
    this.state = 'closed';
  }
  
  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'open';
      
      // Alert team
      sendAlert({
        severity: 'warning',
        message: `Circuit breaker ${this.name} opened`,
      });
    }
  }
}

// Use for external APIs
const pinterestCircuitBreaker = new CircuitBreaker(5, 60000, 'pinterest');

export async function callPinterestAPI(endpoint: string) {
  return pinterestCircuitBreaker.execute(async () => {
    const response = await fetch(`https://api.pinterest.com/v5/${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${process.env.PINTEREST_ACCESS_TOKEN}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Pinterest API error: ${response.statusText}`);
    }
    
    return response.json();
  });
}
```

**Best Practices:**
- ✅ Use circuit breakers for external APIs
- ✅ Set appropriate thresholds (5 failures = open)
- ✅ Auto-recover after timeout (60 seconds)
- ✅ Alert on circuit breaker open
- ✅ Monitor circuit breaker state

**Reference:** Bold Commerce uses circuit breakers (prevents cascading failures)

---

### Graceful Degradation

**Pattern:** If service down, queue for later, don't fail completely

**Why:**
- External services can fail (Pinterest API down)
- Don't break entire automation (just queue for later)
- Better UX (automation continues, retries later)

**Implementation:**

```typescript
// lib/automations/pinterest-stock-sync.ts
export class PinterestStockSync extends BaseAutomation {
  async execute(userAutomationId: string, event: any) {
    try {
      // Try to call Pinterest API
      await this.pinProduct(event.product);
    } catch (error: any) {
      // If Pinterest API is down, queue for later
      if (error.status === 503 || error.message.includes('timeout')) {
        await queueForLater({
          userAutomationId,
          event,
          retryAfter: 3600, // Retry in 1 hour
        });
        
        // Log but don't fail
        await logWarning('Pinterest API down, queued for later', {
          userAutomationId,
          error: error.message,
        });
        
        return; // Don't throw - graceful degradation
      }
      
      // Other errors - throw (will be retried)
      throw error;
    }
  }
}
```

**Best Practices:**
- ✅ Queue for later on service downtime
- ✅ Don't fail entire automation (just queue)
- ✅ Log warnings (monitor service health)
- ✅ Retry after timeout (1 hour, 6 hours, 24 hours)

**Reference:** Klaviyo uses graceful degradation (queues emails if service down)

---

### Health Checks

**Pattern:** Monitor all automations, alert on failures

**Why:**
- Know when automations fail (before customers complain)
- Track automation health (success rate, execution time)
- Alert on critical failures (store broken, API down)

**Implementation:**

```typescript
// app/api/health/route.ts
export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      shopify: await checkShopifyAPI(),
      pinterest: await checkPinterestAPI(),
      queue: await checkQueue(),
    },
  };
  
  // If any check fails, status is unhealthy
  const allHealthy = Object.values(health.checks).every(c => c.status === 'healthy');
  health.status = allHealthy ? 'healthy' : 'unhealthy';
  
  return NextResponse.json(health, {
    status: allHealthy ? 200 : 503,
  });
}

async function checkDatabase() {
  try {
    const { data } = await supabase.from('user_automations').select('id').limit(1);
    return { status: 'healthy', responseTime: Date.now() };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
}

// Monitor automation health
export async function checkAutomationHealth() {
  const automations = await getActiveAutomations();
  
  for (const automation of automations) {
    const metrics = await getAutomationMetrics(automation.id);
    
    // Alert if success rate < 95%
    if (metrics.successRate < 0.95) {
      await sendAlert({
        severity: 'warning',
        message: `Automation ${automation.name} success rate is ${metrics.successRate}%`,
      });
    }
    
    // Alert if error rate > 5%
    if (metrics.errorRate > 0.05) {
      await sendAlert({
        severity: 'error',
        message: `Automation ${automation.name} error rate is ${metrics.errorRate}%`,
      });
    }
  }
}
```

**Best Practices:**
- ✅ Health check endpoint (/api/health)
- ✅ Check all dependencies (DB, Redis, APIs)
- ✅ Monitor automation health (success rate, error rate)
- ✅ Alert on thresholds (success rate < 95%, error rate > 5%)

**Reference:** All major apps have health checks (Klaviyo, Recharge, Bold)

---

## 📁 Code Organization

### Automation Base Class

**Pattern:** Shared logic in base class, specific logic in subclasses

**Why:**
- DRY principle (don't repeat code)
- Consistent behavior (all automations work the same)
- Easy to add new automations (extend base class)

**Implementation:**

```typescript
// lib/automations/base.ts
export abstract class BaseAutomation {
  constructor(
    public name: string,
    public slug: string,
    protected supabaseAdmin: any
  ) {}
  
  // Shared methods
  protected async log(
    userAutomationId: string,
    type: 'success' | 'error' | 'warning' | 'info',
    message: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.supabaseAdmin.from('automation_logs').insert({
      user_automation_id: userAutomationId,
      event_type: type,
      message,
      metadata: metadata || {},
    });
  }
  
  protected async getConfig(userAutomationId: string): Promise<any> {
    const { data } = await this.supabaseAdmin
      .from('user_automations')
      .select('config')
      .eq('id', userAutomationId)
      .single();
    
    return data?.config || {};
  }
  
  protected async getShopifyToken(storeId: string): Promise<string> {
    const { data } = await this.supabaseAdmin
      .from('user_automations')
      .select('shopify_access_token_encrypted')
      .eq('store_id', storeId)
      .eq('status', 'active')
      .single();
    
    return decryptToken(data.shopify_access_token_encrypted);
  }
  
  // Abstract methods (must be implemented by subclasses)
  abstract install(userAutomationId: string, config: any): Promise<void>;
  abstract execute(userAutomationId: string, event: any): Promise<void>;
  abstract handleWebhook(topic: string, payload: any): Promise<void>;
}

// Specific automation
export class PinterestStockSync extends BaseAutomation {
  constructor() {
    super('Pinterest Stock Sync', 'pinterest-stock-sync', supabaseAdmin);
  }
  
  async install(userAutomationId: string, config: any): Promise<void> {
    // Specific installation logic
    await this.log(userAutomationId, 'info', 'Pinterest Stock Sync installed');
  }
  
  async execute(userAutomationId: string, event: any): Promise<void> {
    // Specific execution logic
    const config = await this.getConfig(userAutomationId);
    await this.pinProduct(event.product, config);
    await this.log(userAutomationId, 'success', 'Product pinned to Pinterest');
  }
  
  async handleWebhook(topic: string, payload: any): Promise<void> {
    // Specific webhook handling
    if (topic === 'products/update') {
      await this.execute(payload.user_automation_id, payload);
    }
  }
  
  private async pinProduct(product: any, config: any): Promise<void> {
    // Pinterest-specific logic
  }
}
```

**Best Practices:**
- ✅ Shared logic in base class (logging, config, tokens)
- ✅ Specific logic in subclasses (install, execute, webhook)
- ✅ Abstract methods (force implementation)
- ✅ Consistent interface (all automations work the same)

**Reference:** Current codebase uses this pattern (BaseAutomation class)

---

### Plugin Architecture

**Pattern:** Easy to add new automations, register in registry

**Why:**
- Fast development (add new automation in days, not weeks)
- Consistent interface (all automations work the same)
- Easy to test (test each automation independently)

**Implementation:**

```typescript
// lib/automations/registry.ts
import { BaseAutomation } from './base';
import { PinterestStockSync } from './pinterest-stock-sync';
import { ReviewRequestAutomator } from './review-request-automator';
// ... import all automations

export class AutomationRegistry {
  private automations: Map<string, BaseAutomation> = new Map();
  
  constructor() {
    // Register all automations
    this.register(new PinterestStockSync());
    this.register(new ReviewRequestAutomator());
    // ... register all automations
  }
  
  register(automation: BaseAutomation): void {
    this.automations.set(automation.slug, automation);
  }
  
  get(slug: string): BaseAutomation | undefined {
    return this.automations.get(slug);
  }
  
  getAll(): BaseAutomation[] {
    return Array.from(this.automations.values());
  }
}

// Use in API routes
const registry = new AutomationRegistry();

export async function POST(request: NextRequest) {
  const { automationSlug, userAutomationId, event } = await request.json();
  
  const automation = registry.get(automationSlug);
  if (!automation) {
    return NextResponse.json({ error: 'Automation not found' }, { status: 404 });
  }
  
  await automation.execute(userAutomationId, event);
  return NextResponse.json({ success: true });
}
```

**Best Practices:**
- ✅ Registry pattern (centralized automation lookup)
- ✅ Easy to add new automations (just register)
- ✅ Consistent interface (all automations work the same)
- ✅ Type-safe (TypeScript ensures correct implementation)

**Reference:** Current codebase uses this pattern (automation registry)

---

### Separation of Concerns

**Pattern:** API routes, business logic, UI components separate

**Why:**
- Easier to test (test business logic independently)
- Easier to maintain (changes isolated)
- Easier to scale (scale API and UI independently)

**Implementation:**

```
app/
├── api/                    # API routes (Next.js API routes)
│   ├── automations/
│   │   ├── install/        # Install automation
│   │   └── execute/        # Execute automation
│   └── webhooks/
│       └── shopify/        # Shopify webhooks
├── dashboard/              # UI pages
│   └── page.tsx            # Dashboard page
└── marketplace/            # UI pages
    └── page.tsx            # Marketplace page

lib/
├── automations/            # Business logic
│   ├── base.ts             # Base automation class
│   ├── pinterest-stock-sync.ts
│   └── registry.ts         # Automation registry
├── shopify/                # Shopify integration
│   └── oauth.ts            # OAuth, webhooks
└── queue/                  # Queue system
    └── index.ts            # Queue setup

components/
└── automations/            # UI components
    ├── AutomationCard.tsx
    └── InstallModal.tsx
```

**Best Practices:**
- ✅ API routes (handle HTTP requests)
- ✅ Business logic (lib/ directory)
- ✅ UI components (components/ directory)
- ✅ Shared utilities (lib/utils.ts)

**Reference:** Standard Next.js pattern (used by all major apps)

---

### Testing Strategy

**Pattern:** Unit tests, integration tests, E2E tests

**Why:**
- Catch bugs early (before production)
- Confidence in changes (tests pass = safe to deploy)
- Documentation (tests show how code works)

**Implementation:**

```typescript
// __tests__/automations/pinterest-stock-sync.test.ts
import { PinterestStockSync } from '@/lib/automations/pinterest-stock-sync';

describe('PinterestStockSync', () => {
  it('should pin product when out of stock', async () => {
    const automation = new PinterestStockSync();
    const event = {
      product: { id: '123', title: 'Test Product', inventory_quantity: 0 },
    };
    
    await automation.execute('user-automation-id', event);
    
    // Assert product was pinned
    expect(mockPinterestAPI.pinProduct).toHaveBeenCalledWith(
      expect.objectContaining({ id: '123' })
    );
  });
  
  it('should not pin product when in stock', async () => {
    const automation = new PinterestStockSync();
    const event = {
      product: { id: '123', title: 'Test Product', inventory_quantity: 10 },
    };
    
    await automation.execute('user-automation-id', event);
    
    // Assert product was not pinned
    expect(mockPinterestAPI.pinProduct).not.toHaveBeenCalled();
  });
});

// __tests__/api/webhooks/shopify.test.ts
import { POST } from '@/app/api/webhooks/shopify/route';

describe('Shopify Webhook Handler', () => {
  it('should verify webhook signature', async () => {
    const request = new NextRequest('http://localhost/api/webhooks/shopify', {
      method: 'POST',
      body: JSON.stringify({ topic: 'products/update', shop: 'test.myshopify.com' }),
      headers: {
        'x-shopify-hmac-sha256': 'valid-signature',
      },
    });
    
    const response = await POST(request);
    
    expect(response.status).toBe(200);
  });
  
  it('should reject invalid signature', async () => {
    const request = new NextRequest('http://localhost/api/webhooks/shopify', {
      method: 'POST',
      body: JSON.stringify({ topic: 'products/update', shop: 'test.myshopify.com' }),
      headers: {
        'x-shopify-hmac-sha256': 'invalid-signature',
      },
    });
    
    const response = await POST(request);
    
    expect(response.status).toBe(401);
  });
});
```

**Best Practices:**
- ✅ Unit tests (test individual functions)
- ✅ Integration tests (test API routes)
- ✅ E2E tests (test full workflows)
- ✅ Test coverage >80% (aim for high coverage)

**Reference:** All major apps have comprehensive tests (Klaviyo, Recharge)

---

### Database Migrations

**Pattern:** Version schema changes, rollback support

**Why:**
- Track schema changes (version control)
- Rollback if needed (revert bad migrations)
- Team collaboration (everyone has same schema)

**Implementation:**

```sql
-- supabase/migrations/20240106_add_support_tickets.sql
-- Migration: Add support tickets table
-- Created: 2024-01-06
-- Author: VelocityApps Team

CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);

-- Rollback (if needed)
-- DROP TABLE IF EXISTS support_tickets;
```

**Best Practices:**
- ✅ Version migrations (timestamp in filename)
- ✅ Include rollback SQL (comment out)
- ✅ Test migrations (test on staging first)
- ✅ Document changes (what changed, why)

**Reference:** Standard practice (used by all major apps)

---

### Environment Configuration

**Pattern:** .env for secrets, .env.example for documentation

**Why:**
- Keep secrets out of code (security)
- Easy configuration (different envs for dev/staging/prod)
- Team collaboration (everyone knows what env vars are needed)

**Implementation:**

```bash
# .env.local (not committed to git)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
SHOPIFY_CLIENT_ID=xxx
SHOPIFY_CLIENT_SECRET=xxx
SHOPIFY_WEBHOOK_SECRET=xxx
ENCRYPTION_KEY=xxx
REDIS_URL=redis://localhost:6379
PINTEREST_ACCESS_TOKEN=xxx
RESEND_API_KEY=xxx
SENTRY_DSN=xxx

# .env.example (committed to git, shows what's needed)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SHOPIFY_CLIENT_ID=
SHOPIFY_CLIENT_SECRET=
SHOPIFY_WEBHOOK_SECRET=
ENCRYPTION_KEY=
REDIS_URL=
PINTEREST_ACCESS_TOKEN=
RESEND_API_KEY=
SENTRY_DSN=
```

**Best Practices:**
- ✅ .env.local for secrets (not committed)
- ✅ .env.example for documentation (committed)
- ✅ Validate env vars on startup (fail fast if missing)
- ✅ Use different envs for dev/staging/prod

**Reference:** Standard practice (used by all major apps)

---

## 🔌 Third-Party Integrations

### Shopify Admin API

**Pattern:** OAuth for authentication, GraphQL for queries, REST for mutations

**Why:**
- OAuth is secure (tokens, not passwords)
- GraphQL is efficient (get only what you need)
- REST is simple (easy to use)

**Implementation:**

```typescript
// lib/shopify/client.ts
export class ShopifyClient {
  constructor(private accessToken: string, private shop: string) {}
  
  // GraphQL query
  async query<T>(query: string, variables?: any): Promise<T> {
    const response = await fetch(`https://${this.shop}/admin/api/2024-01/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': this.accessToken,
      },
      body: JSON.stringify({ query, variables }),
    });
    
    const data = await response.json();
    
    if (data.errors) {
      throw new Error(`GraphQL error: ${JSON.stringify(data.errors)}`);
    }
    
    return data.data;
  }
  
  // REST API
  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`https://${this.shop}/admin/api/2024-01/${endpoint}.json`, {
      headers: {
        'X-Shopify-Access-Token': this.accessToken,
      },
    });
    
    return response.json();
  }
  
  async post<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`https://${this.shop}/admin/api/2024-01/${endpoint}.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': this.accessToken,
      },
      body: JSON.stringify(data),
    });
    
    return response.json();
  }
}

// Use in automations
const client = new ShopifyClient(accessToken, shop);
const products = await client.query(`
  query GetProducts($first: Int!) {
    products(first: $first) {
      edges {
        node {
          id
          title
          inventoryQuantity
        }
      }
    }
  }
`, { first: 10 });
```

**Best Practices:**
- ✅ Use OAuth (secure authentication)
- ✅ Use GraphQL for queries (efficient)
- ✅ Use REST for mutations (simple)
- ✅ Handle rate limits (2 req/sec)
- ✅ Retry on failures (exponential backoff)

**Reference:** Shopify best practices (used by all major apps)

---

### Pinterest API

**Pattern:** OAuth for authentication, rate limiting, error handling

**Why:**
- OAuth is secure (tokens, not passwords)
- Rate limits exist (200 req/hour)
- Errors happen (network issues, API downtime)

**Implementation:**

```typescript
// lib/pinterest/client.ts
export class PinterestClient {
  constructor(private accessToken: string) {}
  
  async pinProduct(product: any, boardId: string): Promise<void> {
    // Check rate limit
    const { success } = await pinterestRateLimit.limit('pinterest-api');
    if (!success) {
      throw new RateLimitError('Pinterest rate limit exceeded');
    }
    
    // Make API call with retry
    await retryWithBackoff(async () => {
      const response = await fetch('https://api.pinterest.com/v5/pins', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          board_id: boardId,
          media_source: {
            source_type: 'image_url',
            url: product.image,
          },
          title: product.title,
          description: product.description,
          link: product.url,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Pinterest API error: ${response.statusText}`);
      }
      
      return response.json();
    });
  }
}
```

**Best Practices:**
- ✅ Use OAuth (secure authentication)
- ✅ Handle rate limits (200 req/hour)
- ✅ Retry on failures (exponential backoff)
- ✅ Use circuit breaker (stop calling if API down)

**Reference:** Pinterest API best practices

---

### Stripe API

**Pattern:** Webhooks for events, customer portal for self-service

**Why:**
- Webhooks are real-time (instant notifications)
- Customer portal reduces support (self-service)

**Implementation:**

```typescript
// lib/stripe/client.ts
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-01-01.acacia',
});

// Create subscription
export async function createSubscription(
  customerId: string,
  priceId: string
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    payment_behavior: 'default_incomplete',
    payment_settings: { save_default_payment_method: 'on_subscription' },
    expand: ['latest_invoice.payment_intent'],
  });
}

// Webhook handler
export async function handleStripeWebhook(event: Stripe.Event) {
  switch (event.type) {
    case 'customer.subscription.created':
      await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
  }
}
```

**Best Practices:**
- ✅ Verify webhook signatures (prevent fake webhooks)
- ✅ Handle all event types (created, updated, deleted)
- ✅ Idempotent processing (process each event once)
- ✅ Customer portal (self-service billing)

**Reference:** Stripe best practices (used by all major apps)

---

### Email Service (Resend)

**Pattern:** Transactional emails, templates, tracking

**Why:**
- Resend is reliable (99.9% delivery rate)
- Templates are reusable (consistent emails)
- Tracking is useful (see open rates, clicks)

**Implementation:**

```typescript
// lib/email.ts (already exists, but here's the full version)
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}): Promise<void> {
  await resend.emails.send({
    from: options.from || 'VelocityApps <support@velocityapps.com>',
    to: options.to,
    subject: options.subject,
    html: options.html,
  });
}

// Use templates
export async function sendSupportTicketConfirmation(
  email: string,
  ticketId: string
): Promise<void> {
  await sendEmail({
    to: email,
    subject: 'Support Ticket Created',
    html: `
      <h1>Support Ticket Created</h1>
      <p>Your support ticket #${ticketId} has been created.</p>
      <p>We'll respond within 2 hours.</p>
    `,
  });
}
```

**Best Practices:**
- ✅ Use templates (consistent emails)
- ✅ Track opens/clicks (monitor engagement)
- ✅ Handle bounces (remove invalid emails)
- ✅ Rate limiting (don't spam)

**Reference:** Resend best practices

---

### Monitoring (Sentry)

**Pattern:** Error tracking, performance monitoring, alerting

**Why:**
- Know when errors happen (before customers complain)
- Track performance (response times, slow queries)
- Alert on critical errors (store broken, API down)

**Implementation:**

```typescript
// Already configured (see SENTRY_SETUP.md)
// Use in code
import * as Sentry from '@sentry/nextjs';

try {
  await processAutomation();
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      automation: 'pinterest-stock-sync',
      store: storeId,
    },
    extra: {
      event: eventData,
    },
  });
  
  throw error;
}
```

**Best Practices:**
- ✅ Track all errors (Sentry captures automatically)
- ✅ Add context (tags, extra data)
- ✅ Alert on critical errors (store broken)
- ✅ Monitor performance (slow queries, slow APIs)

**Reference:** All major apps use Sentry (Klaviyo, Recharge, Bold)

---

## ⚡ Performance Benchmarks

### Target Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Webhook response | <2s | - | ⏳ |
| Automation execution | <30s | - | ⏳ |
| Dashboard load time | <1s | - | ⏳ |
| Database queries | <100ms | - | ⏳ |
| API response time | <500ms | - | ⏳ |

### How to Measure

```typescript
// lib/performance.ts
export async function measurePerformance<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  
  try {
    const result = await fn();
    const duration = Date.now() - start;
    
    // Record metric
    Metrics.record(name, duration);
    
    // Alert if slow
    if (duration > getThreshold(name)) {
      await sendAlert({
        severity: 'warning',
        message: `${name} is slow: ${duration}ms`,
      });
    }
    
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    Metrics.record(`${name}_error`, duration);
    throw error;
  }
}

// Use in code
await measurePerformance('webhook_response', async () => {
  await processWebhook(event);
});

await measurePerformance('automation_execution', async () => {
  await automation.execute(userAutomationId, event);
});
```

**Best Practices:**
- ✅ Measure all critical paths (webhooks, automations, APIs)
- ✅ Alert on slow performance (P95 > threshold)
- ✅ Track over time (see trends)
- ✅ Optimize slow paths (identify bottlenecks)

**Reference:** Klaviyo tracks all performance metrics (response times, queue depth)

---

## 🔒 Security Checklist

### Pre-Launch Security Audit

- [ ] **Encrypt all Shopify access tokens** (AES-256-GCM)
- [ ] **Validate all webhook HMAC signatures** (prevent fake webhooks)
- [ ] **Use HTTPS everywhere** (no HTTP)
- [ ] **SQL injection prevention** (parameterized queries)
- [ ] **XSS prevention** (sanitize all user input)
- [ ] **CSRF protection** (tokens on all forms)
- [ ] **Rate limiting** (prevent abuse)
- [ ] **Audit logging** (who did what when)
- [ ] **Environment variables** (secrets in .env, not code)
- [ ] **Database RLS** (tenant isolation)
- [ ] **Input validation** (validate all inputs)
- [ ] **Output encoding** (encode all outputs)
- [ ] **Error handling** (don't leak sensitive info)
- [ ] **Dependency scanning** (check for vulnerabilities)
- [ ] **Penetration testing** (test for vulnerabilities)

### Implementation Examples

```typescript
// ✅ Encrypt tokens
const encrypted = await encryptToken(accessToken);

// ✅ Validate webhooks
const isValid = await verifyWebhookSignature(body, signature);

// ✅ Parameterized queries
const { data } = await supabase
  .from('user_automations')
  .select('*')
  .eq('store_id', storeId); // Safe

// ✅ Sanitize input
const sanitized = DOMPurify.sanitize(userInput);

// ✅ Rate limiting
const { success } = await rateLimit.limit(userId);

// ✅ Audit logging
await auditLog(userId, 'automation_installed', automationId);
```

**Reference:** OWASP Top 10, Shopify security best practices

---

## 🚀 Development Workflow

### Local Development Setup

**Pattern:** Docker for dependencies, ngrok for webhooks

**Why:**
- Consistent environment (same as production)
- Test webhooks locally (ngrok exposes local server)
- Fast iteration (hot reload, instant feedback)

**Implementation:**

```bash
# docker-compose.yml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
  
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"

# Start services
docker-compose up -d

# Start Next.js dev server
npm run dev

# Start ngrok (for webhooks)
ngrok http 3000
# Use ngrok URL in Shopify webhook settings
```

**Best Practices:**
- ✅ Docker for dependencies (Redis, PostgreSQL)
- ✅ ngrok for webhooks (test locally)
- ✅ Hot reload (instant feedback)
- ✅ Environment variables (.env.local)

**Reference:** Standard development setup (used by all major apps)

---

### Staging Environment

**Pattern:** Separate staging environment, test before production

**Why:**
- Test changes before production (catch bugs early)
- Safe to experiment (won't break production)
- Team collaboration (everyone can test)

**Implementation:**

```bash
# Deploy to staging
vercel deploy --env=staging

# Test on staging
# - Install automation
# - Trigger webhook
# - Verify execution
# - Check logs

# Deploy to production (after testing)
vercel deploy --prod
```

**Best Practices:**
- ✅ Separate staging environment (not production)
- ✅ Test all changes on staging first
- ✅ Same as production (same config, same data)
- ✅ Auto-deploy on merge to staging branch

**Reference:** Standard practice (used by all major apps)

---

### CI/CD Pipeline

**Pattern:** Auto-deploy on merge, run tests, check quality

**Why:**
- Fast deployment (no manual steps)
- Consistent deployments (same process every time)
- Catch bugs early (tests run before deploy)

**Implementation:**

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm test
      - run: npm run lint
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

**Best Practices:**
- ✅ Run tests before deploy (fail fast)
- ✅ Lint code (catch style issues)
- ✅ Auto-deploy on merge (no manual steps)
- ✅ Rollback on failure (revert bad deploys)

**Reference:** Standard CI/CD (used by all major apps)

---

### Database Backup Strategy

**Pattern:** Hourly snapshots, point-in-time recovery

**Why:**
- Data loss is catastrophic (must have backups)
- Point-in-time recovery (recover to any time)
- Test backups regularly (ensure they work)

**Implementation:**

```typescript
// scripts/backup.ts
import { createClient } from '@supabase/supabase-js';

export async function backupDatabase() {
  // Supabase handles backups automatically
  // But we can also create manual backups
  
  const tables = [
    'user_automations',
    'automation_logs',
    'support_tickets',
    // ... all tables
  ];
  
  const backup: any = {};
  
  for (const table of tables) {
    const { data } = await supabaseAdmin.from(table).select('*');
    backup[table] = data;
  }
  
  // Save to S3/Google Drive
  await saveBackup(backup, `backup-${Date.now()}.json`);
}
```

**Best Practices:**
- ✅ Hourly snapshots (automatic)
- ✅ Point-in-time recovery (recover to any time)
- ✅ Test backups regularly (ensure they work)
- ✅ Off-site backups (not just one location)

**Reference:** Supabase handles backups automatically (hourly snapshots)

---

### Rollback Procedure

**Pattern:** Quick rollback if deploy breaks

**Why:**
- Deploys can break (bugs, config issues)
- Need to rollback quickly (minimize downtime)
- Version control (can revert to previous version)

**Implementation:**

```bash
# Rollback to previous deployment
vercel rollback

# Or revert git commit
git revert HEAD
git push

# Or restore database from backup
# (if database migration broke things)
```

**Best Practices:**
- ✅ Quick rollback (one command)
- ✅ Version control (can revert commits)
- ✅ Database migrations reversible (can rollback)
- ✅ Test rollback procedure (ensure it works)

**Reference:** Standard practice (used by all major apps)

---

### Feature Flags

**Pattern:** Gradual rollout of new features

**Why:**
- Test with small group first (catch bugs early)
- Rollback easily (disable feature flag)
- A/B testing (test different versions)

**Implementation:**

```typescript
// lib/feature-flags.ts
export class FeatureFlags {
  static async isEnabled(flag: string, userId?: string): Promise<boolean> {
    // Check feature flag
    const { data } = await supabaseAdmin
      .from('feature_flags')
      .select('enabled, rollout_percentage')
      .eq('flag', flag)
      .single();
    
    if (!data?.enabled) return false;
    
    // Gradual rollout
    if (data.rollout_percentage < 100) {
      const hash = userId ? hashUserId(userId) : Math.random();
      return hash < data.rollout_percentage / 100;
    }
    
    return true;
  }
}

// Use in code
if (await FeatureFlags.isEnabled('new-automation-ui', userId)) {
  return <NewAutomationUI />;
} else {
  return <OldAutomationUI />;
}
```

**Best Practices:**
- ✅ Gradual rollout (10%, 50%, 100%)
- ✅ Easy to disable (toggle feature flag)
- ✅ A/B testing (test different versions)
- ✅ Monitor metrics (track feature performance)

**Reference:** All major apps use feature flags (Klaviyo, Recharge, Bold)

---

## ✅ Pre-Launch Checklist

### Must-Haves Before Launch

#### Infrastructure
- [ ] Production database (Supabase production project)
- [ ] Production Redis (Upstash Redis)
- [ ] Production environment variables (all secrets configured)
- [ ] CDN configured (Vercel CDN or Cloudflare)
- [ ] Monitoring setup (Sentry, error tracking)
- [ ] Analytics setup (Plausible or similar)

#### Security
- [ ] All tokens encrypted (AES-256-GCM)
- [ ] Webhook signatures verified (HMAC-SHA256)
- [ ] HTTPS everywhere (no HTTP)
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (sanitize input)
- [ ] Rate limiting (prevent abuse)
- [ ] Audit logging (who did what when)

#### Reliability
- [ ] Webhook response <2s (Shopify timeout: 5s)
- [ ] Automation execution <30s (reasonable timeout)
- [ ] Error handling (retries, circuit breakers)
- [ ] Health checks (/api/health endpoint)
- [ ] Monitoring (Sentry, metrics)
- [ ] Alerting (critical errors)

#### Performance
- [ ] Database indexes (fast queries)
- [ ] Caching (Redis for frequently accessed data)
- [ ] CDN (static assets from CDN)
- [ ] Connection pooling (don't exhaust connections)
- [ ] Performance monitoring (track response times)

#### Testing
- [ ] Unit tests (>80% coverage)
- [ ] Integration tests (API routes)
- [ ] E2E tests (critical workflows)
- [ ] Load testing (handle 1000+ concurrent requests)
- [ ] Security testing (penetration testing)

#### Documentation
- [ ] API documentation (all endpoints documented)
- [ ] Setup guide (how to install, configure)
- [ ] Troubleshooting guide (common issues)
- [ ] Architecture documentation (this document)
- [ ] Runbook (how to handle incidents)

#### Support
- [ ] Support ticket system (tickets, SLA)
- [ ] Knowledge base (docs, FAQs)
- [ ] Status page (system status visible)
- [ ] Support team trained (know how to help)

---

## 📚 References

### Successful Apps Architecture

**Klaviyo:**
- Multi-tenant database (single DB, tenant isolation)
- Queue system (processes millions of events/day)
- Real-time webhooks (<1s response)
- Comprehensive monitoring (response times, error rates)

**Recharge:**
- Horizontal scaling (adds servers during peak)
- Circuit breakers (prevents cascading failures)
- Dead letter queues (reviews failed jobs)
- Connection pooling (limits connections per server)

**Bold Commerce:**
- Plugin architecture (easy to add new features)
- API-first (REST API for all operations)
- Comprehensive testing (unit, integration, E2E)
- Feature flags (gradual rollout)

### Technical Resources

- [Shopify App Development Best Practices](https://shopify.dev/docs/apps/best-practices)
- [Next.js Production Deployment](https://nextjs.org/docs/deployment)
- [Supabase Best Practices](https://supabase.com/docs/guides/database)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [System Design Primer](https://github.com/donnemartin/system-design-primer)

---

**Last Updated:** 2026-01-06  
**Maintained By:** Engineering Team  
**Next Review:** After Phase 1 implementation

