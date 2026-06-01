/**
 * Cost widget - displays session cost, estimated from model pricing
 * @handbook 3.3-widget-data-sources
 * @tested scripts/__tests__/widgets.test.ts
 */

import type { Widget } from './base.js';
import type { WidgetContext, CostData } from '../types.js';
import { colorize, getTheme } from '../utils/colors.js';
import { formatCost } from '../utils/formatters.js';
import { estimateCost, getPricing, detectModelCategory } from '../utils/pricing.js';

function getModelCurrency(modelId?: string): string {
  if (!modelId) return '$';
  const pricing = getPricing(modelId);
  return pricing?.currency ?? '$';
}

export const costWidget: Widget<CostData> = {
  id: 'cost',
  name: 'Cost',

  async getData(ctx: WidgetContext): Promise<CostData | null> {
    const { cost, model, context_window } = ctx.stdin;

    // For Anthropic models: prefer server-reported cumulative cost
    const category = model?.id ? detectModelCategory(model.id) : 'unknown';
    if (category === 'anthropic') {
      const serverCost = cost?.total_cost_usd ?? 0;
      if (serverCost > 0) {
        return { totalCostUsd: serverCost, currency: '$' };
      }
    }

    // For DeepSeek / unknown: estimate from cumulative session tokens with model pricing
    const totalInput = context_window?.total_input_tokens ?? 0;
    const totalOutput = context_window?.total_output_tokens ?? 0;
    if (totalInput + totalOutput > 0 && model?.id) {
      const estimated = estimateCost(model.id, totalInput, totalOutput, 0, 0);
      if (estimated && estimated.totalCost > 0) {
        return { totalCostUsd: estimated.totalCost, currency: estimated.currency };
      }
    }

    return null;
  },

  render(data: CostData): string {
    return colorize(formatCost(data.totalCostUsd, data.currency ?? '$'), getTheme().accent);
  },
};
