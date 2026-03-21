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

export function createServer(): McpServer {
  const server = new McpServer(
    {
      name: "Highcharts MCP App Server",
      version: "1.0.0",
    },
    {
      instructions: "This server renders interactive Highcharts charts inline. " +
        "Use the render_chart tool with any valid Highcharts Options object. " +
        "The input schema accepts chart, title, subtitle, series, xAxis, yAxis, tooltip, plotOptions, legend, colors, and more. " +
        "title and subtitle accept string shorthand. All chart types are supported.",
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
