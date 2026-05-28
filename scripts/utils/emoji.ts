/**
 * Centralized emoji icons with VS-16 (U+FE0F) variation selectors.
 *
 * Each value ends with an invisible U+FE0F byte — this forces emoji presentation
 * on terminals whose main monospace font (Nerd Fonts, JetBrains Mono, etc.)
 * bundles monochrome glyphs for default-emoji codepoints. Without VS-16 the
 * text glyph wins over the system's color emoji font, producing inconsistent
 * monochrome/colored rendering across users.
 *
 * Always import from here; do not hardcode emoji literals in widgets.
 */

export const ICON = {
  warning: '⚠️',
  gear: '⚙️',
  alarm: '🚨️',
  stopwatch: '⏱️',
  hourglass: '⏳️',
  zap: '⚡️',
  banknote: '💵️',
  moneyBag: '💰️',
  chartUp: '📈️',
  robot: '🤖️',
  person: '👤️',
  folder: '📁️',
  tree: '🌳️',
  label: '🏷️',
  package: '📦️',
  chart: '📊️',
  blueDiamond: '🔷️',
  gem: '💎️',
  orangeCircle: '🟠️',
  greenCircle: '🟢️',
  yellowCircle: '🟡️',
  redCircle: '🔴️',
  fire: '🔥️',
  speech: '💬️',
  target: '🎯️',
  key: '🔑️',
} as const;
