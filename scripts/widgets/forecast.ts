/**
 * Cost forecast widget - estimates hourly cost based on current session rate
 * @handbook 3.3-widget-data-sources
 * @tested scripts/__tests__/widgets.test.ts
 */

import type { Widget } from './base.js';
import type { WidgetContext, ForecastData } from '../types.js';
import { colorize, getTheme } from '../utils/colors.js';
import { ICON } from '../utils/emoji.js';
import { formatCost } from '../utils/formatters.js';
import { getSessionElapsedMinutes } from '../utils/session.js';
import { estimateCost } from '../utils/pricing.js';

export const forecastWidget: Widget<ForecastData> = {
  id: 'forecast',
  name: 'Cost Forecast',

  async getData(ctx: WidgetContext): Promise<ForecastData | null> {
    const { cost, model, context_window } = ctx.stdin;
    const usage = context_window?.current_usage;

    // Prefer model-based estimation when available
    let totalCost: number;
    let currency: string;
    if (usage && model?.id) {
      const estimated = estimateCost(
        model.id,
        usage.input_tokens,
        usage.output_tokens,
        usage.cache_creation_input_tokens,
        usage.cache_read_input_tokens,
      );
      if (estimated && estimated.totalCost > 0) {
        totalCost = estimated.totalCost;
        currency = estimated.currency;
      } else {
        totalCost = cost?.total_cost_usd ?? 0;
        currency = '$';
      }
    } else {
      totalCost = cost?.total_cost_usd ?? 0;
      currency = '$';
    }

    if (totalCost <= 0) return null;

    const elapsedMinutes = await getSessionElapsedMinutes(ctx, 1);
    if (elapsedMinutes === null || elapsedMinutes === 0) return null;

    const costPerMinute = totalCost / elapsedMinutes;
    const hourlyCost = costPerMinute * 60;

    if (!Number.isFinite(hourlyCost) || hourlyCost < 0) return null;

    return {
      currentCost: totalCost,
      hourlyCost,
      currency,
    };
  },

  render(data: ForecastData, _ctx: WidgetContext): string {
    const theme = getTheme();
    const cur = data.currency ?? '$';

    let hourlyColor: string;
    if (data.hourlyCost > 10) {
      hourlyColor = theme.danger;
    } else if (data.hourlyCost > 5) {
      hourlyColor = theme.warning;
    } else {
      hourlyColor = theme.safe;
    }

    return `${ICON.chartUp} ${colorize(formatCost(data.currentCost, cur), theme.accent)} → ${colorize(`~${formatCost(data.hourlyCost, cur)}/h`, hourlyColor)}`;
  },
};
