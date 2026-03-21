import type { Options } from "highcharts";

/** Shape of the tool call params we receive from the LLM */
export interface ChartToolParams {
  chartType?: string;
  title?: string;
  subtitle?: string;
  series: Array<{
    name: string;
    data: unknown[];
    type?: string;
  }>;
  xAxisCategories?: string[];
  xAxisTitle?: string;
  yAxisTitle?: string;
  yAxisFormat?: string;
  stacking?: string;
  height?: string;
  drilldown?: Record<string, unknown>;
  highchartsOptions?: Record<string, unknown>;
}

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

// Primer data-viz guideline: differentiate lines with stroke style, not just color
const DASH_STYLES = ["Solid", "ShortDash", "Dot", "DashDot", "LongDash"] as const;
const MARKER_SYMBOLS = ["circle", "diamond", "square", "triangle", "triangle-down"] as const;

// Height presets matching github-ui chart-card sizes
const HEIGHT_PRESETS: Record<string, string> = {
  small: "128px",
  medium: "256px",
  large: "320px",
  xl: "432px",
  sparkline: "128px",
};

/** Resolve height from preset name or raw value */
function resolveHeight(height?: string): string | number | undefined {
  if (!height) return undefined;
  if (height in HEIGHT_PRESETS) return HEIGHT_PRESETS[height];
  const num = Number(height);
  return Number.isFinite(num) ? num : height;
}

/** Build Highcharts Options from tool params */
export function buildChartOptions(params: ChartToolParams): Options {
  const chartType = params.chartType ?? "line";
  const isLineType = chartType === "line" || chartType === "spline";
  const hasMultipleSeries = params.series.length > 1;
  const resolvedHeight = resolveHeight(params.height);

  const base: Options = {
    chart: {
      type: chartType,
      ...(resolvedHeight ? { height: resolvedHeight } : {}),
    },
    title: {
      text: params.title ?? "",
    },
    subtitle: {
      text: params.subtitle ?? undefined,
    },
    xAxis: {
      categories: params.xAxisCategories,
      title: params.xAxisTitle ? { text: params.xAxisTitle } : undefined,
    },
    yAxis: {
      title: { text: params.yAxisTitle ?? "" },
      ...(params.yAxisFormat
        ? { labels: { format: params.yAxisFormat } }
        : {}),
    },
    ...(params.stacking
      ? {
          plotOptions: {
            series: {
              stacking: params.stacking as "normal" | "percent",
            },
          },
        }
      : {}),
    ...(params.drilldown ? { drilldown: params.drilldown } : {}),
    series: params.series.map((s, i) => ({
      ...s,
      type: (s.type ?? undefined) as never,
      // Primer: cycle dash styles and marker shapes for multi-line differentiation
      ...(isLineType && hasMultipleSeries
        ? {
            dashStyle: DASH_STYLES[i % DASH_STYLES.length],
            marker: {
              symbol: MARKER_SYMBOLS[i % MARKER_SYMBOLS.length],
            },
          }
        : {}),
    })) as Options["series"],
  };

  if (params.highchartsOptions) {
    return deepMerge(base, params.highchartsOptions);
  }

  return base;
}
