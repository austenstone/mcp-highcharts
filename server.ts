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
import { inputSchema } from "./src/input-schema.js";

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
    version: "1.0.0",
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
        "Render an interactive Highcharts chart inline. Input is a Highcharts Options object " +
        "(https://api.highcharts.com/highcharts/) — pass any valid config directly. " +
        "Key properties: chart (type, height), title, subtitle, series (array of {type, name, data}), " +
        "xAxis, yAxis, tooltip, plotOptions, legend, colors, colorAxis, pane, drilldown. " +
        "50+ series types: line, bar, column, area, pie, spline, scatter, heatmap, gauge, " +
        "treemap, sankey, funnel, networkgraph, waterfall, boxplot, timeline, wordcloud, and more. " +
        "title/subtitle accept string shorthand. The theme auto-applies; override via plotOptions or series config. " +
        "All Highcharts modules are loaded: " +
        "Core (line, area, spline, areaspline, column, bar, scatter, pie), " +
        "Highcharts More (arearange, areasplinerange, boxplot, bubble, columnrange, columnpyramid, errorbar, gauge, packedbubble, polygon, waterfall), " +
        "and all extension modules including maps (map, mapbubble, mapline, mappoint, flowmap, geoheatmap, tiledwebmap), " +
        "sankey-family (sankey, dependency-wheel, arc-diagram, organization), " +
        "and specialized types (wordcloud, timeline, treegraph, treemap, sunburst, networkgraph, funnel, " +
        "solid-gauge, venn, variwide, variable-pie, vector, windbarb, xrange, pictorial, bullet, dumbbell, " +
        "lollipop, streamgraph, tilemap, histogram-bellcurve, item-series, pareto).",
      inputSchema,
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
