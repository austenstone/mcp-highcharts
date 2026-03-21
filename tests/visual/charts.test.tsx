import Highcharts from "highcharts";
import "highcharts/highcharts-more";
import "highcharts/modules/heatmap";
import "highcharts/modules/sankey";
import "highcharts/modules/funnel";
import "highcharts/modules/treemap";
import "highcharts/modules/sunburst";
import "highcharts/modules/solid-gauge";
import "highcharts/modules/networkgraph";
import HighchartsReact from "highcharts-react-official";
import { createRoot } from "react-dom/client";
import { describe, it, expect, afterEach } from "vitest";
import { buildChartOptions, type ChartToolParams } from "../../src/chart-options";
import { getTheme } from "../../src/theme";

Highcharts.setOptions(getTheme());
Highcharts.setOptions({ lang: { decimalPoint: ".", thousandsSep: "," } });

function renderChart(params: ChartToolParams): Promise<HTMLElement> {
  return new Promise((resolve) => {
    const container = document.createElement("div");
    container.style.cssText = "width:100%;max-width:800px;height:400px;background:#0d1117;padding:16px;box-sizing:border-box;";
    document.body.appendChild(container);

    const options = buildChartOptions(params);
    createRoot(container).render(
      <HighchartsReact
        highcharts={Highcharts}
        options={options}
        callback={() => setTimeout(() => resolve(container), 200)}
      />,
    );
  });
}

afterEach(() => {
  document.querySelectorAll("[data-test-chart]").forEach((el) => el.remove());
});

