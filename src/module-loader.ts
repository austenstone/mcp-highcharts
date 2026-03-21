import Highcharts from "highcharts";

// Map of chart/series types to their required module imports.
// Dependencies are handled by import order — put deps first.
// Only the modules for chart types we support (curated list from highcharts-meta.json).
const MODULE_MAP: Record<string, () => Promise<unknown>> = {
  // Core extras (needed by several types)
  _more: () => import("highcharts/highcharts-more"),
  _3d: () => import("highcharts/highcharts-3d"),

  // Types that need highcharts-more
  arearange: () => import("highcharts/highcharts-more"),
  areasplinerange: () => import("highcharts/highcharts-more"),
  boxplot: () => import("highcharts/highcharts-more"),
  bubble: () => import("highcharts/highcharts-more"),
  columnrange: () => import("highcharts/highcharts-more"),
  errorbar: () => import("highcharts/highcharts-more"),
  gauge: () => import("highcharts/highcharts-more"),
  packedbubble: () => import("highcharts/highcharts-more"),
  polygon: () => import("highcharts/highcharts-more"),
  waterfall: () => import("highcharts/highcharts-more"),

  // Individual modules
  heatmap: () => import("highcharts/modules/heatmap"),
  tilemap: async () => { await import("highcharts/modules/heatmap"); await import("highcharts/modules/tilemap"); },
  treemap: () => import("highcharts/modules/treemap"),
  sunburst: () => import("highcharts/modules/sunburst"),
  sankey: () => import("highcharts/modules/sankey"),
  "arc-diagram": async () => { await import("highcharts/modules/sankey"); await import("highcharts/modules/arc-diagram"); },
  arcdiagram: async () => { await import("highcharts/modules/sankey"); await import("highcharts/modules/arc-diagram"); },
  "dependency-wheel": async () => { await import("highcharts/modules/sankey"); await import("highcharts/modules/dependency-wheel"); },
  dependencywheel: async () => { await import("highcharts/modules/sankey"); await import("highcharts/modules/dependency-wheel"); },
  organization: async () => { await import("highcharts/modules/sankey"); await import("highcharts/modules/organization"); },
  networkgraph: () => import("highcharts/modules/networkgraph"),
  wordcloud: () => import("highcharts/modules/wordcloud"),
  timeline: () => import("highcharts/modules/timeline"),
  treegraph: () => import("highcharts/modules/treegraph"),
  venn: () => import("highcharts/modules/venn"),
  funnel: () => import("highcharts/modules/funnel"),
  item: () => import("highcharts/modules/item-series"),
  variwide: () => import("highcharts/modules/variwide"),
  streamgraph: () => import("highcharts/modules/streamgraph"),
  "solid-gauge": async () => { await import("highcharts/highcharts-more"); await import("highcharts/modules/solid-gauge"); },
  solidgauge: async () => { await import("highcharts/highcharts-more"); await import("highcharts/modules/solid-gauge"); },
  xrange: () => import("highcharts/modules/xrange"),
  dumbbell: () => import("highcharts/modules/dumbbell"),
  lollipop: () => import("highcharts/modules/lollipop"),
  bullet: () => import("highcharts/modules/bullet"),
  pictorial: () => import("highcharts/modules/pictorial"),
  "variable-pie": () => import("highcharts/modules/variable-pie"),
  variablepie: () => import("highcharts/modules/variable-pie"),
};

// Always load these for common functionality
const ALWAYS_LOAD = [
  () => import("highcharts/modules/accessibility"),
  () => import("highcharts/modules/drilldown"),
  () => import("highcharts/modules/no-data-to-display"),
];

const loaded = new Set<string>();

/**
 * Inspect chart options, determine which modules are needed, and dynamically import them.
 * Safe to call multiple times — modules are only loaded once.
 */
export async function loadModulesForOptions(options: Record<string, unknown>): Promise<void> {
  // Load always-needed modules once
  if (!loaded.has("_always")) {
    await Promise.all(ALWAYS_LOAD.map(fn => fn()));
    loaded.add("_always");
  }

  // Collect all chart types from options
  const types = new Set<string>();
  const chart = options.chart as Record<string, unknown> | undefined;
  if (chart?.type && typeof chart.type === "string") types.add(chart.type);

  const series = options.series as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(series)) {
    for (const s of series) {
      if (s.type && typeof s.type === "string") types.add(s.type);
    }
  }

  // Check for features that need coloraxis module
  if (options.colorAxis) types.add("_coloraxis");

  // Load needed modules (skip already loaded)
  const toLoad = [...types].filter(t => MODULE_MAP[t] && !loaded.has(t));
  for (const t of toLoad) {
    await MODULE_MAP[t]();
    loaded.add(t);
  }
}
