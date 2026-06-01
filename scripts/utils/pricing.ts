/**
 * Model pricing table for token cost estimation
 * Prices are per 1M tokens.
 * Anthropic pricing: USD ($) — https://www.anthropic.com/pricing
 * DeepSeek pricing: CNY (¥) — https://api-docs.deepseek.com/zh-cn/quick_start/pricing
 */

/**
 * Pricing for a single model tier
 */
export interface TierPricing {
  /** Input price per 1M tokens (cache miss / no cache) */
  input: number;
  /** Output price per 1M tokens */
  output: number;
  /** Cache write price per 1M tokens */
  cacheWrite: number;
  /** Cache read price per 1M tokens */
  cacheRead: number;
  /** Currency symbol (e.g. "$", "¥") */
  currency: string;
}

/**
 * All known model pricing tiers keyed by matching substring in model ID
 */
export const MODEL_PRICING: Record<string, TierPricing> = {
  // ── Anthropic Claude (USD) ──
  opus: {
    input: 15,
    cacheWrite: 18.75,
    cacheRead: 1.5,
    output: 75,
    currency: '$',
  },
  sonnet: {
    input: 3,
    cacheWrite: 3.75,
    cacheRead: 0.3,
    output: 15,
    currency: '$',
  },
  haiku: {
    input: 0.8,
    cacheWrite: 1.0,
    cacheRead: 0.08,
    output: 4,
    currency: '$',
  },

  // ── DeepSeek (CNY / 人民币) ──
  // V4 Pro: 2.5折 (75% off) 有效期至 2026/05/31 15:59 UTC
  'deepseek-v4-pro': {
    input: 3,
    cacheWrite: 3,
    cacheRead: 0.025,
    output: 6,
    currency: '¥',
  },
  'deepseek-v4-flash': {
    input: 1,
    cacheWrite: 1,
    cacheRead: 0.02,
    output: 2,
    currency: '¥',
  },
  // Aliases for deprecated model names (map to v4-flash)
  'deepseek-chat': {
    input: 1,
    cacheWrite: 1,
    cacheRead: 0.02,
    output: 2,
    currency: '¥',
  },
  'deepseek-reasoner': {
    input: 1,
    cacheWrite: 1,
    cacheRead: 0.02,
    output: 2,
    currency: '¥',
  },
  // Generic DeepSeek fallback — matches any "deepseek*" not caught above
  deepseek: {
    input: 1,
    cacheWrite: 1,
    cacheRead: 0.02,
    output: 2,
    currency: '¥',
  },
};

/**
 * Supported model category for display purposes
 */
export type ModelCategory = 'anthropic' | 'deepseek' | 'unknown';

/**
 * Detect model category from model ID
 */
export function detectModelCategory(modelId: string): ModelCategory {
  const lower = modelId.toLowerCase();
  if (lower.includes('claude') || lower.includes('opus') || lower.includes('sonnet') || lower.includes('haiku')) {
    return 'anthropic';
  }
  if (lower.includes('deepseek')) {
    return 'deepseek';
  }
  return 'unknown';
}

/**
 * Find matching pricing tier for a model ID (substring match, first wins)
 */
export function getPricing(modelId: string): TierPricing | null {
  const lower = modelId.toLowerCase();
  const keys = Object.keys(MODEL_PRICING).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (lower.includes(key)) {
      return MODEL_PRICING[key];
    }
  }
  return null;
}

/**
 * Estimated cost breakdown
 */
export interface EstimatedCost {
  inputCost: number;
  outputCost: number;
  cacheWriteCost: number;
  cacheReadCost: number;
  totalCost: number;
  currency: string;
}

/**
 * Estimate session cost from token usage and model pricing
 */
export function estimateCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number,
  cacheWriteTokens: number,
  cacheReadTokens: number,
): EstimatedCost | null {
  const pricing = getPricing(modelId);
  if (!pricing) return null;

  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  const cacheWriteCost = (cacheWriteTokens / 1_000_000) * pricing.cacheWrite;
  const cacheReadCost = (cacheReadTokens / 1_000_000) * pricing.cacheRead;

  return {
    inputCost,
    outputCost,
    cacheWriteCost,
    cacheReadCost,
    totalCost: inputCost + outputCost + cacheWriteCost + cacheReadCost,
    currency: pricing.currency,
  };
}
