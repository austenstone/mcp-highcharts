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
        "Render an interactive Highcharts chart. Pass series data, chart type, title, and optional Highcharts configuration. " +
        "Supports: line, bar, column, area, pie, spline, areaspline, scatter, heatmap. " +
        "The `highchartsOptions` field accepts any valid Highcharts chart options for full customization.",
      inputSchema: {
        chartType: z.string().optional().describe("Chart type: line, bar, column, area, pie, spline, areaspline, scatter, heatmap"),
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
        highchartsOptions: z.record(z.string(), z.any()).optional().describe("Additional Highcharts options to deep-merge"),
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
