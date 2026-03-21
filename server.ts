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
        "Three tools available: render_chart (single chart), render_stock_chart (financial/time-series with navigator, range selector, indicators), " +
        "and render_dashboard (multiple components with layout). " +
        "Input is any valid Highcharts Options object (https://api.highcharts.com/highcharts/). " +
        "All 119 chart types supported with automatic module loading. " +
        "title and subtitle accept string shorthand. " +
        "Combine chart types via per-series type for overlays (e.g., column + spline). " +
        "Use render_dashboard for multi-chart layouts, KPIs, and data grids via @highcharts/dashboards.",
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
    "render_stock_chart",
    {
      title: "Render Stock Chart",
      annotations: { readOnlyHint: true },
      description:
        "Render a Highcharts Stock chart for financial/time-series data. " +
        "Uses Highcharts.stockChart() which provides navigator, range selector, scrollbar, crosshair, " +
        "compare mode, and 40+ technical indicators. " +
        "Supports OHLC, candlestick, HLC, flags, and all standard series types. " +
        "Input is a Highcharts Stock Options object (https://api.highcharts.com/highstock/).",
      inputSchema: {
        ...inputSchema,
        navigator: z.object({}).passthrough().optional()
          .describe("Navigator configuration for data overview pane at bottom of chart"),
        rangeSelector: z.object({}).passthrough().optional()
          .describe("Range selector buttons and date input configuration (1m, 3m, 6m, YTD, 1y, All)"),
        stockTools: z.object({}).passthrough().optional()
          .describe("Stock tools toolbar configuration for technical analysis"),
      },
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
        content: [{ type: "text", text: JSON.stringify({ ...args, __chartType: "stock" }) }],
      };
    },
  );

  registerAppTool(
    server,
    "render_dashboard",
    {
      title: "Render Dashboard",
      annotations: { readOnlyHint: true },
      description:
        "Render a Highcharts Dashboard with multiple components (charts, KPIs, data grids) in a synced layout. " +
        "Uses @highcharts/dashboards. Pass the full Dashboards.board() config.",
      inputSchema: {
        gui: z.object({}).passthrough().optional()
          .describe("Dashboard layout config with rows and cells"),
        components: z.array(z.object({}).passthrough())
          .describe("Array of dashboard components (Highcharts charts, KPIs, Grid, HTML)"),
        dataPool: z.object({}).passthrough().optional()
          .describe("Data connectors for shared data between components"),
        editMode: z.object({}).passthrough().optional()
          .describe("Edit mode configuration"),
      },
      _meta: { ui: { resourceUri } },
    },
    async (args): Promise<CallToolResult> => {
      if (!args.components || !Array.isArray(args.components)) {
        return { isError: true, content: [{ type: "text", text: "components is required and must be an array" }] };
      }
      return { content: [{ type: "text", text: JSON.stringify(args) }] };
    },
  );

  registerAppTool(
    server,
    "render_map",
    {
      title: "Render Map",
      annotations: { readOnlyHint: true },
      description:
        "Render an interactive Highcharts Map for geographic data visualization. " +
        "Uses Highcharts.mapChart() under the hood. Supports choropleth maps, map bubbles, " +
        "map lines, map points, and projections. Pass GeoJSON/TopoJSON inline via series[].mapData. " +
        "Key properties: title, series (with type: 'map'/'mapline'/'mappoint'/'mapbubble'), " +
        "colorAxis (for choropleth), mapNavigation (zoom controls), mapView (projection settings).",
      inputSchema: {
        chart: z.object({}).passthrough().optional()
          .describe("Chart configuration"),
        title: z.union([z.string(), z.object({}).passthrough()]).optional()
          .describe("Map title — string shorthand or {text, align, style}"),
        subtitle: z.union([z.string(), z.object({}).passthrough()]).optional()
          .describe("Map subtitle"),
        series: z.array(z.object({}).passthrough())
          .describe("Map series array. Use type:'map' with mapData (GeoJSON/TopoJSON FeatureCollection). " +
            "Also supports mapline, mappoint, mapbubble series types."),
        colorAxis: z.any().optional()
          .describe("Color axis for choropleth maps (min, max, minColor, maxColor, stops)"),
        mapNavigation: z.object({}).passthrough().optional()
          .describe("Map navigation: zoom buttons, mouse wheel zoom, etc."),
        mapView: z.object({}).passthrough().optional()
          .describe("Map view: projection (name, rotation), center, zoom"),
        legend: z.object({}).passthrough().optional()
          .describe("Legend configuration"),
        tooltip: z.object({}).passthrough().optional()
          .describe("Tooltip configuration"),
        plotOptions: z.record(z.string(), z.any()).optional()
          .describe("Per-series-type default options"),
        colors: z.array(z.string()).optional()
          .describe("Color palette"),
      },
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
        content: [{ type: "text", text: JSON.stringify({ ...args, __chartType: "map" }) }],
      };
    },
  );

  registerAppTool(
    server,
    "render_gantt",
    {
      title: "Render Gantt Chart",
      annotations: { readOnlyHint: true },
      description:
        "Render a Highcharts Gantt chart for project timelines, task scheduling, and resource allocation. " +
        "Supports milestones, dependencies, percent-complete, and drag-and-drop. " +
        "Uses Highcharts.ganttChart() — pass any valid Gantt options.",
      inputSchema: {
        title: z.union([z.string(), z.object({}).passthrough()]).optional()
          .describe("Chart title — string shorthand or {text, align, style}"),
        subtitle: z.union([z.string(), z.object({}).passthrough()]).optional()
          .describe("Chart subtitle"),
        series: z.array(z.object({}).passthrough())
          .describe("Gantt series with task data (start, end, name, dependency, milestone, completed)"),
        xAxis: z.any().optional()
          .describe("X-axis (datetime) configuration"),
        yAxis: z.any().optional()
          .describe("Y-axis configuration"),
        navigator: z.object({}).passthrough().optional()
          .describe("Navigator for timeline overview"),
        rangeSelector: z.object({}).passthrough().optional()
          .describe("Range selector for time filtering"),
        tooltip: z.object({}).passthrough().optional()
          .describe("Tooltip configuration"),
        plotOptions: z.record(z.string(), z.any()).optional()
          .describe("Per-series-type default options"),
        connectors: z.object({}).passthrough().optional()
          .describe("Dependency connector styling"),
      },
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
        content: [{ type: "text", text: JSON.stringify({ ...args, __chartType: "gantt" }) }],
      };
    },
  );

  registerAppTool(
    server,
    "render_grid",
    {
      title: "Render Data Grid",
      annotations: { readOnlyHint: true },
      description:
        "Render a Highcharts Grid Lite data table for tabular data display. " +
        "Standalone component — no chart required. Supports column definitions, sorting, filtering, " +
        "pagination, custom formatters, and large datasets. " +
        "Pass data as columns (Record<string, array>) or rows (array of objects).",
      inputSchema: {
        columns: z.array(z.object({}).passthrough()).optional()
          .describe("Column definitions array with id, header, cells options, sorting, filtering config"),
        data: z.object({}).passthrough().optional()
          .describe("Data provider options. Use data.columns (Record<columnId, values[]>) for column-oriented data"),
        dataTable: z.object({}).passthrough().optional()
          .describe("DataTable options with columns (Record<columnId, values[]>). Deprecated — use data instead"),
        header: z.array(z.any()).optional()
          .describe("Header structure for grouped column headers"),
        columnDefaults: z.object({}).passthrough().optional()
          .describe("Default options applied to all columns"),
        pagination: z.object({}).passthrough().optional()
          .describe("Pagination options (enabled, pageSize)"),
        rendering: z.object({}).passthrough().optional()
          .describe("Rendering options (rows.strictHeights, columns.distribution)"),
        caption: z.object({}).passthrough().optional()
          .describe("Grid caption options"),
        description: z.object({}).passthrough().optional()
          .describe("Grid description options for accessibility"),
        lang: z.object({}).passthrough().optional()
          .describe("Language/localization options"),
        // Convenience: accept row-oriented data and convert to column-oriented
        rows: z.array(z.object({}).passthrough()).optional()
          .describe("Row data as array of objects (convenience — converted to column-oriented data internally)"),
      },
      _meta: { ui: { resourceUri } },
    },
    async (args): Promise<CallToolResult> => {
      const a = args as Record<string, unknown>;
      // Must have some data source
      if (!a.data && !a.dataTable && !a.rows) {
        return {
          isError: true,
          content: [{ type: "text", text: "One of data, dataTable, or rows is required" }],
        };
      }

      // Convert convenience rows format to data.columns
      if (a.rows && Array.isArray(a.rows) && !a.data) {
        const rows = a.rows as Record<string, unknown>[];
        const colMap: Record<string, unknown[]> = {};
        for (const row of rows) {
          for (const [key, val] of Object.entries(row)) {
            (colMap[key] ??= []).push(val);
          }
        }
        a.data = { columns: colMap };
        delete a.rows;
      }

      return {
        content: [{ type: "text", text: JSON.stringify({ ...a, __chartType: "grid" }) }],
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
