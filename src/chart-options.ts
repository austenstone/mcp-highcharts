import type { Options } from "highcharts";

// Types that need markers explicitly enabled since the global theme disables them
const MARKER_TYPES = new Set(["scatter", "scatter3d", "bubble", "packedbubble", "networkgraph"]);

// Primer data-viz guideline: differentiate lines with stroke style, not just color
const DASH_STYLES = ["Solid", "ShortDash", "Dot", "DashDot", "LongDash"] as const;
const MARKER_SYMBOLS = ["circle", "diamond", "square", "triangle", "triangle-down"] as const;

/**
 * Enhance raw Highcharts Options from the LLM with theme-aware defaults:
 * - Normalize string shorthands for title/subtitle
 * - Enable markers for scatter/bubble/networkgraph (theme disables globally)
 * - Apply dash-style differentiation for multi-line charts
 */
export function buildChartOptions(params: Record<string, unknown>): Options {
  const opts = { ...params } as Options & Record<string, unknown>;

  // Normalize string shorthands: title: "My Chart" → title: { text: "My Chart" }
  if (typeof opts.title === "string") opts.title = { text: opts.title };
  if (typeof opts.subtitle === "string") opts.subtitle = { text: opts.subtitle };

  const chartType = (opts.chart as Record<string, unknown>)?.type as string ?? "line";
  const series = opts.series as Array<Record<string, unknown>> | undefined;
  if (!series?.length) return opts as Options;

  const isLineType = chartType === "line" || chartType === "spline";
  const hasMultipleSeries = series.length > 1;
  const needsMarkers = MARKER_TYPES.has(chartType);

  opts.series = series.map((s, i) => ({
    ...s,
    // Enable markers for point-based chart types
    ...(needsMarkers || MARKER_TYPES.has(s.type as string ?? "")
      ? { marker: { enabled: true, ...(s.marker as object ?? {}) } }
      : {}),
    // Primer: cycle dash styles and marker shapes for multi-line differentiation
    ...(isLineType && hasMultipleSeries && !s.dashStyle
      ? {
          dashStyle: DASH_STYLES[i % DASH_STYLES.length],
          marker: {
            symbol: MARKER_SYMBOLS[i % MARKER_SYMBOLS.length],
            ...(s.marker as object ?? {}),
          },
        }
      : {}),
  })) as Options["series"];

  return opts as Options;
}
