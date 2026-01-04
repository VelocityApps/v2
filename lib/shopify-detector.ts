/**
 * Shopify App Detection
 * Detects if a user prompt is requesting a Shopify app
 */

const SHOPIFY_KEYWORDS = [
  'shopify',
  'shopify app',
  'shopify store',
  'e-commerce app',
  'product reviews',
  'inventory tracker',
  'inventory management',
  'order management',
  'order dashboard',
  'abandoned cart',
  'cart recovery',
  'shopify analytics',
  'shopify dashboard',
  'shopify integration',
  'shopify merchant',
  'shopify storefront',
  'product catalog',
  'customer management',
  'shopify admin',
  'shopify partner',
];

const SHOPIFY_APP_TYPES = {
  reviews: ['review', 'rating', 'feedback', 'testimonial', 'customer review'],
  inventory: ['inventory', 'stock', 'warehouse', 'supply', 'reorder'],
  orders: ['order', 'fulfillment', 'shipping', 'packing', 'order status'],
  email: ['email', 'notification', 'automation', 'abandoned cart', 'newsletter'],
  analytics: ['analytics', 'dashboard', 'report', 'metrics', 'statistics', 'sales'],
};

export interface ShopifyDetectionResult {
  isShopifyApp: boolean;
  appType?: 'reviews' | 'inventory' | 'orders' | 'email' | 'analytics' | 'custom';
  confidence: number;
  detectedKeywords: string[];
}

/**
 * Detect if a prompt is requesting a Shopify app
 */
export function detectShopifyApp(prompt: string): ShopifyDetectionResult {
  const lowerPrompt = prompt.toLowerCase();
  const detectedKeywords: string[] = [];
  let confidence = 0;

  // Check for explicit Shopify keywords
  for (const keyword of SHOPIFY_KEYWORDS) {
    if (lowerPrompt.includes(keyword.toLowerCase())) {
      detectedKeywords.push(keyword);
      confidence += keyword === 'shopify' ? 0.5 : 0.2;
    }
  }

  // Detect specific app types
  let appType: ShopifyDetectionResult['appType'] = 'custom';
  let typeConfidence = 0;

  for (const [type, keywords] of Object.entries(SHOPIFY_APP_TYPES)) {
    const matches = keywords.filter(k => lowerPrompt.includes(k.toLowerCase()));
    if (matches.length > 0) {
      const matchScore = matches.length / keywords.length;
      if (matchScore > typeConfidence) {
        typeConfidence = matchScore;
        appType = type as ShopifyDetectionResult['appType'];
        detectedKeywords.push(...matches);
      }
    }
  }

  // Boost confidence if Shopify keyword + app type detected
  if (detectedKeywords.some(k => k.includes('shopify')) && appType !== 'custom') {
    confidence += 0.3;
  }

  // Normalize confidence to 0-1 range
  confidence = Math.min(confidence, 1);

  return {
    isShopifyApp: confidence >= 0.3, // Threshold for detection
    appType: confidence >= 0.3 ? appType : undefined,
    confidence,
    detectedKeywords: [...new Set(detectedKeywords)], // Remove duplicates
  };
}

/**
 * Get Shopify app type from detection result
 */
export function getShopifyAppType(detection: ShopifyDetectionResult): string {
  if (!detection.isShopifyApp) return 'custom';
  return detection.appType || 'custom';
}

