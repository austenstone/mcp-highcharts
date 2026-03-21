import type { Options } from "highcharts";

/**
 * Minimal overrides on top of Highcharts' adaptive theme.
 * The adaptive theme handles all light/dark mode switching.
 */
export const defaultTheme: Options = {
  chart: {
    animation: false,
  },
  plotOptions: {
    series: {
      animation: false,
    },
  },
  credits: {
    enabled: false,
  },
};

/** Deep merge two objects. Arrays are replaced, not concatenated. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deepMerge(target: any, source: any): any {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    const srcVal = source[key];
    const tgtVal = result[key];
    if (
      srcVal &&
      typeof srcVal === "object" &&
      !Array.isArray(srcVal) &&
      tgtVal &&
      typeof tgtVal === "object" &&
      !Array.isArray(tgtVal)
    ) {
      result[key] = deepMerge(tgtVal, srcVal);
    } else {
      result[key] = srcVal;
    }
  }
  return result;
}

/**
 * Resolve the final theme by merging any user overrides from
 * `window.__HIGHCHARTS_THEME__` (injected by the server) on top of defaults.
 */
export function getTheme(): Options {
  const userOverrides =
    typeof window !== "undefined" &&
    (window as unknown as Record<string, unknown>).__HIGHCHARTS_THEME__;
  if (userOverrides && typeof userOverrides === "object") {
    return deepMerge(defaultTheme, userOverrides);
  }
  return defaultTheme;
}
