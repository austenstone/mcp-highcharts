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
 * Parse HIGHCHARTS_OPTIONS (or HIGHCHARTS_THEME) env var.
 * A bare word is treated as a built-in theme name.
 * A string starting with "{" is inline JSON passed to setOptions().
 * A path ending in .ts/.mts is dynamically imported (default export).
 * Anything else is a file path to a JSON file.
 */
async function loadUserOptions(): Promise<{ name?: string; json?: string } | null> {
  const raw = (process.env.HIGHCHARTS_OPTIONS ?? process.env.HIGHCHARTS_THEME)?.trim();
  if (!raw) return null;

  if (raw.startsWith("{")) {
    JSON.parse(raw);
    return { json: raw };
  }

  if (!raw.includes("/") && !raw.includes("\\") && !raw.includes(".")) {
    return { name: raw };
  }

  // TypeScript/JS module: dynamic import and serialize the default export
  if (/\.[mc]?[tj]s$/.test(raw)) {
    const absPath = path.resolve(raw);
    try {
      const mod = await import(absPath);
      const theme = mod.default ?? mod;
      return { json: JSON.stringify(theme) };
    } catch {
      // Fallback: run with tsx to handle TypeScript
      const { execFileSync } = await import("node:child_process");
      const script = `import(${JSON.stringify(absPath)}).then(m=>console.log(JSON.stringify(m.default??m)))`;
      const out = execFileSync("npx", ["tsx", "-e", script], { encoding: "utf-8" }).trim();
      JSON.parse(out);
      return { json: out };
    }
  }

  const content = await fs.readFile(raw, "utf-8");
  JSON.parse(content);
  return { json: content };
}

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
        "title and subtitle accept string shorthand. All 50+ Highcharts series types are supported.",
    },
  );

  const resourceUri = "ui://highcharts/mcp-app.html";

  // The chart tool — the LLM calls this with series data, chart type, and options.
  // The view receives the tool result and renders it with Highcharts.
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
        "50+ series types: line, bar, column, area, pie, spline, scatter, heatmap, gauge, " +
        "treemap, sankey, funnel, networkgraph, waterfall, boxplot, timeline, wordcloud, and more. " +
        "title/subtitle accept string shorthand.",
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

      try {
        const userOpts = await loadUserOptions();
        if (userOpts?.name) {
          const injection = `<script>window.__HIGHCHARTS_THEME_NAME__="${userOpts.name}";</script>`;
          html = html.replace("<head>", `<head>${injection}`);
        } else if (userOpts?.json) {
          const injection = `<script>window.__HIGHCHARTS_OPTIONS__=${userOpts.json};</script>`;
          html = html.replace("<head>", `<head>${injection}`);
        }
      } catch (e) {
        console.error("Failed to inject options:", e);
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
