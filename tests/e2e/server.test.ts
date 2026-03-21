import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const TOOL_NAME = "render-chart";
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

  it("lists render-chart tool", async () => {
    const { tools } = await client.listTools();
    const renderChart = tools.find((t) => t.name === TOOL_NAME);
    expect(renderChart).toBeDefined();
    expect(renderChart!.description).toContain("Highcharts");
  });

  it("render-chart has the expected input properties", async () => {
    const { tools } = await client.listTools();
    const schema = tools.find((t) => t.name === TOOL_NAME)!.inputSchema;
    const props = Object.keys(schema.properties ?? {});
    expect(props).toContain("chartType");
    expect(props).toContain("title");
    expect(props).toContain("series");
    expect(props).toContain("highchartsOptions");
  });

  // ── Tool invocation ──

  it("renders a basic bar chart", async () => {
    const result = await client.callTool({
      name: TOOL_NAME,
      arguments: {
        chartType: "bar",
        title: "Revenue by Quarter",
        series: [{ name: "Revenue", data: [100, 200, 300, 400] }],
        xAxisCategories: ["Q1", "Q2", "Q3", "Q4"],
      },
    });

    expect(result.content).toHaveLength(1);
    const text = (result.content as { type: string; text: string }[])[0].text;
    const parsed = JSON.parse(text);
    expect(parsed.chartType).toBe("bar");
    expect(parsed.title).toBe("Revenue by Quarter");
    expect(parsed.series).toHaveLength(1);
    expect(parsed.series[0].data).toEqual([100, 200, 300, 400]);
  });

  it("renders a pie chart with named points", async () => {
    const result = await client.callTool({
      name: TOOL_NAME,
      arguments: {
        chartType: "pie",
        title: "Market Share",
        series: [
          {
            name: "Share",
            data: [
              { name: "Chrome", y: 65 },
              { name: "Firefox", y: 20 },
              { name: "Safari", y: 15 },
            ],
          },
        ],
      },
    });

    const parsed = JSON.parse(
      (result.content as { type: string; text: string }[])[0].text,
    );
    expect(parsed.chartType).toBe("pie");
    expect(parsed.series[0].data).toHaveLength(3);
  });

  it("passes through optional formatting options", async () => {
    const result = await client.callTool({
      name: TOOL_NAME,
      arguments: {
        chartType: "column",
        title: "Sales",
        series: [{ name: "Units", data: [10, 20, 30] }],
        stacking: "normal",
        height: "large",
        tooltipValueSuffix: " units",
        tooltipValuePrefix: "~",
        yAxisTitle: "Units Sold",
        yAxisFormat: "{value}K",
      },
    });

    const parsed = JSON.parse(
      (result.content as { type: string; text: string }[])[0].text,
    );
    expect(parsed.stacking).toBe("normal");
    expect(parsed.height).toBe("large");
    expect(parsed.tooltipValueSuffix).toBe(" units");
    expect(parsed.tooltipValuePrefix).toBe("~");
    expect(parsed.yAxisTitle).toBe("Units Sold");
    expect(parsed.yAxisFormat).toBe("{value}K");
  });

  it("accepts highchartsOptions escape hatch", async () => {
    const result = await client.callTool({
      name: TOOL_NAME,
      arguments: {
        chartType: "line",
        title: "Custom",
        series: [{ name: "A", data: [1, 2, 3] }],
        highchartsOptions: {
          plotOptions: { line: { dashStyle: "Dash" } },
        },
      },
    });

    const parsed = JSON.parse(
      (result.content as { type: string; text: string }[])[0].text,
    );
    expect(parsed.highchartsOptions.plotOptions.line.dashStyle).toBe("Dash");
  });

  it("renders mixed chart types via per-series type", async () => {
    const result = await client.callTool({
      name: TOOL_NAME,
      arguments: {
        chartType: "column",
        title: "Mixed",
        series: [
          { name: "Bars", data: [1, 2, 3], type: "column" },
          { name: "Line", data: [3, 2, 1], type: "spline" },
        ],
      },
    });

    const parsed = JSON.parse(
      (result.content as { type: string; text: string }[])[0].text,
    );
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
});
