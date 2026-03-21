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

/** Build Highcharts Options from tool params */
export function buildChartOptions(params: ChartToolParams): Options {
  const base: Options = {
    chart: {
      type: params.chartType ?? "line",
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
    },
    series: params.series.map((s) => ({
      ...s,
      type: (s.type ?? undefined) as never,
    })) as Options["series"],
  };

  if (params.highchartsOptions) {
    return deepMerge(base, params.highchartsOptions);
  }

  return base;
}
