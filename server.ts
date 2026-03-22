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
import * as z from "zod";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { getInputSchema } from "./src/input-schema.js";

const DIST_DIR = import.meta.filename.endsWith(".ts")
  ? path.join(import.meta.dirname, "dist")
  : import.meta.dirname;

export interface ServerOptions {
  /** Controls how much schema detail is sent to the LLM.
   *  Set as a depth number (0-3) controlling how deep into the
   *  Highcharts options tree the schema expands.
   *  - 0: truly minimal — just keys, no descriptions or examples
   *  - 1 (default): top-level keys with descriptions and examples (~21K tokens)
   *  - 2: one level of typed children (~193K tokens)
   *  - 3: two levels deep (~390K tokens)
   *
   *  Legacy string values "minimal", "basic", "full" are still supported. */
  schemaDepth?: number | "minimal" | "basic" | "full";
}

export function createServer(options?: ServerOptions): McpServer {
  const rawDepth = options?.schemaDepth
    ?? process.env.SCHEMA_DEPTH
    ?? process.env.SCHEMA_DETAIL
    ?? "1";
  // Map legacy string values to depth numbers
  const depthMap: Record<string, number> = { minimal: 0, basic: 1, full: 3 };
  const schemaDepth = typeof rawDepth === "number"
    ? rawDepth
    : depthMap[rawDepth] ?? (Number.isNaN(parseInt(rawDepth, 10)) ? 1 : parseInt(rawDepth, 10));
  const chartInputSchema = getInputSchema(schemaDepth);
  /** Default responsive rules: simplify charts in narrow panels */
  const defaultResponsiveRules = [
    {
      condition: { maxWidth: 400 },
      chartOptions: {
        legend: { enabled: false },
        credits: { enabled: false },
        subtitle: { text: undefined },
        yAxis: { title: { text: undefined } },
      },
    },
    {
      condition: { maxWidth: 300 },
      chartOptions: {
        title: { style: { fontSize: "12px" } },
        xAxis: { labels: { style: { fontSize: "9px" } } },
        yAxis: { labels: { style: { fontSize: "9px" } } },
      },
    },
  ];

  /** Inject default responsive rules if none provided */
  function applyDefaults(config: Record<string, unknown>): Record<string, unknown> {
    if (!config.responsive) {
      config.responsive = { rules: defaultResponsiveRules };
    }
    return config;
  }

  /** Build a successful tool result with text summary and structured chart config */
  function chartResult(summary: string, config: Record<string, unknown>): CallToolResult {
    return {
      content: [{ type: "text", text: summary }],
      structuredContent: applyDefaults(config) as any,
    };
  }

  /** Build a text summary for the content field */
  function chartSummary(args: Record<string, unknown>, chartType?: string): string {
    const series = args.series as any[] | undefined;
    const seriesCount = Array.isArray(series) ? series.length : 0;
    const type = chartType || (args.chart as any)?.type || series?.[0]?.type || "line";
    const title = (args.title as any)?.text || "";
    const titleStr = title ? ` "${title}"` : "";
    return `Rendered ${type} chart${titleStr} with ${seriesCount} series`;
  }

  const server = new McpServer(
    {
      name: "Highcharts MCP App Server",
      version: "2.2.0",
    },
    {
      instructions: "This server renders interactive Highcharts charts inline in AI chat. " +
        "Input is any valid Highcharts Options object (https://api.highcharts.com/highcharts/).",
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
        "Render an interactive Highcharts chart inline. " +
        "Input is a Highcharts Options object (https://api.highcharts.com/highcharts/).",
      inputSchema: chartInputSchema,
      _meta: { ui: { resourceUri } },
    },
    async (args: Record<string, unknown>): Promise<CallToolResult> => {
      if (!args.series && !args.data) {
        return {
          isError: true,
          content: [{ type: "text", text: "series or data is required" }],
        };
      }
      return chartResult(chartSummary(args), args);
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
        "Input is a Highcharts Stock Options object (https://api.highcharts.com/highstock/).",
      inputSchema: {
        ...chartInputSchema,
        navigator: z.object({
          enabled: z.boolean().optional().describe("Enable/disable the navigator pane"),
          series: z.any().optional().describe("Navigator series config (can reference main series by index)"),
        }).passthrough().optional()
          .describe("Navigator configuration for data overview pane at bottom of chart"),
        rangeSelector: z.object({
          selected: z.number().optional().describe("Index of pre-selected button (0-based)"),
          buttons: z.array(z.object({
            type: z.string().optional().describe("Unit: millisecond, second, minute, hour, day, week, month, ytd, year, all"),
            count: z.number().optional().describe("Number of units"),
            text: z.string().optional().describe("Button label"),
          }).passthrough()).optional().describe("Custom range selector buttons"),
          inputEnabled: z.boolean().optional().describe("Show date input fields"),
        }).passthrough().optional()
          .describe("Range selector buttons and date input (1m, 3m, 6m, YTD, 1y, All)"),
        scrollbar: z.object({
          enabled: z.boolean().optional().describe("Enable/disable the scrollbar"),
        }).passthrough().optional()
          .describe("Scrollbar configuration"),
        stockTools: z.object({}).passthrough().optional()
          .describe("Stock tools toolbar configuration for technical analysis"),
      },
      _meta: { ui: { resourceUri } },
    },
    async (args: Record<string, unknown>): Promise<CallToolResult> => {
      if (!args.series && !args.data) {
        return {
          isError: true,
          content: [{ type: "text", text: "series or data is required" }],
        };
      }
      const full = { ...args, __chartType: "stock" };
      return chartResult(chartSummary(args, "stock"), full);
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
        "Uses @highcharts/dashboards.",
      inputSchema: {
        gui: z.object({
          layouts: z.array(z.object({
            rows: z.array(z.object({
              cells: z.array(z.object({
                id: z.string().optional().describe("Cell ID referenced by components[].renderTo"),
                width: z.string().optional().describe("CSS width (e.g. '1/2', '1/3')"),
              }).passthrough()).optional(),
            }).passthrough()).optional(),
          }).passthrough()).optional(),
        }).passthrough().optional()
          .describe("Dashboard layout: layouts → rows → cells. Each cell has an id matched by component renderTo."),
        components: z.array(z.object({
          type: z.enum(["Highcharts", "KPI", "DataGrid", "HTML"]).optional()
            .describe("Component type"),
          renderTo: z.string().optional()
            .describe("Cell id to render this component into"),
          chartOptions: z.object(chartInputSchema).passthrough().optional()
            .describe("Highcharts options (for type: 'Highcharts')"),
          title: z.string().optional()
            .describe("Component title (KPI, HTML)"),
          value: z.any().optional()
            .describe("KPI value"),
          subtitle: z.string().optional()
            .describe("KPI subtitle"),
          connector: z.object({
            id: z.string().optional().describe("dataPool connector ID"),
          }).passthrough().optional()
            .describe("Data connector reference"),
        }).passthrough())
          .describe("Array of dashboard components (Highcharts charts, KPIs, DataGrid, HTML)"),
        dataPool: z.object({
          connectors: z.array(z.object({
            id: z.string().optional().describe("Connector ID referenced by components"),
            type: z.string().optional().describe("Connector type: JSON, CSV, GoogleSheets, HTML"),
            options: z.any().optional().describe("Connector-specific options (data, url, etc.)"),
          }).passthrough()).optional(),
        }).passthrough().optional()
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
      // Normalize gui.rows shorthand → gui.layouts[].rows[] (LLMs often use shorthand)
      const gui = (args as Record<string, unknown>).gui as Record<string, unknown> | undefined;
      if (gui?.rows && !gui.layouts) {
        gui.layouts = [{ rows: gui.rows }];
        delete gui.rows;
        gui.enabled = true;
      }
      const components = args.components as Array<Record<string, unknown>>;
      const types = [...new Set(components.map(c => (c.type as string) || "unknown"))].join(", ");
      return chartResult(`Rendered dashboard with ${components.length} components (${types})`, args);
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
        "Uses Highcharts.mapChart(). Input is a Highcharts Maps Options object (https://api.highcharts.com/highmaps/).",
      inputSchema: {
        ...chartInputSchema,
        // Override chart to highlight map field
        chart: z.object({
          map: z.union([z.string(), z.object({}).passthrough()]).optional()
            .describe("Base map — string key (e.g. 'custom/world', 'countries/us/us-all') auto-fetched from CDN, or inline GeoJSON/TopoJSON"),
        }).passthrough().optional()
          .describe("Chart configuration — use chart.map to set the base map for all series"),
        // Override series with map-specific guidance
        series: z.array(z.object({
          type: z.string().optional().describe("Series type: map, mapline, mappoint, mapbubble"),
          mapData: z.any().optional().describe("Map key string (e.g. 'custom/world', 'countries/us/us-all') — auto-fetched from CDN. Or pass inline GeoJSON/TopoJSON."),
          data: z.any().optional().describe("Data array: [{hc-key, value}] or [{lat, lon, name}]"),
          joinBy: z.union([z.string(), z.array(z.string())]).optional()
            .describe("Property to join data to mapData. String for same key on both, or [mapDataKey, dataKey] array."),
          name: z.string().optional().describe("Series name for legend/tooltip"),
        }).passthrough())
          .describe("Map series array. Use type:'map' with mapData (GeoJSON/TopoJSON FeatureCollection). " +
            "Also supports mapline, mappoint, mapbubble series types."),
        // Map-specific fields
        mapNavigation: z.object({
          enabled: z.boolean().optional().describe("Enable map navigation (zoom buttons + mouse wheel)"),
        }).passthrough().optional()
          .describe("Map navigation: zoom buttons, mouse wheel zoom, etc."),
        mapView: z.object({
          projection: z.object({
            name: z.string().optional()
              .describe("Projection: WebMercator, Miller, Orthographic, LambertConformalConic, EqualEarth"),
            rotation: z.array(z.number()).optional().describe("[lambda, phi, gamma] rotation angles"),
          }).passthrough().optional().describe("Map projection settings"),
          center: z.array(z.number()).optional().describe("[longitude, latitude] center point"),
          zoom: z.number().optional().describe("Initial zoom level"),
        }).passthrough().optional()
          .describe("Map view: projection (name, rotation), center, zoom"),
      },
      _meta: { ui: { resourceUri } },
    },
    async (args: Record<string, unknown>): Promise<CallToolResult> => {
      if (!args.series && !args.data) {
        return {
          isError: true,
          content: [{ type: "text", text: "series or data is required" }],
        };
      }
      const full = { ...args, __chartType: "map" };
      const mapKey = (args.chart as any)?.map || "custom/world";
      return chartResult(`Rendered map chart (${mapKey}) with ${((args.series as any[]) || []).length} series`, full);
    },
  );

  registerAppTool(
    server,
    "render_gantt",
    {
      title: "Render Gantt Chart",
      annotations: { readOnlyHint: true },
      description:
        "Render a Highcharts Gantt chart for project timelines and task scheduling. " +
        "Uses Highcharts.ganttChart() (https://api.highcharts.com/gantt/).",
      inputSchema: {
        ...chartInputSchema,
        // Override series with gantt-specific guidance
        series: z.array(z.object({
          name: z.string().optional().describe("Series name"),
          data: z.array(z.object({
            name: z.string().optional().describe("Task name"),
            start: z.number().optional().describe("Start timestamp (ms since epoch)"),
            end: z.number().optional().describe("End timestamp (ms since epoch)"),
            dependency: z.union([z.string(), z.array(z.string())]).optional()
              .describe("Task ID(s) this depends on — draws connector arrows"),
            completed: z.union([z.number(), z.object({ amount: z.number() }).passthrough()]).optional()
              .describe("Completion ratio 0-1 or { amount: 0.5, fill: '#color' }"),
            milestone: z.boolean().optional().describe("Render as diamond milestone marker"),
            id: z.string().optional().describe("Task ID for dependency references"),
            parent: z.string().optional().describe("Parent task ID for nested/grouped tasks"),
          }).passthrough()).optional().describe("Task data array"),
        }).passthrough())
          .describe("Gantt series with task data"),
        // Gantt-specific fields
        connectors: z.object({}).passthrough().optional()
          .describe("Dependency connector styling"),
      },
      _meta: { ui: { resourceUri } },
    },
    async (args: Record<string, unknown>): Promise<CallToolResult> => {
      if (!args.series && !args.data) {
        return {
          isError: true,
          content: [{ type: "text", text: "series or data is required" }],
        };
      }
      const full = { ...args, __chartType: "gantt" };
      const series = args.series as any[] | undefined;
      const tasks = series ? series.reduce((n, s) => n + (Array.isArray(s.data) ? s.data.length : 0), 0) : 0;
      return chartResult(`Rendered Gantt chart with ${tasks} tasks`, full);
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
        "Standalone component — no chart required.",
      inputSchema: {
        columns: z.array(z.object({
          id: z.string().optional().describe("Column ID matching data key"),
          header: z.object({
            text: z.string().optional().describe("Column header text"),
          }).passthrough().optional().describe("Header options"),
          cells: z.object({
            format: z.string().optional().describe("Cell format string, e.g. '{value:.2f}' or '{value:%Y-%m-%d}'"),
          }).passthrough().optional().describe("Cell rendering options"),
          sorting: z.object({
            sortable: z.boolean().optional().describe("Enable sorting for this column"),
          }).passthrough().optional().describe("Column sorting config"),
        }).passthrough()).optional()
          .describe("Column definitions array with id, header, cells options, sorting config"),
        data: z.object({
          columns: z.record(z.string(), z.array(z.any())).optional()
            .describe("Column-oriented data: { columnId: [values...] }"),
        }).passthrough().optional()
          .describe("Data provider options. Use data.columns (Record<columnId, values[]>) for column-oriented data"),
        dataTable: z.object({
          columns: z.record(z.string(), z.array(z.any())).optional()
            .describe("Column-oriented data: { columnId: [values...] }"),
        }).passthrough().optional()
          .describe("DataTable options. Deprecated — use data instead"),
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

      return chartResult(`Rendered data grid`, { ...a, __chartType: "grid" });
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
          optionsJson = content;
        } catch (e) {
          console.error("Failed to load HIGHCHARTS_OPTIONS file:", e);
        }
      } else if (/\.[mc]?[tj]s$/.test(rawOptions)) {
        // JS/TS module — try native import, fall back to tsx for TypeScript
        const absPath = path.resolve(rawOptions);
        try {
          const mod = await import(pathToFileURL(absPath).href);
          const obj = mod.default ?? mod;
          optionsJson = JSON.stringify(obj);
        } catch {
          try {
            const { execFileSync } = await import("node:child_process");
            const script = `import(${JSON.stringify(pathToFileURL(absPath).href)}).then(m=>console.log(JSON.stringify(m.default??m)))`;
            const cmd = process.platform === "win32" ? "npx.cmd" : "npx";
            const out = execFileSync(cmd, ["tsx", "-e", script], { encoding: "utf-8" }).trim();
            optionsJson = out;
          } catch (e) {
            console.error("Failed to load HIGHCHARTS_OPTIONS module:", e);
          }
        }
      }

      if (optionsJson) {
        // Escape < to prevent </script> breakout in embedded JSON
        const safeJson = optionsJson.replace(/</g, "\\u003c");
        const injection = `<script>window.__HIGHCHARTS_OPTIONS__=${safeJson};</script>`;
        html = html.replace("<head>", `<head>${injection}`);
      } else if (themeName) {
        const safeThemeName = JSON.stringify(themeName);
        const injection = `<script>window.__HIGHCHARTS_THEME_NAME__=${safeThemeName};</script>`;
        html = html.replace("<head>", `<head>${injection}`);
      }

      return {
        contents: [
          {
            uri: resourceUri,
            mimeType: RESOURCE_MIME_TYPE,
            text: html,
            _meta: {
              ui: {
                csp: {
                  connectDomains: ["*"],
                },
              },
            },
          },
        ],
      };
    },
  );

  // ── MCP Prompts ──────────────────────────────────────────────────────

  server.prompt(
    "chart_from_data",
    "Paste your data and I'll suggest the best chart type",
    { data: z.string().describe("Your data (CSV, JSON, or plain text)") },
    async ({ data }) => ({
      messages: [{
        role: "assistant",
        content: {
          type: "text",
          text: `Analyze this data and create the most appropriate chart:\n\n\`\`\`\n${data}\n\`\`\`\n\nInstructions:\n1. Identify the data structure (time-series, categorical, hierarchical, geographic, relational)\n2. Count dimensions and measures\n3. Pick the best chart type:\n   - Time-series → line/area/spline (or render_stock_chart for financial data)\n   - Categories with values → bar/column\n   - Parts of a whole → pie/treemap/sunburst\n   - Correlation → scatter/bubble\n   - Distribution → boxplot/histogram\n   - Flow → sankey/networkgraph\n   - Geographic → render_map\n4. Use the appropriate render_* tool with well-formatted Highcharts options\n5. Add a clear title, axis labels, and tooltip formatting\n6. For time-series: use pointStart + pointInterval instead of explicit timestamps to save tokens`,
        },
      }],
    }),
  );

  server.prompt(
    "dashboard_layout",
    "Create a dashboard with KPIs and charts",
    { topic: z.string().describe("Dashboard topic (e.g. 'sales performance', 'server monitoring')") },
    async ({ topic }) => ({
      messages: [{
        role: "assistant",
        content: {
          type: "text",
          text: `Create a Highcharts Dashboard for: "${topic}"\n\nUse render_dashboard with this structure:\n\n1. **Layout (gui):** Define rows and cells. Typical pattern:\n   - Row 1: 3-4 KPI cells across the top\n   - Row 2: 1 large chart (full width or 2/3) + 1 smaller chart or grid\n   - Row 3: Data grid with details\n\n2. **KPI components:** Use type:'KPI' with value, subtitle, and threshold colors\n\n3. **Chart components:** Use type:'Highcharts' with chartOptions containing full Highcharts config\n\n4. **Data Grid:** Use type:'DataGrid' for tabular drill-down\n\n5. **DataPool:** Define shared connectors so components sync (filtering one updates others)\n   - For live data from Google Sheets: { type: "GoogleSheets", options: { googleSpreadsheetKey: "...", worksheet: "Sheet1" } }\n   - For CSV URLs: { type: "CSV", options: { csvURL: "..." } }\n   - For JSON: { type: "JSON", options: { data: [...] } }\n\nExample component structure:\n\`\`\`json\n{\n  "components": [\n    { "type": "KPI", "renderTo": "kpi-1", "value": 1234, "title": "Total", "subtitle": "This month" },\n    { "type": "Highcharts", "renderTo": "chart-1", "chartOptions": { "series": [...] } },\n    { "type": "DataGrid", "renderTo": "grid-1", "dataGridOptions": { "columns": [...] } }\n  ]\n}\n\`\`\`\n\nGenerate realistic sample data relevant to "${topic}" and call render_dashboard.`,
        },
      }],
    }),
  );

  server.prompt(
    "stock_analysis",
    "Analyze a stock with technical indicators",
    { ticker: z.string().describe("Stock ticker symbol (e.g. AAPL, MSFT)") },
    async ({ ticker }) => ({
      messages: [{
        role: "assistant",
        content: {
          type: "text",
          text: `Create a technical analysis chart for ${ticker.toUpperCase()} using render_stock_chart.\n\nInclude:\n1. **Main series:** Candlestick (OHLC) data as the primary series\n2. **Volume:** Column series on a secondary yAxis (bottom pane, ~20% height)\n3. **Technical indicators** (add as separate series with linkedTo):\n   - SMA (20-day and 50-day moving averages)\n   - Bollinger Bands (or MACD in a separate pane)\n4. **Range selector:** Buttons for 1m, 3m, 6m, YTD, 1y, All\n5. **Navigator:** Enabled with area overview\n6. **Tooltip:** Shared crosshair showing OHLC + volume + indicator values\n\nFetch or generate realistic OHLC data for ${ticker.toUpperCase()}. Format each data point as [timestamp, open, high, low, close] and volume as [timestamp, volume].\n\nUse yAxis array with multiple panes:\n- yAxis[0]: Price (75% height)\n- yAxis[1]: Volume (25% height)\n\nSet chart.height to at least 600 for readability.`,
        },
      }],
    }),
  );

  server.prompt(
    "comparison_chart",
    "Compare multiple datasets side by side",
    { datasets: z.string().describe("Description of what to compare (e.g. 'Q1 vs Q2 revenue by region')") },
    async ({ datasets }) => ({
      messages: [{
        role: "assistant",
        content: {
          type: "text",
          text: `Create a comparison chart for: "${datasets}"\n\nChoose the best comparison pattern:\n\n**Grouped/Clustered columns** — Best for discrete categories:\n- Multiple series with the same xAxis categories\n- plotOptions.column.grouping: true (default)\n\n**Stacked columns/bars** — Best for part-to-whole + total comparison:\n- plotOptions.column.stacking: 'normal' or 'percent'\n\n**Multi-series line/spline** — Best for trends over time:\n- Each dataset as a separate series\n- Different colors, shared tooltip\n\n**Dual Y-axes** — When comparing different units:\n- yAxis array with two axes (opposite: true for right axis)\n- Each series linked to its yAxis index\n\n**Mirror/Butterfly chart** — For demographic or opposing comparisons:\n- Negative values for one side\n\nUse render_chart with:\n- Clear, descriptive title\n- Legend identifying each dataset\n- Shared tooltip with proper formatting\n- Contrasting colors for easy distinction\n- Axis labels with units\n\nGenerate realistic sample data for "${datasets}" and render the chart.`,
        },
      }],
    }),
  );

  server.prompt(
    "project_timeline",
    "Create a Gantt chart for project planning",
    { project: z.string().describe("Project description (e.g. 'website redesign', 'product launch')") },
    async ({ project }) => ({
      messages: [{
        role: "assistant",
        content: {
          type: "text",
          text: `Create a Gantt chart for: "${project}" using render_gantt.\n\nStructure the project with:\n\n1. **Phases** (parent tasks): Group related tasks under phase headers\n   - e.g., Planning, Design, Development, Testing, Launch\n\n2. **Tasks** with realistic durations:\n   - Each task: { name, start (timestamp ms), end (timestamp ms), id, parent (phase id) }\n   - Use Date.UTC(year, month-1, day) for timestamps\n\n3. **Dependencies:** Link tasks with dependency field\n   - e.g., dependency: "task-1" (finish-to-start)\n\n4. **Milestones:** Key decision points\n   - milestone: true, start === end\n\n5. **Progress:** completed: { amount: 0.0-1.0 } for in-progress tasks\n\nGantt options:\n- title: descriptive project name\n- xAxis: datetime with proper date labels\n- yAxis: categories auto-generated from task names\n- navigator: enabled for long timelines\n- tooltip: show task name, dates, duration, progress\n\nGenerate 12-20 realistic tasks across 3-5 phases for "${project}", with logical dependencies and a timeline spanning weeks or months.`,
        },
      }],
    }),
  );

  server.prompt(
    "live_chart",
    "Create a live-updating chart that polls a data URL",
    {
      dataUrl: z.string().describe("URL returning CSV or JSON row/column data"),
      refreshRate: z.string().optional().describe("Refresh interval in seconds. Default: 2"),
    },
    async ({ dataUrl, refreshRate }) => ({
      messages: [{
        role: "assistant",
        content: {
          type: "text",
          text: `Create a live-updating chart using Highcharts' native data polling.\n\n` +
            `Use render_chart (or render_stock_chart for time-series) with:\n\n` +
            `\`\`\`json\n{\n  "data": {\n    "csvURL": "${dataUrl}",\n    "enablePolling": true,\n    "dataRefreshRate": ${refreshRate ?? "2"}\n  }\n}\n\`\`\`\n\n` +
            `Highcharts handles polling, diffing, and animation automatically.\n` +
            `For JSON data, use "columnsURL" or "rowsURL" instead of "csvURL".`,
        },
      }],
    }),
  );

  return server;
}
