import * as z from "zod";
import chartTypes from "./generated/chart-types.json" with { type: "json" };
import optionsFields from "./generated/options-fields.json" with { type: "json" };

const CHART_TYPES = chartTypes as [string, ...string[]];

// ── Chart config ──
const chartSchema = z.object({
  type: z.enum(CHART_TYPES).optional()
    .describe("Chart type (line, bar, column, pie, scatter, heatmap, sankey, etc.)"),
  height: z.union([z.number(), z.string()]).optional()
    .describe("Chart height in px or CSS string like '50%'"),
  styledMode: z.boolean().optional()
    .describe("Enable styled mode for CSS-only theming"),
}).passthrough()
  .describe("General chart configuration")
  .meta({
    examples: [
      { type: "line" },
      { type: "column", height: 400 },
      { type: "pie" },
      { type: "heatmap" },
    ],
  });

// ── Title/Subtitle — string shorthand or object ──
const titleSchema = z.union([
  z.string(),
  z.object({
    text: z.string().optional(),
    align: z.enum(["left", "center", "right"]).optional(),
    style: z.record(z.string(), z.string()).optional(),
  }).passthrough(),
]).optional()
  .describe("Chart title — string shorthand or {text, align, style}")
  .meta({ examples: ["Revenue by Quarter", { text: "Monthly Active Users", align: "left" }] });

const subtitleSchema = z.union([
  z.string(),
  z.object({
    text: z.string().optional(),
    align: z.enum(["left", "center", "right"]).optional(),
    style: z.record(z.string(), z.string()).optional(),
  }).passthrough(),
]).optional()
  .describe("Chart subtitle — string shorthand or {text, align, style}")
  .meta({ examples: ["Q1-Q4 2026"] });

// ── Series ──
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
  color: z.string().optional()
    .describe("Override series color (hex, rgb, CSS variable)"),
  id: z.string().optional()
    .describe("Series ID for drilldown, linkedTo, or baseSeries references"),
  visible: z.boolean().optional()
    .describe("Whether the series is visible on initial render"),
  index: z.number().optional()
    .describe("Series index for ordering"),
  dashStyle: z.string().optional()
    .describe("Dash style: Solid, Dash, Dot, DashDot, LongDash, etc."),
  lineWidth: z.number().optional()
    .describe("Line width in pixels"),
  marker: z.object({
    enabled: z.boolean().optional(),
    radius: z.number().optional(),
    symbol: z.string().optional(),
  }).passthrough().optional()
    .describe("Data point markers"),
  dataLabels: z.any().optional()
    .describe("Data labels configuration"),
  tooltip: z.any().optional()
    .describe("Per-series tooltip overrides"),
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

// ── Axis schemas ──
const axisSchema = z.union([
  z.object({
    title: z.any().optional().describe("Axis title"),
    categories: z.array(z.string()).optional().describe("Category names for this axis"),
    type: z.enum(["linear", "logarithmic", "datetime", "category", "treegrid"]).optional()
      .describe("Axis type"),
    min: z.number().optional(),
    max: z.number().optional(),
    labels: z.any().optional().describe("Axis label formatting"),
    gridLineColor: z.string().optional(),
    gridLineDashStyle: z.string().optional(),
    plotLines: z.array(z.any()).optional().describe("Reference lines"),
    plotBands: z.array(z.any()).optional().describe("Colored bands"),
    opposite: z.boolean().optional().describe("Show on opposite side"),
  }).passthrough(),
  z.array(z.any()), // Multiple axes
]).optional();

const xAxisSchema = axisSchema.describe("X-axis configuration (single or array for multiple)")
  .meta({ examples: [{ categories: ["Q1", "Q2", "Q3", "Q4"] }, { type: "datetime" }] });

const yAxisSchema = axisSchema.describe("Y-axis configuration (single or array for multiple)")
  .meta({ examples: [{ title: { text: "Revenue ($)" } }, { min: 0, max: 100, title: { text: "Percentage" } }] });

// ── Tooltip ──
const tooltipSchema = z.object({
  shared: z.boolean().optional().describe("Share tooltip between series"),
  split: z.boolean().optional().describe("Split tooltip per series"),
  valueSuffix: z.string().optional().describe("Suffix after values"),
  valuePrefix: z.string().optional().describe("Prefix before values"),
  pointFormat: z.string().optional().describe("HTML format string for each point"),
  headerFormat: z.string().optional().describe("HTML format string for header"),
  formatter: z.any().optional().describe("Custom formatter function"),
}).passthrough().optional()
  .describe("Tooltip configuration")
  .meta({ examples: [{ shared: true, valueSuffix: " units" }] });

// ── Legend ──
const legendSchema = z.object({
  enabled: z.boolean().optional(),
  align: z.enum(["left", "center", "right"]).optional(),
  verticalAlign: z.enum(["top", "middle", "bottom"]).optional(),
  layout: z.enum(["horizontal", "vertical", "proximate"]).optional(),
  floating: z.boolean().optional(),
}).passthrough().optional()
  .describe("Legend configuration")
  .meta({ examples: [{ align: "right", verticalAlign: "middle", layout: "vertical" }] });

// ── PlotOptions ──
const plotOptionsSchema = z.record(z.string(), z.any()).optional()
  .describe("Per-series-type default options (e.g., plotOptions.series, plotOptions.column)")
  .meta({ examples: [{ series: { stacking: "normal" } }, { column: { borderRadius: 5 } }] });

