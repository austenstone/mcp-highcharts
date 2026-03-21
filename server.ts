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

/**
 * Parse the HIGHCHARTS_THEME env var.
 * Supports inline JSON or a path to a .json file.
 */
async function loadUserTheme(): Promise<string | null> {
  const raw = process.env.HIGHCHARTS_THEME;
  if (!raw) return null;

  const trimmed = raw.trim();
  if (trimmed.startsWith("{")) {
    // Validate it's parseable JSON
    JSON.parse(trimmed);
    return trimmed;
  }

  // Treat as file path
  const content = await fs.readFile(trimmed, "utf-8");
  JSON.parse(content); // validate
  return content;
}

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
        "Render an interactive Highcharts chart inline. Supports ALL Highcharts series types and full customization via the highchartsOptions escape hatch (any valid Highcharts API option: https://api.highcharts.com/highcharts/). " +
        "Common types: line, bar, column, area, pie, spline, areaspline, scatter, heatmap, gauge, solidgauge, treemap, sunburst, sankey, funnel, networkgraph. " +
        "All types: arcdiagram, area, arearange, areaspline, areasplinerange, bar, bellcurve, boxplot, bubble, bullet, column, columnpyramid, columnrange, " +
        "cylinder, dependencywheel, dumbbell, errorbar, funnel, funnel3d, gauge, heatmap, histogram, item, line, lollipop, networkgraph, organization, " +
        "packedbubble, pareto, pictorial, pie, polygon, pyramid, pyramid3d, sankey, scatter, scatter3d, solidgauge, spline, streamgraph, sunburst, " +
        "tilemap, timeline, treegraph, treemap, variablepie, variwide, vector, venn, waterfall, windbarb, wordcloud, xrange. " +
        "You can combine chart types by setting `type` on individual series (e.g. line + column on one chart). " +
        "Use `stacking` for stacked charts, `height` for sizing, `yAxisFormat` for label formatting, " +
        "`tooltipValueSuffix`/`tooltipValuePrefix` for units, `drilldown` for drill-down data, " +
        "and `highchartsOptions` as an escape hatch for any Highcharts config (see https://api.highcharts.com/highcharts/).",
      inputSchema: {
        chartType: z.string().optional().describe(
          "Default chart type applied to all series. Common: line, bar, column, area, pie, spline, scatter, heatmap, gauge, solidgauge. " +
          "Advanced: arcdiagram, arearange, areasplinerange, bellcurve, boxplot, bubble, bullet, columnpyramid, columnrange, cylinder, " +
          "dependencywheel, dumbbell, errorbar, funnel, funnel3d, histogram, item, lollipop, networkgraph, organization, packedbubble, " +
          "pareto, pictorial, polygon, pyramid, pyramid3d, sankey, scatter3d, streamgraph, sunburst, tilemap, timeline, treegraph, " +
          "treemap, variablepie, variwide, vector, venn, waterfall, windbarb, wordcloud, xrange"
        ),
        title: z.string().optional().describe("Chart title"),
        subtitle: z.string().optional().describe("Chart subtitle"),
        series: z.array(z.object({
          name: z.string(),
          data: z.any(),
          type: z.string().optional(),
          color: z.string().optional(),
          id: z.string().optional(),
        })).describe(
          "Array of Highcharts series objects. Each has `name` and `data`. " +
          "Data formats: number[] for simple values, [x,y][] for coordinates, " +
          "{name,y}[] for named points (pie), {from,to,weight}[] for sankey. " +
          "Set `type` per-series to mix chart types (e.g. column + spline). " +
          "Set `color` to override the theme color for a series. " +
          "Set `id` for drilldown references."
        ),
        xAxisCategories: z.array(z.string()).optional().describe("Category labels for the X axis"),
        xAxisTitle: z.string().optional().describe("X axis title"),
        yAxisTitle: z.string().optional().describe("Y axis title"),
        yAxisFormat: z.string().optional().describe("Y axis label format string, e.g. '${value}', '{value}%', '{value}K'"),
        stacking: z.string().optional().describe("Stacking mode: 'normal' for stacked totals, 'percentage' for 100% stacked"),
        height: z.string().optional().describe("Chart height preset: 'small' (128px), 'medium' (256px), 'large' (320px), 'xl' (432px), or a number in px"),
        tooltipValueSuffix: z.string().optional().describe("Suffix appended to values in tooltip, e.g. ' USD', '%', ' users'"),
        tooltipValuePrefix: z.string().optional().describe("Prefix prepended to values in tooltip, e.g. '$', '~'"),
        drilldown: z.record(z.string(), z.any()).optional().describe("Highcharts drilldown config object with series array"),
        highchartsOptions: z.record(z.string(), z.any()).optional().describe(
          "Any additional Highcharts options to deep-merge (see https://api.highcharts.com/highcharts/). " +
          "Use this for chart, xAxis, yAxis, plotOptions, colorAxis, pane, or any other top-level Highcharts config."
        ),
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
      let html = await fs.readFile(
        path.join(DIST_DIR, "mcp-app.html"),
        "utf-8",
      );

      // Inject user theme overrides if HIGHCHARTS_THEME is set
      try {
        const userTheme = await loadUserTheme();
        if (userTheme) {
          const injection = `<script>window.__HIGHCHARTS_THEME__=${userTheme};</script>`;
          html = html.replace("<head>", `<head>${injection}`);
        }
      } catch (e) {
        console.error("Failed to load HIGHCHARTS_THEME:", e);
      }

      return {
        contents: [
          { uri: resourceUri, mimeType: RESOURCE_MIME_TYPE, text: html },
        ],
      };
    },
  );

  return server;
}
