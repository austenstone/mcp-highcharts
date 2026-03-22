import * as z from "zod";
import chartTypes from "./generated/chart-types.json" with { type: "json" };
import {
  optionsSchema as generatedOptionsSchema,
  chartOptionsSchema,
  dataOptionsSchema,
  tooltipOptionsSchema as genTooltipSchema,
  legendOptionsSchema as genLegendSchema,
  titleOptionsSchema as genTitleSchema,
  subtitleOptionsSchema as genSubtitleSchema,
} from "./generated/highcharts-options.gen.js";

const CHART_TYPES = chartTypes as [string, ...string[]];

// ── LLM-friendly overrides ──
// The generated schemas have full Highcharts types. These overrides add
// curated descriptions, examples, and string shorthands that help LLMs
// produce better chart configs on the first try.

const chartSchema = (chartOptionsSchema as z.ZodObject<any>).extend({
  type: z.enum(CHART_TYPES).optional()
    .describe("Chart type (line, bar, column, pie, scatter, heatmap, sankey, etc.)"),
}).passthrough()
  .describe("General chart configuration")
  .meta({
    examples: [
      { type: "line" },
      { type: "column", height: 400 },
      { type: "pie" },
    ],
  });

// String shorthand for title/subtitle — LLMs love this
const titleSchema = z.union([
  z.string(),
  (genTitleSchema as z.ZodObject<any>).passthrough(),
]).optional()
  .describe("Chart title — string shorthand or {text, align, style}")
  .meta({ examples: ["Revenue by Quarter", { text: "Monthly Active Users", align: "left" }] });

const subtitleSchema = z.union([
  z.string(),
  (genSubtitleSchema as z.ZodObject<any>).passthrough(),
]).optional()
  .describe("Chart subtitle — string shorthand or {text, align, style}")
  .meta({ examples: ["Q1-Q4 2026"] });

// Series with rich data format documentation
const seriesSchema = z.array(z.object({
  type: z.enum(CHART_TYPES).optional()
    .describe("Series type (overrides chart.type for mixed charts)"),
  name: z.string().optional()
    .describe("Series name shown in legend and tooltip"),
  data: z.any().optional()
    .describe(
      "Data array. Common formats:\n" +
      "• number[] — simple values (line, bar, column)\n" +
      "• [x, y][] — scatter/line with explicit x\n" +
      "• [x, y, z][] — bubble, heatmap (row, col, value)\n" +
      "• {name, y}[] — pie, labeled points\n" +
      "• [from, to, weight][] — sankey, dependency wheel\n" +
      "• {x, x2, y}[] — xrange, gantt\n" +
      "• [timestamp, open, high, low, close][] — OHLC, candlestick\n" +
      "• {name, value}[] — treemap, sunburst\n" +
      "• {from, to}[] — networkgraph"
    ),
  id: z.string().optional()
    .describe("Series ID for drilldown, linkedTo, or baseSeries references"),
}).passthrough())
  .describe("Array of data series — the core of every chart")
  .meta({
    examples: [
      [{ name: "Revenue", data: [100, 200, 300, 400] }],
      [
        { type: "column", name: "Sales", data: [800, 400, 350] },
        { type: "spline", name: "Trend", data: [700, 500, 350] },
      ],
      [{ type: "pie", name: "Share", data: [{ name: "Chrome", y: 65 }, { name: "Firefox", y: 20 }] }],
    ],
  });

// ── Custom fields (not in Highcharts) ──

const dataSourceSchema = z.string().optional().describe(
  "Path to a data file (CSV, JSON, TSV) relative to the workspace, or a URL. " +
  "The server reads the file and injects it via Highcharts' data module (data.csv). " +
  "If series[].data is also provided inline, inline data takes precedence."
);

const colorModeSchema = z.string().optional()
  .describe(
    "Generate a monochrome color palette. Use a preset name " +
    "(monochrome, monochrome-blue, monochrome-green, monochrome-purple, " +
    "monochrome-red, monochrome-orange, monochrome-teal) or any CSS color " +
    '(e.g. "#ff6600") to generate shades. Overrides colors array.'
  )
  .meta({ examples: ["monochrome", "monochrome-blue", "#7b68ee"] });

// ── Assemble the input schema ──
// Start with ALL generated Highcharts fields, then override key fields
// with our LLM-friendly versions that have better descriptions and examples.
// Everything passes through — LLMs can use the full Highcharts API.

// Extract the inner object shape from the lazy schema
const generatedShape = (generatedOptionsSchema as any)._zod?.def?.getter?.()?.shape ?? {};

export const inputSchema = {
  // Spread all generated Highcharts fields as the base
  ...Object.fromEntries(
    Object.entries(generatedShape).map(([key, schema]) => [key, (schema as z.ZodTypeAny).optional()])
  ),

  // Override with LLM-friendly versions
  chart: chartSchema,
  title: titleSchema,
  subtitle: subtitleSchema,
  series: seriesSchema.optional(),
  tooltip: (genTooltipSchema as z.ZodObject<any>).passthrough().optional()
    .describe("Tooltip configuration")
    .meta({ examples: [{ shared: true, valueSuffix: " units" }] }),
  legend: (genLegendSchema as z.ZodObject<any>).passthrough().optional()
    .describe("Legend configuration")
    .meta({ examples: [{ align: "right", verticalAlign: "middle", layout: "vertical" }] }),
  plotOptions: z.record(z.string(), z.any()).optional()
    .describe("Per-series-type default options (e.g., plotOptions.series, plotOptions.column)")
    .meta({ examples: [{ series: { stacking: "normal" } }, { column: { borderRadius: 5 } }] }),
  colorAxis: z.any().optional()
    .describe("Color axis for heatmaps, choropleth maps, etc.")
    .meta({ examples: [{ min: 0, minColor: "#FFFFFF", maxColor: "#006edb" }] }),
  pane: z.any().optional()
    .describe("Pane configuration for polar/gauge charts"),
  drilldown: z.object({
    series: z.array(z.object({
      id: z.string().describe("Matches drilldown property in parent series data"),
      name: z.string().optional(),
      data: z.any(),
    }).passthrough()).optional(),
  }).passthrough().optional()
    .describe("Drilldown configuration for click-to-explore charts"),
  colors: z.array(z.string()).optional()
    .describe("Default color palette for the chart series")
    .meta({ examples: [["#006edb", "#30a147", "#eb670f", "#ce2c85", "#b88700"]] }),
  data: (dataOptionsSchema as z.ZodObject<any>).extend({
    enablePolling: z.boolean().optional().describe("Poll the data URL periodically for live-updating charts."),
    dataRefreshRate: z.number().optional().describe("Polling interval in seconds when enablePolling is true. Default: 1."),
  }).passthrough().optional()
    .describe(
      "Highcharts data module config. For LIVE DATA: set csvURL + enablePolling: true + dataRefreshRate: N. " +
      "See https://www.highcharts.com/docs/working-with-data/live-data"
    ),

  // Custom fields (not in Highcharts)
  dataSource: dataSourceSchema,
  colorMode: colorModeSchema,
};