// ── ColorAxis ──
const colorAxisSchema = z.any().optional()
  .describe("Color axis for heatmaps, choropleth maps, etc.")
  .meta({ examples: [{ min: 0, minColor: "#FFFFFF", maxColor: "#006edb" }] });

// ── Pane (for gauges) ──
const paneSchema = z.any().optional()
  .describe("Pane configuration for polar/gauge charts")
  .meta({ examples: [{ startAngle: -90, endAngle: 90, background: [{ backgroundColor: "#1f2937", innerRadius: "60%", outerRadius: "100%", shape: "arc" }] }] });

// ── Drilldown ──
const drilldownSchema = z.object({
  series: z.array(z.object({
    id: z.string().describe("Matches drilldown property in parent series data"),
    name: z.string().optional(),
    data: z.any(),
  }).passthrough()).optional(),
}).passthrough().optional()
  .describe("Drilldown configuration for click-to-explore charts")
  .meta({ examples: [{ series: [{ id: "detail", name: "Breakdown", data: [["A", 50], ["B", 30]] }] }] });

// ── Colors ──
const colorsSchema = z.array(z.string()).optional()
  .describe("Default color palette for the chart series")
  .meta({ examples: [["#006edb", "#30a147", "#eb670f", "#ce2c85", "#b88700"]] });

const colorModeSchema = z.string().optional()
  .describe(
    "Generate a color palette automatically. Use a preset name " +
    "(monochrome, monochrome-blue, monochrome-green, monochrome-purple, " +
    "monochrome-red, monochrome-orange, monochrome-teal) or pass any CSS color " +
    '(e.g. "#ff6600") to generate monochrome shades from that base color. ' +
    "Overrides the colors array if both are provided."
  )
  .meta({ examples: ["monochrome", "monochrome-blue", "#7b68ee"] });

// ── Build remaining fields from generated Options interface data ──
const EXPLICIT_FIELDS = new Set([
  "chart", "title", "subtitle", "series", "xAxis", "yAxis",
  "tooltip", "legend", "plotOptions", "colorAxis", "pane",
  "drilldown", "colors",
]);

// Only surface the most commonly used remaining fields.
// Everything else still passes through via .passthrough() on the top-level object.
const SURFACED_FIELDS = new Set([
  "responsive", "annotations", "navigation", "accessibility", "credits",
  "exporting", "lang", "loading", "noData", "time", "boost", "data", "defs",
]);

function buildRemainingFields(): Record<string, z.ZodTypeAny> {
  const fields: Record<string, z.ZodTypeAny> = {};
  for (const field of (optionsFields as Array<{ name: string; description: string; optional: boolean }>)) {
    if (!EXPLICIT_FIELDS.has(field.name) && SURFACED_FIELDS.has(field.name)) {
      fields[field.name] = z.any().optional().describe(field.description);
    }
  }
  return fields;
}

// ── Data source ──
const dataSourceSchema = z.string().optional().describe(
  "Path to a data file (CSV, JSON, TSV) relative to the workspace, or a URL. " +
  "The server reads the file and injects it via Highcharts' data module (data.csv). " +
  "If series[].data is also provided inline, inline data takes precedence. " +
  "Alternative: pass CSV directly as data.csv in the options without using dataSource."
);

// ── Export the complete input schema ──
export const inputSchema = {
  dataSource: dataSourceSchema,
  data: z.object({
    csv: z.string().optional().describe("Raw CSV string. Highcharts auto-parses columns into series. First row = headers, first column = xAxis categories."),
    csvURL: z.string().optional().describe("URL to a CSV file. Highcharts fetches and parses it. Combine with enablePolling for live data."),
    rows: z.array(z.array(z.any())).optional().describe("2D array of data rows (first row = column names)."),
    columns: z.array(z.array(z.any())).optional().describe("2D array of data columns (first element = column name)."),
    columnsURL: z.string().optional().describe("URL to a JSON file with column-oriented data. Combine with enablePolling for live data."),
    rowsURL: z.string().optional().describe("URL to a JSON file with row-oriented data. Combine with enablePolling for live data."),
    enablePolling: z.boolean().optional().describe("Poll the data URL periodically for live-updating charts. Default: false."),
    dataRefreshRate: z.number().optional().describe("Polling interval in seconds when enablePolling is true. Default: 1."),
    googleSpreadsheetKey: z.string().optional().describe("Google Sheets spreadsheet key for live data."),
    googleSpreadsheetRange: z.string().optional().describe("Cell range in A1 notation (e.g. 'A1:D20')."),
    itemDelimiter: z.string().optional().describe("CSV column delimiter. Auto-detected if omitted."),
    decimalPoint: z.string().optional().describe("Decimal point character. Default: '.'"),
    switchRowsAndColumns: z.boolean().optional().describe("Swap rows and columns interpretation."),
  }).passthrough().optional().describe(
    "Highcharts data module config. For LIVE DATA: set csvURL (or rowsURL/columnsURL) + enablePolling: true + dataRefreshRate: N. " +
    "Highcharts handles polling, animation, and point shifting natively. " +
    "See https://www.highcharts.com/docs/working-with-data/live-data"
  ),
  chart: chartSchema,
  title: titleSchema,
  subtitle: subtitleSchema,
  series: seriesSchema.optional(),
  xAxis: xAxisSchema,
  yAxis: yAxisSchema,
  tooltip: tooltipSchema,
  legend: legendSchema,
  plotOptions: plotOptionsSchema,
  colorAxis: colorAxisSchema,
  pane: paneSchema,
  drilldown: drilldownSchema,
  colors: colorsSchema,
  colorMode: colorModeSchema,
  ...buildRemainingFields(),
};