describe("Visual Chart Rendering", () => {
  it("bar chart", async () => {
    const el = await renderChart({
      chartType: "bar",
      title: "Revenue by Quarter",
      series: [{ name: "Revenue", data: [120, 250, 310, 480] }],
      xAxisCategories: ["Q1", "Q2", "Q3", "Q4"],
      yAxisTitle: "USD (thousands)",
      tooltipValuePrefix: "$",
      tooltipValueSuffix: "K",
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("pie chart", async () => {
    const el = await renderChart({
      chartType: "pie",
      title: "CI/CD Market Share",
      series: [
        {
          name: "Share",
          data: [
            { name: "GitHub Actions", y: 45 },
            { name: "Jenkins", y: 25 },
            { name: "GitLab CI", y: 15 },
            { name: "CircleCI", y: 10 },
            { name: "Other", y: 5 },
          ],
        },
      ],
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("line chart (multi-series)", async () => {
    const el = await renderChart({
      chartType: "line",
      title: "GHR vs SHR Adoption",
      subtitle: "Monthly active runners (thousands)",
      series: [
        { name: "GitHub-Hosted", data: [50, 65, 80, 110, 145, 190] },
        { name: "Self-Hosted", data: [120, 115, 108, 100, 90, 82] },
      ],
      xAxisCategories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
      yAxisTitle: "Runners",
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("stacked column chart", async () => {
    const el = await renderChart({
      chartType: "column",
      title: "Actions Minutes by Runner Type",
      series: [
        { name: "Linux", data: [400, 450, 500, 550] },
        { name: "Windows", data: [100, 120, 130, 140] },
        { name: "macOS", data: [50, 60, 70, 80] },
      ],
      xAxisCategories: ["Q1", "Q2", "Q3", "Q4"],
      stacking: "normal",
      yAxisTitle: "Minutes (millions)",
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("area chart", async () => {
    const el = await renderChart({
      chartType: "area",
      title: "Build Time Trend",
      series: [{ name: "Avg Build Time", data: [12, 10, 8, 7, 6, 5.5, 5] }],
      xAxisCategories: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      yAxisTitle: "Minutes",
      height: "medium",
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("scatter chart", async () => {
    const el = await renderChart({
      chartType: "scatter",
      title: "Build Time vs Repo Size",
      series: [
        {
          name: "Repos",
          data: [
            { x: 10, y: 2 }, { x: 25, y: 4 }, { x: 50, y: 6 },
            { x: 80, y: 8 }, { x: 120, y: 12 }, { x: 200, y: 15 },
            { x: 15, y: 3 }, { x: 60, y: 7 }, { x: 90, y: 9 }, { x: 150, y: 11 },
          ],
        },
      ],
      xAxisTitle: "Repo Size (MB)",
      yAxisTitle: "Build Time (min)",
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("gauge chart", async () => {
    const el = await renderChart({
      chartType: "solidgauge",
      title: "SLA Uptime",
      series: [{ name: "Uptime", data: [99.95] }],
      highchartsOptions: {
        pane: {
          startAngle: -90,
          endAngle: 90,
          background: [{ backgroundColor: "#1f2937", innerRadius: "60%", outerRadius: "100%", shape: "arc" }],
        },
        yAxis: { min: 99, max: 100, stops: [[0.9, "#30a147"], [0.95, "#b88700"], [1, "#df0c24"]] },
      },
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("mixed column + spline", async () => {
    const el = await renderChart({
      chartType: "column",
      title: "TCO Comparison",
      series: [
        { name: "Infrastructure", data: [800, 400, 350], type: "column" },
        { name: "Labor", data: [500, 200, 100], type: "column" },
        { name: "Total", data: [1300, 600, 450], type: "spline" },
      ],
      xAxisCategories: ["Jenkins", "GitLab CI", "GitHub Actions"],
      stacking: "normal",
      yAxisTitle: "Annual Cost ($K)",
      tooltipValuePrefix: "$",
      tooltipValueSuffix: "K",
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("spline chart", async () => {
    const el = await renderChart({
      chartType: "spline",
      title: "Deploy Frequency",
      series: [{ name: "Deploys/day", data: [4, 6, 8, 12, 15, 20, 18] }],
      xAxisCategories: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      yAxisTitle: "Deploys",
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("areaspline chart", async () => {
    const el = await renderChart({
      chartType: "areaspline",
      title: "Cache Hit Rate",
      series: [
        { name: "Hit Rate", data: [72, 78, 85, 88, 91, 93, 95] },
      ],
      xAxisCategories: ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6", "Week 7"],
      yAxisTitle: "Hit Rate (%)",
      tooltipValueSuffix: "%",
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("heatmap chart", async () => {
    const el = await renderChart({
      chartType: "heatmap",
      title: "Workflow Run Heatmap",
      series: [{
        name: "Runs",
        data: [
          [0, 0, 10], [0, 1, 19], [0, 2, 8], [0, 3, 24], [0, 4, 67],
          [1, 0, 92], [1, 1, 58], [1, 2, 78], [1, 3, 117], [1, 4, 48],
          [2, 0, 35], [2, 1, 15], [2, 2, 123], [2, 3, 64], [2, 4, 52],
        ],
      }],
      xAxisCategories: ["Mon", "Tue", "Wed"],
      highchartsOptions: {
        chart: { type: "heatmap" },
        yAxis: { categories: ["6am", "9am", "12pm", "3pm", "6pm"], title: { text: "" } },
        colorAxis: { min: 0, minColor: "#30363d", maxColor: "#006edb" },
        plotOptions: {
          heatmap: {
            borderWidth: 2,
            borderColor: "#0d1117",
            dataLabels: { enabled: true, color: "#e5e7eb", style: { fontSize: "11px", textOutline: "none" } },
          },
        },
        legend: { enabled: true },
      },
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("treemap chart", async () => {
    const el = await renderChart({
      chartType: "treemap",
      title: "Repo Size by Language",
      series: [{
        name: "Languages",
        data: [
          { name: "TypeScript", value: 45, color: "#3178c6" },
          { name: "Python", value: 25, color: "#3572A5" },
          { name: "Go", value: 15, color: "#00ADD8" },
          { name: "Rust", value: 10, color: "#dea584" },
          { name: "Java", value: 5, color: "#b07219" },
        ],
      }],
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("sunburst chart", async () => {
    const el = await renderChart({
      chartType: "sunburst",
      title: "Runner Usage Breakdown",
      series: [{
        name: "Usage",
        data: [
          { id: "root", name: "All Runners" },
          { id: "ghr", parent: "root", name: "GitHub-Hosted", value: 70 },
          { id: "shr", parent: "root", name: "Self-Hosted", value: 30 },
          { parent: "ghr", name: "Linux", value: 50 },
          { parent: "ghr", name: "Windows", value: 15 },
          { parent: "ghr", name: "macOS", value: 5 },
          { parent: "shr", name: "ARC", value: 20 },
          { parent: "shr", name: "Bare Metal", value: 10 },
        ],
      }],
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("sankey chart", async () => {
    const el = await renderChart({
      chartType: "sankey",
      title: "CI Pipeline Flow",
      series: [{
        name: "Flow",
        data: [
          { from: "Push", to: "Build", weight: 100 },
          { from: "Push", to: "Lint", weight: 100 },
          { from: "Build", to: "Test", weight: 90 },
          { from: "Build", to: "Failed", weight: 10 },
          { from: "Test", to: "Deploy", weight: 80 },
          { from: "Test", to: "Failed", weight: 10 },
          { from: "Lint", to: "Build", weight: 100 },
        ],
      }],
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("funnel chart", async () => {
    const el = await renderChart({
      chartType: "funnel",
      title: "Actions Adoption Funnel",
      series: [{
        name: "Conversions",
        data: [
          { name: "Awareness", y: 1000 },
          { name: "Trial", y: 600 },
          { name: "POC", y: 300 },
          { name: "Procurement", y: 150 },
          { name: "Closed Won", y: 80 },
        ],
      }],
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("networkgraph chart", async () => {
    const el = await renderChart({
      chartType: "networkgraph",
      title: "Service Dependencies",
      series: [{
        name: "Dependencies",
        data: [
          { from: "API Gateway", to: "Auth Service" },
          { from: "API Gateway", to: "User Service" },
          { from: "API Gateway", to: "Actions Service" },
          { from: "Actions Service", to: "Runner Pool" },
          { from: "Actions Service", to: "Cache Service" },
          { from: "User Service", to: "Auth Service" },
          { from: "Runner Pool", to: "VNET" },
        ],
      }],
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("gauge chart", async () => {
    const el = await renderChart({
      chartType: "gauge",
      title: "CPU Usage",
      series: [{ name: "CPU", data: [72] }],
      highchartsOptions: {
        pane: {
          startAngle: -150,
          endAngle: 150,
          background: [{ backgroundColor: "#1f2937", innerRadius: "60%", outerRadius: "100%", shape: "arc" }],
        },
        yAxis: { min: 0, max: 100, title: { text: "%" } },
      },
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });
});

describe("Chart Features", () => {
  it("height presets (small vs xl)", async () => {
    const small = await renderChart({
      chartType: "line",
      title: "Small (128px)",
      series: [{ name: "A", data: [1, 3, 2, 5] }],
      height: "small",
    });
    const xl = await renderChart({
      chartType: "line",
      title: "XL (432px)",
      series: [{ name: "A", data: [1, 3, 2, 5] }],
      height: "xl",
    });
    const smallH = small.querySelector(".highcharts-container")?.clientHeight ?? 0;
    const xlH = xl.querySelector(".highcharts-container")?.clientHeight ?? 0;
    expect(smallH).toBeLessThan(200);
    expect(xlH).toBeGreaterThan(400);
  });

  it("percentage stacking", async () => {
    const el = await renderChart({
      chartType: "column",
      title: "100% Stacked",
      series: [
        { name: "GHR", data: [70, 75, 80] },
        { name: "SHR", data: [30, 25, 20] },
      ],
      xAxisCategories: ["2024", "2025", "2026"],
      stacking: "percent",
      yAxisFormat: "{value}%",
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("subtitle renders", async () => {
    const el = await renderChart({
      chartType: "column",
      title: "Enterprise Deals",
      subtitle: "FY2026 Q1 — Q4 Pipeline",
      series: [{ name: "ARR", data: [1.5, 2.1, 3.0, 4.2] }],
      xAxisCategories: ["Q1", "Q2", "Q3", "Q4"],
    });
    const subtitle = el.querySelector(".highcharts-subtitle");
    expect(subtitle?.textContent).toContain("FY2026");
  });

  it("yAxis format (currency)", async () => {
    const el = await renderChart({
      chartType: "column",
      title: "Revenue",
      series: [{ name: "Revenue", data: [500, 800, 1200] }],
      xAxisCategories: ["SMB", "Mid-Market", "Enterprise"],
      yAxisFormat: "${value}K",
      yAxisTitle: "Annual Revenue",
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("per-series custom colors", async () => {
    const el = await renderChart({
      chartType: "column",
      title: "Custom Colors",
      series: [
        { name: "Success", data: [85], color: "#30a147" },
        { name: "Warning", data: [12], color: "#b88700" },
        { name: "Error", data: [3], color: "#df0c24" },
      ],
      xAxisCategories: ["Status"],
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("multi-line dash differentiation (5 series)", async () => {
    const el = await renderChart({
      chartType: "line",
      title: "5 Series Dash Styles",
      series: [
        { name: "Solid", data: [10, 20, 30, 40] },
        { name: "ShortDash", data: [15, 25, 35, 45] },
        { name: "Dot", data: [20, 30, 40, 50] },
        { name: "DashDot", data: [25, 35, 45, 55] },
        { name: "LongDash", data: [30, 40, 50, 60] },
      ],
      xAxisCategories: ["Jan", "Feb", "Mar", "Apr"],
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("drilldown", async () => {
    const el = await renderChart({
      chartType: "column",
      title: "Runner Usage (click to drill)",
      series: [{
        name: "Runners",
        data: [
          { name: "GitHub-Hosted", y: 70, drilldown: "ghr" },
          { name: "Self-Hosted", y: 30, drilldown: "shr" },
        ],
      }],
      drilldown: {
        series: [
          { id: "ghr", name: "GHR Breakdown", data: [["Linux", 50], ["Windows", 15], ["macOS", 5]] },
          { id: "shr", name: "SHR Breakdown", data: [["ARC", 20], ["Bare Metal", 10]] },
        ],
      },
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("highchartsOptions escape hatch (custom legend + annotations)", async () => {
    const el = await renderChart({
      chartType: "line",
      title: "Custom Legend Position",
      series: [{ name: "Metric", data: [5, 10, 15, 20, 25] }],
      xAxisCategories: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      highchartsOptions: {
        legend: {
          align: "right",
          verticalAlign: "middle",
          layout: "vertical",
        },
        plotOptions: {
          line: { lineWidth: 4 },
        },
      },
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("default chart type (no chartType = line)", async () => {
    const el = await renderChart({
      title: "Default Type",
      series: [{ name: "Values", data: [3, 7, 2, 9, 4] }],
    });
    // Should render as line chart by default
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
    expect(el.querySelector(".highcharts-line-series")).toBeTruthy();
  });

  it("sparkline (minimal height, no chrome)", async () => {
    const el = await renderChart({
      chartType: "areaspline",
      title: "",
      series: [{ name: "Trend", data: [3, 5, 4, 7, 6, 9, 8, 11] }],
      height: "sparkline",
      highchartsOptions: {
        legend: { enabled: false },
        xAxis: { visible: false },
        yAxis: { visible: false },
        chart: { spacing: [0, 0, 0, 0] },
      },
    });
    const h = el.querySelector(".highcharts-container")?.clientHeight ?? 0;
    expect(h).toBeLessThanOrEqual(128);
  });

  it("tooltip prefix and suffix", async () => {
    const el = await renderChart({
      chartType: "bar",
      title: "Tooltip Formatting",
      series: [{ name: "Cost", data: [450, 280, 180] }],
      xAxisCategories: ["Jenkins", "GitLab", "Actions"],
      tooltipValuePrefix: "$",
      tooltipValueSuffix: "K/yr",
      yAxisTitle: "Annual Cost",
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("x and y axis titles", async () => {
    const el = await renderChart({
      chartType: "scatter",
      title: "Axis Titles",
      series: [{ name: "Data", data: [{ x: 1, y: 2 }, { x: 3, y: 4 }] }],
      xAxisTitle: "Concurrency Level",
      yAxisTitle: "Throughput (req/s)",
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
    // Verify axis titles exist in the SVG
    const svg = el.querySelector(".highcharts-root")!;
    expect(svg.innerHTML).toContain("Concurrency");
  });
});
