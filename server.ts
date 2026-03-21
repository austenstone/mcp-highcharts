import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type {
  CallToolResult,
  ReadResourceResult,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const DIST_DIR = import.meta.filename.endsWith(".ts")
  ? path.join(import.meta.dirname, "dist")
  : import.meta.dirname;

export function createServer(): McpServer {
  const server = new McpServer({
    name: "Highcharts MCP App Server",
    version: "0.1.0",
  });

  const resourceUri = "ui://highcharts/mcp-app.html";

  // The chart tool — the LLM calls this with series data, chart type, and options.
  // The view receives the tool result and renders it with Highcharts.
  registerAppTool(
    server,
    "render-chart",
    {
      title: "Render Chart",
      description:
        "Render an interactive Highcharts chart inline. Supports all major chart types and full Highcharts customization. " +
        "Chart types: line, bar, column, area, pie, spline, areaspline, scatter, heatmap, " +
        "gauge, solidgauge, treemap, sunburst, sankey, funnel, networkgraph. " +
        "You can combine chart types by setting `type` on individual series (e.g. line + column on one chart). " +
        "Use `stacking` for stacked charts, `height` for sizing, `yAxisFormat` for label formatting, " +
        "`tooltipValueSuffix`/`tooltipValuePrefix` for units, `drilldown` for drill-down data, " +
        "and `highchartsOptions` as an escape hatch for any Highcharts config.",
      inputSchema: {
        chartType: z.string().optional().describe(
          "Chart type: line, bar, column, area, pie, spline, areaspline, scatter, heatmap, " +
          "gauge, solidgauge, treemap, sunburst, sankey, funnel, networkgraph"
        ),
        title: z.string().optional().describe("Chart title"),
        subtitle: z.string().optional().describe("Chart subtitle"),
        series: z.array(z.object({
          name: z.string(),
          data: z.any(),
          type: z.string().optional(),
        })).describe("Array of Highcharts series objects with name and data"),
        xAxisCategories: z.array(z.string()).optional().describe("Category labels for the X axis"),
        xAxisTitle: z.string().optional().describe("X axis title"),
        yAxisTitle: z.string().optional().describe("Y axis title"),
        yAxisFormat: z.string().optional().describe("Y axis label format string, e.g. '${value}', '{value}%', '{value}K'"),
        stacking: z.string().optional().describe("Stacking mode: 'normal' for stacked totals, 'percentage' for 100% stacked"),
        height: z.string().optional().describe("Chart height preset: 'small' (128px), 'medium' (256px), 'large' (320px), 'xl' (432px), or a number in px"),
        tooltipValueSuffix: z.string().optional().describe("Suffix appended to values in tooltip, e.g. ' USD', '%', ' users'"),
        tooltipValuePrefix: z.string().optional().describe("Prefix prepended to values in tooltip, e.g. '$', '~'"),
        drilldown: z.record(z.string(), z.any()).optional().describe("Highcharts drilldown config object with series array"),
        highchartsOptions: z.record(z.string(), z.any()).optional().describe("Any additional Highcharts options to deep-merge — the escape hatch for full customization"),
      },
      _meta: { ui: { resourceUri } },
    },
    async (args): Promise<CallToolResult> => {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(args),
          },
        ],
      };
    },
  );

  registerAppResource(
    server,
    resourceUri,
    resourceUri,
    { mimeType: RESOURCE_MIME_TYPE },
    async (): Promise<ReadResourceResult> => {
      const html = await fs.readFile(
        path.join(DIST_DIR, "mcp-app.html"),
        "utf-8",
      );
      return {
        contents: [
          { uri: resourceUri, mimeType: RESOURCE_MIME_TYPE, text: html },
        ],
      };
    },
  );

  return server;
}
