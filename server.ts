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
        "Render an interactive Highcharts chart. Pass series data, chart type, title, and optional Highcharts configuration. " +
        "Supports: line, bar, column, area, pie, spline, areaspline, scatter. " +
        "The `highchartsOptions` field accepts any valid Highcharts chart options for full customization.",
      inputSchema: {},
      _meta: { ui: { resourceUri } },
    },
    async (params: Record<string, unknown>): Promise<CallToolResult> => {
      // Pass the chart config straight through as JSON — the view renders it
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(params),
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
