/**
 * Session tokens widget - cumulative In/Out/W/R for the entire session
 * Uses context_window totals for In/Out, accumulates cache tokens across turns
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import type { Widget } from './base.js';
import type { WidgetContext, TokenBreakdownData } from '../types.js';
import { colorize, getTheme } from '../utils/colors.js';
import { formatTokens } from '../utils/formatters.js';

const DATA_DIR = join(homedir(), '.cache', 'claude-dashboard', 'session-data');

interface SessionTokenState {
  lastTotalInputTokens: number;
  cumulativeW: number;
  cumulativeR: number;
}

async function loadState(sessionId: string): Promise<SessionTokenState> {
  try {
    const raw = await readFile(join(DATA_DIR, `${sessionId}.json`), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { lastTotalInputTokens: 0, cumulativeW: 0, cumulativeR: 0 };
  }
}

async function saveState(sessionId: string, state: SessionTokenState): Promise<void> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(join(DATA_DIR, `${sessionId}.json`), JSON.stringify(state));
  } catch {
    // Best-effort persistence
  }
}

export const sessionTokensWidget: Widget<TokenBreakdownData> = {
  id: 'sessionTokens',
  name: 'Session Tokens',

  async getData(ctx: WidgetContext): Promise<TokenBreakdownData | null> {
    const cw = ctx.stdin.context_window;
    const usage = cw?.current_usage;
    const totalInput = cw?.total_input_tokens ?? 0;
    const totalOutput = cw?.total_output_tokens ?? 0;
    const sessionId = ctx.stdin.session_id || 'default';

    if (totalInput + totalOutput === 0) return null;

    const state = await loadState(sessionId);

    // New turn detected: total_input_tokens increased → accumulate W/R
    if (usage && totalInput > state.lastTotalInputTokens) {
      state.cumulativeW += usage.cache_creation_input_tokens;
      state.cumulativeR += usage.cache_read_input_tokens;
      state.lastTotalInputTokens = totalInput;
      await saveState(sessionId, state);
    }

    return {
      inputTokens: totalInput,
      outputTokens: totalOutput,
      cacheWriteTokens: state.cumulativeW,
      cacheReadTokens: state.cumulativeR,
    };
  },

  render(data: TokenBreakdownData, _ctx: WidgetContext): string {
    const theme = getTheme();
    const parts: string[] = [];
    if (data.inputTokens > 0) parts.push(`${colorize('In', theme.info)} ${formatTokens(data.inputTokens)}`);
    if (data.outputTokens > 0) parts.push(`${colorize('Out', theme.accent)} ${formatTokens(data.outputTokens)}`);
    if (data.cacheWriteTokens > 0) parts.push(`${colorize('W', theme.warning)} ${formatTokens(data.cacheWriteTokens)}`);
    if (data.cacheReadTokens > 0) parts.push(`${colorize('R', theme.safe)} ${formatTokens(data.cacheReadTokens)}`);
    return `📊 ${parts.join(colorize(' · ', theme.secondary))}`;
  },
};
