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
import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";
import { inputSchema } from "./src/input-schema.js";

const DIST_DIR = import.meta.filename.endsWith(".ts")
  ? path.join(import.meta.dirname, "dist")
  : import.meta.dirname;

export function createServer(): McpServer {
  const server = new McpServer(
    {
      name: "Highcharts MCP App Server",
      version: "2.0.0",
    },
    {
      instructions: "This server renders interactive Highcharts charts inline in AI chat. " +
        "Two tools available: render_chart (single chart) and render_charts (multiple charts with layout). " +
        "Input is any valid Highcharts Options object (https://api.highcharts.com/highcharts/). " +
        "All 119 chart types supported with automatic module loading. " +
        "title and subtitle accept string shorthand. " +
        "Combine chart types via per-series type for overlays (e.g., column + spline). " +
        "Use multiple yAxis for dual-axis charts.",
    },
  );

  const resourceUri = "ui://highcharts/mcp-app.html";

  registerAppTool(
    server,
    "render_chart",
    {
      title: "Render Chart",
      annotations: {
        readOnlyHint: true,
      },
      description:
        "Render an interactive Highcharts chart inline. Input is a Highcharts Options object " +
        "(https://api.highcharts.com/highcharts/) — pass any valid config directly. " +
        "Key properties: chart (type, height), title, subtitle, series (array of {type, name, data}), " +
        "xAxis, yAxis, tooltip, plotOptions, legend, colors, colorAxis, pane, drilldown. " +
        "Series types: line, bar, column, area, pie, spline, scatter, heatmap, gauge, " +
        "treemap, sankey, funnel, networkgraph, waterfall, boxplot, timeline, wordcloud, and more. " +
        "title/subtitle accept string shorthand.",
      inputSchema,
      _meta: { ui: { resourceUri } },
    },
    async (args): Promise<CallToolResult> => {
      if (!args.series || !Array.isArray(args.series)) {
        return {
          isError: true,
          content: [{ type: "text", text: "series is required and must be an array" }],
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(args) }],
      };
    },
  );

  registerAppTool(
    server,
    "render_charts",
    {
      title: "Render Multiple Charts",
      annotations: { readOnlyHint: true },
      description:
        "Render multiple Highcharts charts in a single view. " +
        "Input is an array of Highcharts Options objects. Charts are laid out vertically by default. " +
        "Use layout option to control arrangement (vertical, horizontal, grid). " +
        "Each chart in the array is a full Highcharts Options object.",
      inputSchema: {
        charts: z.array(z.any()).describe("Array of Highcharts Options objects — each one is a complete chart config"),
        layout: z.enum(["vertical", "horizontal", "grid"]).optional()
          .describe("Layout arrangement: vertical (stacked), horizontal (side by side), grid (auto-grid)")
          .meta({ examples: ["vertical", "grid"] }),
        columns: z.number().optional()
          .describe("Number of columns for grid layout (default: 2)"),
      },
      _meta: { ui: { resourceUri } },
    },
    async (args): Promise<CallToolResult> => {
      if (!args.charts || !Array.isArray(args.charts)) {
        return { isError: true, content: [{ type: "text", text: "charts is required and must be an array" }] };
      }
      return { content: [{ type: "text", text: JSON.stringify(args) }] };
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

      // HIGHCHARTS_THEME: bare theme name (e.g. "dark-unica")
      // HIGHCHARTS_OPTIONS: inline JSON string or path to a .json file
      const themeName = process.env.HIGHCHARTS_THEME?.trim();
      const rawOptions = (process.env.HIGHCHARTS_OPTIONS ?? "").trim();

      let optionsJson: string | undefined;
      if (rawOptions.startsWith("{")) {
        // Inline JSON
        try {
          JSON.parse(rawOptions);
          optionsJson = rawOptions;
        } catch (e) {
          console.error("Invalid HIGHCHARTS_OPTIONS JSON:", e);
        }
      } else if (rawOptions.endsWith(".json")) {
        // JSON file path
        try {
          const content = await fs.readFile(path.resolve(rawOptions), "utf-8");
          JSON.parse(content); // validate
          optionsJson = content;
        } catch (e) {
          console.error("Failed to load HIGHCHARTS_OPTIONS file:", e);
        }
      }

      if (optionsJson) {
        const injection = `<script>window.__HIGHCHARTS_OPTIONS__=${optionsJson};</script>`;
        html = html.replace("<head>", `<head>${injection}`);
      } else if (themeName) {
        const injection = `<script>window.__HIGHCHARTS_THEME_NAME__="${themeName}";</script>`;
        html = html.replace("<head>", `<head>${injection}`);
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
