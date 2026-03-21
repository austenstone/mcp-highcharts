import { z } from "zod";
import meta from "./highcharts-meta.json" with { type: "json" };

const CHART_TYPES = meta.chartTypes as [string, ...string[]];

const EXAMPLES: Record<string, unknown[]> = {
  xAxis: [{ categories: ["Q1", "Q2", "Q3", "Q4"] }, { type: "datetime" }],
  yAxis: [{ title: { text: "Revenue ($)" } }, { labels: { format: "{value}%" }, min: 0, max: 100 }],
  tooltip: [{ valueSuffix: " USD", valuePrefix: "$" }, { shared: true }],
  plotOptions: [{ series: { stacking: "normal" } }, { series: { dataLabels: { enabled: true } } }],
  legend: [{ enabled: false }, { align: "right", verticalAlign: "middle", layout: "vertical" }],
  colorAxis: [{ min: 0, minColor: "#30363d", maxColor: "#006edb" }],
  pane: [{ startAngle: -90, endAngle: 90 }],
  colors: [["#006edb", "#30a147", "#eb670f"]],
  drilldown: [{ series: [{ id: "details", data: [["A", 10], ["B", 20]] }] }],
};

const SERIES_EXAMPLES = [
  [{ name: "Revenue", data: [100, 200, 300, 400] }],
  [{ name: "2025", data: [10, 20, 30] }, { name: "2026", data: [15, 25, 40] }],
  [{ type: "column", name: "Sales", data: [800, 400, 350] }, { type: "spline", name: "Trend", data: [700, 500, 350] }],
  [{ type: "pie", name: "Share", data: [{ name: "Chrome", y: 65 }, { name: "Firefox", y: 20 }, { name: "Safari", y: 15 }] }],
  [{ type: "scatter", name: "Samples", data: [[1, 2], [3, 4], [5, 8], [7, 3]] }],
  [{ type: "heatmap", name: "Intensity", data: [[0, 0, 10], [0, 1, 19], [1, 0, 92], [1, 1, 58]] }],
  [{ type: "sankey", name: "Flow", data: [{ from: "A", to: "B", weight: 5 }, { from: "B", to: "C", weight: 3 }] }],
  [{ type: "treemap", name: "Sizes", data: [{ name: "A", value: 6 }, { name: "B", value: 4 }] }],
  [{ type: "networkgraph", name: "Links", data: [{ from: "Node1", to: "Node2" }, { from: "Node2", to: "Node3" }] }],
  [{ type: "timeline", data: [{ name: "Launch", label: "2024", description: "Shipped v1" }] }],
  [{ type: "solidgauge", name: "CPU", data: [72] }],
  [{ name: "Traffic", data: [[1704067200000, 100], [1704153600000, 150], [1704240000000, 130]] }],
];

// Build options keys from generated metadata
function buildOptionsFields(): Record<string, z.ZodTypeAny> {
  const fields: Record<string, z.ZodTypeAny> = {};
  for (const { name, description } of meta.optionsKeys) {
    let field = z.any().optional().describe(description);
    if (EXAMPLES[name]) {
      field = field.meta({ examples: EXAMPLES[name] });
    }
    fields[name] = field;
  }
  return fields;
}

export const inputSchema = {
  chart: z.object({
    type: z.enum(CHART_TYPES).optional().describe("Chart type"),
    height: z.union([z.number(), z.string()]).optional().describe("Chart height in px or CSS string"),
  }).passthrough().optional().describe("Chart config")
    .meta({ examples: [{ type: "line" }, { type: "column", height: 400 }, { type: "pie" }] }),

  title: z.any().optional().describe("String shorthand or { text, style, align }")
    .meta({ examples: ["Revenue by Quarter", { text: "Monthly Active Users" }] }),

  subtitle: z.any().optional().describe("String shorthand or { text, style, align }")
    .meta({ examples: ["Q1-Q4 2026"] }),

  series: z.array(z.object({
    type: z.enum(CHART_TYPES).optional().describe("Series type (overrides chart.type)"),
    name: z.string().optional().describe("Series name for legend"),
    data: z.any().describe("Data array: number[], [x,y][], {name,y}[], {from,to,weight}[]"),
    color: z.string().optional().describe("Override series color"),
    id: z.string().optional().describe("ID for drilldown references"),
  }).passthrough()).describe("Series array")
    .meta({ examples: SERIES_EXAMPLES }),

  ...buildOptionsFields(),
};
