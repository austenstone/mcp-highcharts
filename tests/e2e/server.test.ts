import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const TOOL_NAME = "render_chart";
const RESOURCE_URI = "ui://highcharts/mcp-app.html";

describe("MCP Highcharts Server (stdio e2e)", () => {
  let client: Client;
  let transport: StdioClientTransport;

  beforeAll(async () => {
    transport = new StdioClientTransport({
      command: "tsx",
      args: ["main.ts", "--stdio"],
    });
    client = new Client({ name: "e2e-test-client", version: "1.0.0" });
    await client.connect(transport);
  }, 15_000);

  afterAll(async () => {
    await client.close();
  });

  // ── Tool discovery ──

  it("lists render_chart tool", async () => {
    const { tools } = await client.listTools();
    const renderChart = tools.find((t) => t.name === TOOL_NAME);
    expect(renderChart).toBeDefined();
    expect(renderChart!.description).toContain("Highcharts");
  });

  it("render_chart has the expected input properties", async () => {
    const { tools } = await client.listTools();
    const schema = tools.find((t) => t.name === TOOL_NAME)!.inputSchema;
    const props = Object.keys(schema.properties ?? {});
    expect(props).toContain("chart");
    expect(props).toContain("title");
    expect(props).toContain("series");
    expect(props).toContain("plotOptions");
  });

  // ── Tool invocation ──

  it("renders a basic bar chart", async () => {
    const result = await client.callTool({
      name: TOOL_NAME,
      arguments: {
        chart: { type: "bar" },
        title: "Revenue by Quarter",
        series: [{ name: "Revenue", data: [100, 200, 300, 400] }],
        xAxis: { categories: ["Q1", "Q2", "Q3", "Q4"] },
      },
    });

    expect(result.content).toHaveLength(1);
    const parsed = (result as any).structuredContent;
    expect(parsed.chart.type).toBe("bar");
    expect(parsed.title).toBe("Revenue by Quarter");
    expect(parsed.series).toHaveLength(1);
    expect(parsed.series[0].data).toEqual([100, 200, 300, 400]);
  });

  it("renders a pie chart with named points", async () => {
    const result = await client.callTool({
      name: TOOL_NAME,
      arguments: {
        chart: { type: "pie" },
        title: "Market Share",
        series: [{
          name: "Share",
          data: [
            { name: "Chrome", y: 65 },
            { name: "Firefox", y: 20 },
            { name: "Safari", y: 15 },
          ],
        }],
      },
    });

    const parsed = (result as any).structuredContent;
    expect(parsed.chart.type).toBe("pie");
    expect(parsed.series[0].data).toHaveLength(3);
  });

  it("passes through Highcharts options directly", async () => {
    const result = await client.callTool({
      name: TOOL_NAME,
      arguments: {
        chart: { type: "column" },
        title: "Sales",
        series: [{ name: "Units", data: [10, 20, 30] }],
        plotOptions: { series: { stacking: "normal" } },
        tooltip: { valueSuffix: " units", valuePrefix: "~" },
        yAxis: { title: { text: "Units Sold" }, labels: { format: "{value}K" } },
      },
    });

    const parsed = (result as any).structuredContent;
    expect(parsed.plotOptions.series.stacking).toBe("normal");
    expect(parsed.tooltip.valueSuffix).toBe(" units");
    expect(parsed.yAxis.title.text).toBe("Units Sold");
  });

  it("accepts plotOptions directly", async () => {
    const result = await client.callTool({
      name: TOOL_NAME,
      arguments: {
        chart: { type: "line" },
        title: "Custom",
        series: [{ name: "A", data: [1, 2, 3] }],
        plotOptions: { line: { dashStyle: "Dash" } },
      },
    });

    const parsed = (result as any).structuredContent;
    expect(parsed.plotOptions.line.dashStyle).toBe("Dash");
  });

  it("renders mixed chart types via per-series type", async () => {
    const result = await client.callTool({
      name: TOOL_NAME,
      arguments: {
        chart: { type: "column" },
        title: "Mixed",
        series: [
          { name: "Bars", data: [1, 2, 3], type: "column" },
          { name: "Line", data: [3, 2, 1], type: "spline" },
        ],
      },
    });

    const parsed = (result as any).structuredContent;
    expect(parsed.series[0].type).toBe("column");
    expect(parsed.series[1].type).toBe("spline");
  });

  // ── Resource reading ──

  it("serves the UI resource as HTML", async () => {
    const result = await client.readResource({ uri: RESOURCE_URI });
    expect(result.contents).toHaveLength(1);
    const content = result.contents[0];
    expect(content.uri).toBe(RESOURCE_URI);
    expect(content.mimeType).toBe("text/html;profile=mcp-app");
    expect(typeof content.text).toBe("string");
    expect((content.text as string).length).toBeGreaterThan(100);
    expect(content.text).toContain("<!DOCTYPE html>");
  });

  // ── render_stock_chart (Highcharts Stock) ──

  it("lists render_stock_chart tool", async () => {
    const { tools } = await client.listTools();
    const renderStock = tools.find((t) => t.name === "render_stock_chart");
    expect(renderStock).toBeDefined();
    expect(renderStock!.description).toContain("Stock");
  });

  it("renders a stock chart with candlestick data", async () => {
    const result = await client.callTool({
      name: "render_stock_chart",
      arguments: {
        chart: { type: "candlestick" },
        title: { text: "Stock Price" },
        series: [{
          type: "candlestick",
          name: "AAPL",
          data: [
            [1617235200000, 100, 110, 95, 105],
            [1617321600000, 105, 115, 100, 112],
            [1617408000000, 112, 120, 108, 118],
          ]
        }],
        rangeSelector: { selected: 1 },
      },
    });

    expect(result.isError).toBeFalsy();
    const parsed = (result as any).structuredContent;
    expect(parsed.__chartType).toBe("stock");
    expect(parsed.series[0].type).toBe("candlestick");
    expect(parsed.rangeSelector.selected).toBe(1);
  });

  it("rejects render_stock_chart without series", async () => {
    const result = await client.callTool({
      name: "render_stock_chart",
      arguments: {
        title: "No Series Stock",
        rangeSelector: { selected: 0 },
      },
    });
    expect(result.isError).toBe(true);
  });

  // ── render_dashboard (dashboards) ──

  it("lists render_dashboard tool", async () => {
    const { tools } = await client.listTools();
    const renderDashboard = tools.find((t) => t.name === "render_dashboard");
    expect(renderDashboard).toBeDefined();
    expect(renderDashboard!.description).toContain("Dashboard");
  });

  it("renders a dashboard with multiple components", async () => {
    const result = await client.callTool({
      name: "render_dashboard",
      arguments: {
        gui: {
          layouts: [{
            rows: [{
              cells: [{ id: 'chart-1' }, { id: 'chart-2' }]
            }]
          }]
        },
        components: [
          {
            type: 'Highcharts',
            renderTo: 'chart-1',
            chartOptions: {
              series: [{ type: 'line', data: [1, 2, 3] }]
            }
          },
          {
            type: 'Highcharts',
            renderTo: 'chart-2',
            chartOptions: {
              series: [{ type: 'column', data: [4, 5, 6] }]
            }
          }
        ]
      },
    });

    const parsed = (result as any).structuredContent;
    expect(parsed.components).toHaveLength(2);
    expect(parsed.gui.layouts).toHaveLength(1);
  });

  it("rejects render_dashboard without components array", async () => {
    const result = await client.callTool({
      name: "render_dashboard",
      arguments: { gui: { layouts: [] } },
    });
    expect(result.isError).toBe(true);
  });

  // ── render_map (maps) ──

  it("lists render_map tool", async () => {
    const { tools } = await client.listTools();
    const renderMap = tools.find((t) => t.name === "render_map");
    expect(renderMap).toBeDefined();
    expect(renderMap!.description).toContain("Map");
  });

  it("renders a basic map chart", async () => {
    const result = await client.callTool({
      name: "render_map",
      arguments: {
        title: "Simple Map",
        series: [{
          type: "map",
          data: [
            { "hc-key": "us-ca", value: 1 },
            { "hc-key": "us-tx", value: 2 },
          ],
          mapData: { type: "FeatureCollection", features: [] },
        }],
        colorAxis: { min: 0, minColor: "#FFFFFF", maxColor: "#006edb" },
      },
    });
    expect(result.isError).toBeFalsy();
    const parsed = (result as any).structuredContent;
    expect(parsed.__chartType).toBe("map");
    expect(parsed.series).toHaveLength(1);
  });

  it("rejects render_map without series", async () => {
    const result = await client.callTool({
      name: "render_map",
      arguments: { title: "No Series" },
    });
    expect(result.isError).toBe(true);
  });

  // ── render_gantt (Gantt charts) ──

  it("lists render_gantt tool", async () => {
    const { tools } = await client.listTools();
    const renderGantt = tools.find((t) => t.name === "render_gantt");
    expect(renderGantt).toBeDefined();
    expect(renderGantt!.description).toContain("Gantt");
  });

  it("renders a project timeline gantt chart", async () => {
    const result = await client.callTool({
      name: "render_gantt",
      arguments: {
        title: { text: "Project Plan" },
        series: [{
          data: [{
            name: "Design",
            start: Date.UTC(2026, 0, 1),
            end: Date.UTC(2026, 0, 15),
          }, {
            name: "Development",
            start: Date.UTC(2026, 0, 16),
            end: Date.UTC(2026, 1, 28),
            dependency: "Design"
          }]
        }]
      },
    });

    expect(result.content).toHaveLength(1);
    const parsed = (result as any).structuredContent;
    expect(parsed.__chartType).toBe("gantt");
    expect(parsed.series).toHaveLength(1);
    expect(parsed.series[0].data).toHaveLength(2);
  });

  it("rejects render_gantt without series", async () => {
    const result = await client.callTool({
      name: "render_gantt",
      arguments: { title: "No Series" },
    });
    expect(result.isError).toBe(true);
  });

  // ── render_grid (data table) ──

  it("lists render_grid tool", async () => {
    const { tools } = await client.listTools();
    const renderGrid = tools.find((t) => t.name === "render_grid");
    expect(renderGrid).toBeDefined();
    expect(renderGrid!.description).toContain("Grid");
  });

  it("renders a data grid with column-oriented data", async () => {
    const result = await client.callTool({
      name: "render_grid",
      arguments: {
        columns: [
          { id: "name", header: { text: "Name" } },
          { id: "value", header: { text: "Value" } },
        ],
        data: {
          columns: {
            name: ["Alpha", "Beta", "Gamma"],
            value: [100, 200, 300],
          },
        },
      },
    });
    expect(result.isError).toBeFalsy();
    const parsed = (result as any).structuredContent;
    expect(parsed.__chartType).toBe("grid");
    expect(parsed.data.columns.name).toHaveLength(3);
  });

  it("renders a data grid from rows (convenience format)", async () => {
    const result = await client.callTool({
      name: "render_grid",
      arguments: {
        rows: [
          { name: "Alpha", value: 100 },
          { name: "Beta", value: 200 },
        ],
      },
    });
    expect(result.isError).toBeFalsy();
    const parsed = (result as any).structuredContent;
    expect(parsed.__chartType).toBe("grid");
    // rows should be converted to data.columns
    expect(parsed.data.columns.name).toEqual(["Alpha", "Beta"]);
    expect(parsed.data.columns.value).toEqual([100, 200]);
    expect(parsed.rows).toBeUndefined();
  });

  it("rejects render_grid without data", async () => {
    const result = await client.callTool({
      name: "render_grid",
      arguments: { columns: [{ id: "x" }] },
    });
    expect(result.isError).toBe(true);
  });

  // ── Validation ──

  it("rejects render_chart without series", async () => {
    const result = await client.callTool({
      name: TOOL_NAME,
      arguments: {
        chart: { type: "line" },
        title: "No Series",
      },
    });
    expect(result.isError).toBe(true);
  });
});
