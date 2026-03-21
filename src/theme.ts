import Highcharts from "highcharts";
import type { Options } from "highcharts";

/**
 * Minimal overrides on top of Highcharts' adaptive theme.
 * The adaptive theme handles all light/dark mode switching.
 */
export const defaultTheme: Options = {
  credits: {
    enabled: false,
  },
};

/**
 * Resolve the final theme by merging any user overrides from
 * `window.__HIGHCHARTS_THEME__` (injected by the server) on top of defaults.
 */
export function getTheme(): Options {
  const userOverrides =
    typeof window !== "undefined" &&
    (window as unknown as Record<string, unknown>).__HIGHCHARTS_THEME__;
  if (userOverrides && typeof userOverrides === "object") {
    return Highcharts.merge(defaultTheme, userOverrides) as Options;
  }
  return defaultTheme;
}
