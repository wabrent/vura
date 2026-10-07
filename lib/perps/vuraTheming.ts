// ============================================================================
// VURA theme for Orderly Network SDK (official theming contract).
//
// Docs: https://orderly.network/docs/sdks/react/theming
//   - Values MUST be bare RGB triplets ("0 255 102"), NO rgb() wrapper,
//     otherwise opacity modifiers break.
//   - base-100 → base-900 = surfaces from lightest to deepest;
//     base-foreground = text color (importance via opacity).
//   - This SDK version reads --orderly-* variables (styles.css of
//     @orderly.network/react@1.5.x); the older spec names
//     (--orderly-background / --orderly-panel-background) are NOT used.
//
// Applied on :root by applyVuraTheme() at runtime (client-only page).
// ============================================================================

export const vuraThemeConfig = {
  // ── Surfaces: lightest (cards/active) → deepest (page bg) ────────────────
  "--orderly-color-base-100": "18 26 21", // #121a15 card / highlight
  "--orderly-color-base-200": "16 23 19",
  "--orderly-color-base-300": "14 21 17",
  "--orderly-color-base-400": "13 19 15",
  "--orderly-color-base-500": "11 17 14",
  "--orderly-color-base-600": "10 15 12",
  "--orderly-color-base-700": "8 12 10", // #080c0a panels (most used)
  "--orderly-color-base-800": "7 10 9",
  "--orderly-color-base-900": "4 6 5", // #040605 deepest bg

  // ── Text ──────────────────────────────────────────────────────────────────
  "--orderly-color-base-foreground": "230 255 235", // #e6ffeb main text
  "--orderly-color-base-contrast": "230 255 235",

  // ── Accents (VURA neon green) ────────────────────────────────────────────
  "--orderly-color-primary": "0 255 102", // #00ff66
  "--orderly-color-primary-light": "106 255 162",
  "--orderly-color-primary-darken": "0 204 82",
  "--orderly-color-primary-contrast": "4 12 7", // dark text on neon buttons
  "--orderly-color-link": "0 255 102",
  "--orderly-color-link-light": "106 255 162",
  "--orderly-color-secondary": "255 255 255",
  "--orderly-color-tertiary": "218 230 222",
  "--orderly-color-divider": "42 47 44", // #2a2f2c green-tinted lines

  // ── Semantic ──────────────────────────────────────────────────────────────
  "--orderly-color-success": "0 255 102",
  "--orderly-color-success-light": "106 255 162",
  "--orderly-color-success-contrast": "4 12 7",
  "--orderly-color-danger": "255 77 38",
  "--orderly-color-danger-light": "255 130 96",
  "--orderly-color-danger-darken": "200 55 25",
  "--orderly-color-danger-contrast": "255 255 255",
  "--orderly-color-warning": "255 170 0",
  "--orderly-color-warning-light": "255 204 102",
  "--orderly-color-warning-darken": "200 130 0",

  // ── PnL / candles ────────────────────────────────────────────────────────
  "--orderly-color-trading-profit": "0 255 102",
  "--orderly-color-trading-profit-contrast": "4 12 7",
  "--orderly-color-trading-loss": "255 77 38",
  "--orderly-color-trading-loss-contrast": "255 255 255",

  // ── Typography (mono, dense terminal scale) ──────────────────────────────
  "--orderly-font-family":
    "'SF Mono', 'Fira Code', 'Cascadia Mono', ui-monospace, 'Courier New', monospace",
  "--orderly-font-size-4xs": "9px",
  "--orderly-font-size-3xs": "10px",
  "--orderly-font-size-2xs": "11px",
  "--orderly-font-size-xs": "12px",
  "--orderly-font-size-sm": "13px",
  "--orderly-font-size-base": "14px",
  "--orderly-font-size-lg": "16px",
  "--orderly-font-size-xl": "18px",
  "--orderly-font-size-3xl": "24px",

  // ── Shape / elevation ────────────────────────────────────────────────────
  "--orderly-rounded": "6px",
  "--orderly-rounded-sm": "4px",
  "--orderly-rounded-lg": "8px",
  "--orderly-rounded-full": "9999px",
  "--orderly-shadow-md": "0 2px 8px rgba(0, 0, 0, 0.45)",
  "--orderly-shadow-lg": "0 8px 24px rgba(0, 0, 0, 0.55)",
  "--orderly-button-shadow": "none",
} as const;

/** Apply the VURA theme as CSS variables on the document root. */
export function applyVuraTheme(): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  Object.entries(vuraThemeConfig).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}
