import { z } from "zod";
import meta from "./highcharts-meta.json" with { type: "json" };
import generatedChartTypes from "./generated/chart-types.json" with { type: "json" };

const CHART_TYPES = generatedChartTypes as [string, ...string[]];

const EXAMPLES: Record<string, unknown[]> = {
  xAxis: [{ categories: ["Q1", "Q2", "Q3", "Q4"] }],
  yAxis: [{ title: { text: "Revenue ($)" } }],
  tooltip: [{ shared: true }],
  plotOptions: [{ series: { dataLabels: { enabled: true } } }],
};

const SERIES_EXAMPLES = [
  [{ name: "Revenue", data: [100, 200, 300, 400] }],
  [{ type: "column", name: "Sales", data: [800, 400, 350] }, { type: "spline", name: "Trend", data: [700, 500, 350] }],
  [{ type: "pie", name: "Share", data: [{ name: "Chrome", y: 65 }, { name: "Firefox", y: 20 }, { name: "Safari", y: 15 }] }],
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
