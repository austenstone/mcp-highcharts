import Highcharts from "highcharts";
import type { Options } from "highcharts";
import "virtual:highcharts-modules";
import HighchartsReact from "highcharts-react-official";
import { createRoot } from "react-dom/client";
import { describe, it, expect, afterEach, beforeEach } from "vitest";

function buildChartOptions(params: Record<string, unknown>): Options {
  const opts = { ...params } as Options & Record<string, unknown>;
  if (typeof opts.title === "string") opts.title = { text: opts.title };
  if (typeof opts.subtitle === "string") opts.subtitle = { text: opts.subtitle };
  return opts as Options;
}

Highcharts.setOptions({
  credits: { enabled: false },
  exporting: { enabled: false },
});

function renderChart(params: Record<string, unknown>): Promise<HTMLElement> {
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
      chart: { type: "bar" },
      title: "Revenue by Quarter",
      series: [{ name: "Revenue", data: [120, 250, 310, 480] }],
      xAxis: { categories: ["Q1", "Q2", "Q3", "Q4"] },
      yAxis: { title: { text: "USD (thousands)" } },
      tooltip: { valuePrefix: "$", valueSuffix: "K" },
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("pie chart", async () => {
    const el = await renderChart({
      chart: { type: "pie" },
      title: "CI/CD Market Share",
      series: [{
        name: "Share",
        data: [
          { name: "GitHub Actions", y: 45 },
          { name: "Jenkins", y: 25 },
          { name: "GitLab CI", y: 15 },
          { name: "CircleCI", y: 10 },
          { name: "Other", y: 5 },
        ],
      }],
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("line chart (multi-series)", async () => {
    const el = await renderChart({
      chart: { type: "line" },
      title: "GHR vs SHR Adoption",
      subtitle: "Monthly active runners (thousands)",
      series: [
        { name: "GitHub-Hosted", data: [50, 65, 80, 110, 145, 190] },
        { name: "Self-Hosted", data: [120, 115, 108, 100, 90, 82] },
      ],
      xAxis: { categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"] },
      yAxis: { title: { text: "Runners" } },
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("stacked column chart", async () => {
    const el = await renderChart({
      chart: { type: "column" },
      title: "Actions Minutes by Runner Type",
      series: [
        { name: "Linux", data: [400, 450, 500, 550] },
        { name: "Windows", data: [100, 120, 130, 140] },
        { name: "macOS", data: [50, 60, 70, 80] },
      ],
      xAxis: { categories: ["Q1", "Q2", "Q3", "Q4"] },
      yAxis: { title: { text: "Minutes (millions)" } },
      plotOptions: { series: { stacking: "normal" } },
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("area chart", async () => {
    const el = await renderChart({
      chart: { type: "area", height: 256 },
      title: "Build Time Trend",
      series: [{ name: "Avg Build Time", data: [12, 10, 8, 7, 6, 5.5, 5] }],
      xAxis: { categories: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] },
      yAxis: { title: { text: "Minutes" } },
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("scatter chart", async () => {
    const el = await renderChart({
      chart: { type: "scatter" },
      title: "Build Time vs Repo Size",
      series: [{
        name: "Repos",
        data: [
          { x: 10, y: 2 }, { x: 25, y: 4 }, { x: 50, y: 6 },
          { x: 80, y: 8 }, { x: 120, y: 12 }, { x: 200, y: 15 },
          { x: 15, y: 3 }, { x: 60, y: 7 }, { x: 90, y: 9 }, { x: 150, y: 11 },
        ],
      }],
      xAxis: { title: { text: "Repo Size (MB)" } },
      yAxis: { title: { text: "Build Time (min)" } },
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("solidgauge chart", async () => {
    const el = await renderChart({
      chart: { type: "solidgauge" },
      title: "SLA Uptime",
      series: [{ name: "Uptime", data: [99.95] }],
      pane: {
        startAngle: -90, endAngle: 90,
        background: [{ backgroundColor: "#1f2937", innerRadius: "60%", outerRadius: "100%", shape: "arc" }],
      },
      yAxis: { min: 99, max: 100, stops: [[0.9, "#30a147"], [0.95, "#b88700"], [1, "#df0c24"]] },
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("mixed column + spline", async () => {
    const el = await renderChart({
      chart: { type: "column" },
      title: "TCO Comparison",
      series: [
        { name: "Infrastructure", data: [800, 400, 350], type: "column" },
        { name: "Labor", data: [500, 200, 100], type: "column" },
        { name: "Total", data: [1300, 600, 450], type: "spline" },
      ],
      xAxis: { categories: ["Jenkins", "GitLab CI", "GitHub Actions"] },
      yAxis: { title: { text: "Annual Cost ($K)" } },
      plotOptions: { series: { stacking: "normal" } },
      tooltip: { valuePrefix: "$", valueSuffix: "K" },
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("spline chart", async () => {
    const el = await renderChart({
      chart: { type: "spline" },
      title: "Deploy Frequency",
      series: [{ name: "Deploys/day", data: [4, 6, 8, 12, 15, 20, 18] }],
      xAxis: { categories: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] },
      yAxis: { title: { text: "Deploys" } },
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("areaspline chart", async () => {
    const el = await renderChart({
      chart: { type: "areaspline" },
      title: "Cache Hit Rate",
      series: [{ name: "Hit Rate", data: [72, 78, 85, 88, 91, 93, 95] }],
      xAxis: { categories: ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6", "Week 7"] },
      yAxis: { title: { text: "Hit Rate (%)" } },
      tooltip: { valueSuffix: "%" },
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("heatmap chart", async () => {
    const el = await renderChart({
      chart: { type: "heatmap" },
      title: "Workflow Run Heatmap",
      series: [{
        name: "Runs",
        data: [
          [0, 0, 10], [0, 1, 19], [0, 2, 8], [0, 3, 24], [0, 4, 67],
          [1, 0, 92], [1, 1, 58], [1, 2, 78], [1, 3, 117], [1, 4, 48],
          [2, 0, 35], [2, 1, 15], [2, 2, 123], [2, 3, 64], [2, 4, 52],
        ],
      }],
      xAxis: { categories: ["Mon", "Tue", "Wed"] },
      yAxis: { categories: ["6am", "9am", "12pm", "3pm", "6pm"], title: { text: "" } },
      colorAxis: { min: 0, minColor: "#30363d", maxColor: "#006edb" },
      plotOptions: {
        heatmap: {
          borderWidth: 2, borderColor: "#0d1117",
          dataLabels: { enabled: true, color: "#e5e7eb", style: { fontSize: "11px", textOutline: "none" } },
        },
      },
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("treemap chart", async () => {
    const el = await renderChart({
      chart: { type: "treemap" },
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
      chart: { type: "sunburst" },
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
      chart: { type: "sankey" },
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
      chart: { type: "funnel" },
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
      chart: { type: "networkgraph" },
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
      chart: { type: "gauge" },
      title: "CPU Usage",
      series: [{ name: "CPU", data: [72] }],
      pane: {
        startAngle: -150, endAngle: 150,
        background: [{ backgroundColor: "#1f2937", innerRadius: "60%", outerRadius: "100%", shape: "arc" }],
      },
      yAxis: { min: 0, max: 100, title: { text: "%" } },
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("waterfall chart", async () => {
    const el = await renderChart({
      chart: { type: "waterfall" },
      title: "SHR True TCO Breakdown",
      series: [{
        name: "TCO",
        data: [
          { name: "Base Compute", y: 120000, color: "#30a147" },
          { name: "Infra Mgmt", y: 45000, color: "#e5534b" },
          { name: "Networking", y: 22000, color: "#e5534b" },
          { name: "Maintenance FTE", y: 85000, color: "#e5534b" },
          { name: "Security", y: 18000, color: "#e5534b" },
          { name: "Total", isSum: true, color: "#006edb" },
        ],
      }],
      xAxis: { type: "category" },
      yAxis: { title: { text: "Annual Cost ($)" } },
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("timeline chart", async () => {
    const el = await renderChart({
      chart: { type: "timeline" },
      title: "Platform Modernization",
      series: [{
        data: [
          { name: "Jenkins Migration", label: "Jan 2024", description: "Migrated 50 repos" },
          { name: "Zero Trust", label: "Apr 2024", description: "OIDC everywhere" },
          { name: "GHR Adoption", label: "Jul 2024", description: "Full GHR rollout" },
          { name: "Security", label: "Oct 2024", description: "GHAS enabled" },
        ],
      }],
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("wordcloud chart", async () => {
    const el = await renderChart({
      chart: { type: "wordcloud" },
      title: "CI/CD Keywords",
      series: [{
        name: "Keywords",
        data: [
          { name: "node", weight: 38 },
          { name: "build", weight: 32 },
          { name: "deploy", weight: 28 },
          { name: "test", weight: 25 },
          { name: "docker", weight: 22 },
          { name: "cache", weight: 20 },
          { name: "actions", weight: 18 },
          { name: "runner", weight: 16 },
        ],
      }],
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("treegraph chart", async () => {
    const el = await renderChart({
      chart: { type: "treegraph" },
      title: "Platform Hierarchy",
      series: [{
        data: [
          { id: "0.0", name: "Platform" },
          { id: "1.0", name: "Actions", parent: "0.0" },
          { id: "1.1", name: "Copilot", parent: "0.0" },
          { id: "1.2", name: "Security", parent: "0.0" },
          { id: "2.0", name: "CI", parent: "1.0" },
          { id: "2.1", name: "CD", parent: "1.0" },
        ],
      }],
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("bubble chart", async () => {
    const el = await renderChart({
      chart: { type: "bubble" },
      title: "Repos vs Success Rate vs Minutes",
      series: [
        { name: "Enterprise", data: [[10, 95, 60], [25, 88, 120], [50, 72, 200]], color: "#006edb" },
        { name: "SMB", data: [[5, 98, 20], [15, 92, 50], [30, 85, 80]], color: "#30a147" },
      ],
      xAxis: { title: { text: "Active Repos" } },
      yAxis: { title: { text: "Success Rate (%)" } },
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("packedbubble chart", async () => {
    const el = await renderChart({
      chart: { type: "packedbubble" },
      title: "Top Actions by Usage",
      series: [
        { name: "GitHub", data: [{ name: "checkout", value: 95 }, { name: "setup-node", value: 82 }, { name: "cache", value: 68 }], color: "#006edb" },
        { name: "Docker", data: [{ name: "build-push", value: 72 }, { name: "login", value: 58 }], color: "#30a147" },
        { name: "Cloud", data: [{ name: "aws-configure", value: 45 }, { name: "azure-login", value: 38 }], color: "#d29922" },
      ],
      plotOptions: { packedbubble: { dataLabels: { enabled: true, format: "{point.name}" }, layoutAlgorithm: { splitSeries: true } } },
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("donut chart (pie with innerSize)", async () => {
    const el = await renderChart({
      chart: { type: "pie" },
      title: "CI/CD Market Share (Donut)",
      series: [{
        name: "Share",
        innerSize: "55%",
        data: [
          { name: "GitHub Actions", y: 42, color: "#006edb" },
          { name: "Jenkins", y: 22, color: "#d29922" },
          { name: "GitLab CI", y: 16, color: "#e5534b" },
          { name: "CircleCI", y: 8, color: "#8b949e" },
          { name: "Other", y: 12, color: "#484f58" },
        ],
      }],
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("gantt chart", async () => {
    const el = await renderChart({
      chart: { type: "gantt" },
      title: "Migration Timeline",
      series: [{
        name: "Project",
        data: [
          { name: "Discovery", start: 1704067200000, end: 1704672000000 },
          { name: "POC", start: 1704672000000, end: 1705276800000 },
          { name: "Migration", start: 1705276800000, end: 1706486400000 },
          { name: "Go Live", start: 1706486400000, end: 1706832000000 },
        ],
      }],
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("boxplot chart", async () => {
    const el = await renderChart({
      chart: { type: "boxplot" },
      title: "Build Time Distribution",
      series: [{
        name: "Build Times",
        data: [
          [760, 801, 848, 895, 965],
          [733, 853, 939, 980, 1080],
          [714, 762, 817, 870, 918],
          [724, 802, 836, 871, 950],
        ],
      }],
      xAxis: { categories: ["Linux", "Windows", "macOS", "ARM"] },
      yAxis: { title: { text: "Duration (ms)" } },
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("arearange chart", async () => {
    const el = await renderChart({
      chart: { type: "arearange" },
      title: "Build Time Range",
      series: [{
        name: "Min-Max",
        data: [[0, 5, 15], [1, 8, 20], [2, 10, 25], [3, 7, 18], [4, 12, 28]],
      }],
      xAxis: { categories: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("areasplinerange chart", async () => {
    const el = await renderChart({
      chart: { type: "areasplinerange" },
      title: "Response Time Range",
      series: [{
        name: "p10-p90",
        data: [[0, 30, 120], [1, 50, 180], [2, 70, 220], [3, 40, 160], [4, 60, 200]],
      }],
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("columnrange chart", async () => {
    const el = await renderChart({
      chart: { type: "columnrange" },
      title: "Temperature Range",
      series: [{
        name: "Temps",
        data: [[-5, 10], [2, 18], [5, 22], [8, 28]],
      }],
      xAxis: { categories: ["Jan", "Feb", "Mar", "Apr"] },
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("columnpyramid chart", async () => {
    const el = await renderChart({
      chart: { type: "columnpyramid" },
      title: "Pipeline Volume",
      series: [{ name: "Pipelines", data: [50, 80, 120, 90] }],
      xAxis: { categories: ["Q1", "Q2", "Q3", "Q4"] },
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("cylinder chart", async () => {
    const el = await renderChart({
      chart: { type: "cylinder", options3d: { enabled: true, alpha: 15, beta: 15, depth: 50, viewDistance: 25 } },
      title: "Cylinder Chart",
      series: [{ name: "Storage", data: [50, 80, 120, 90] }],
      xAxis: { categories: ["Q1", "Q2", "Q3", "Q4"] },
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("funnel3d chart", async () => {
    const el = await renderChart({
      chart: { type: "funnel3d", options3d: { enabled: true, alpha: 10, depth: 50, viewDistance: 50 } },
      title: "3D Funnel",
      series: [{
        name: "Pipeline",
        data: [
          { name: "Leads", y: 1000 },
          { name: "Qualified", y: 600 },
          { name: "Proposals", y: 300 },
          { name: "Closed", y: 100 },
        ],
      }],
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("pyramid3d chart", async () => {
    const el = await renderChart({
      chart: { type: "pyramid3d", options3d: { enabled: true, alpha: 10, depth: 50, viewDistance: 50 } },
      title: "3D Pyramid",
      series: [{
        name: "Hierarchy",
        data: [
          { name: "Executives", y: 5 },
          { name: "Managers", y: 25 },
          { name: "Engineers", y: 100 },
          { name: "Interns", y: 50 },
        ],
      }],
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("3D column chart", async () => {
    const el = await renderChart({
      chart: { type: "column", options3d: { enabled: true, alpha: 15, beta: 15, depth: 50, viewDistance: 25 } },
      title: "3D Column Chart",
      series: [{ name: "Revenue", data: [100, 200, 300, 400] }],
      xAxis: { categories: ["Q1", "Q2", "Q3", "Q4"] },
      plotOptions: { column: { depth: 25 } },
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("3D pie chart", async () => {
    const el = await renderChart({
      chart: { type: "pie", options3d: { enabled: true, alpha: 45, beta: 0 } },
      title: "3D Pie Chart",
      series: [{
        name: "Share",
        data: [
          { name: "GitHub Actions", y: 45 },
          { name: "Jenkins", y: 25 },
          { name: "GitLab CI", y: 15 },
          { name: "Other", y: 15 },
        ],
      }],
      plotOptions: { pie: { depth: 35 } },
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("3D scatter chart", async () => {
    const el = await renderChart({
      chart: { type: "scatter", options3d: { enabled: true, alpha: 10, beta: 30, depth: 250, viewDistance: 5, fitToPlot: false } },
      title: "3D Scatter",
      series: [{
        name: "Points",
        data: [[1, 6, 5], [8, 7, 9], [1, 3, 4], [4, 6, 8], [5, 7, 7], [6, 9, 6], [7, 0, 5], [2, 3, 3], [3, 9, 8], [3, 6, 5]],
      }],
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("variablepie chart", async () => {
    const el = await renderChart({
      chart: { type: "variablepie" },
      title: "Runner Pool Allocation",
      series: [{
        name: "Runners",
        data: [
          { name: "Linux", y: 505, z: 92 },
          { name: "Windows", y: 251, z: 119 },
          { name: "macOS", y: 112, z: 121 },
        ],
      }],
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("variwide chart", async () => {
    const el = await renderChart({
      chart: { type: "variwide" },
      title: "Cost per Runner Type",
      series: [{
        name: "Cost",
        data: [[0, 50, 100], [100, 80, 150], [250, 30, 80]],
      }],
      xAxis: { type: "linear" },
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("lollipop chart", async () => {
    const el = await renderChart({
      chart: { type: "lollipop" },
      title: "Feature Adoption",
      series: [{ name: "Adoption %", data: [85, 72, 68, 55, 42] }],
      xAxis: { categories: ["Actions", "Copilot", "GHAS", "Codespaces", "Packages"] },
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("dumbbell chart", async () => {
    const el = await renderChart({
      chart: { type: "dumbbell" },
      title: "Before/After Migration",
      series: [{
        name: "Build Time",
        data: [
          { low: 20, high: 50 },
          { low: 30, high: 80 },
          { low: 15, high: 65 },
        ],
      }],
      xAxis: { categories: ["Repo A", "Repo B", "Repo C"] },
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("streamgraph chart", async () => {
    const el = await renderChart({
      chart: { type: "streamgraph" },
      title: "Language Trends",
      series: [
        { name: "TypeScript", data: [1, 3, 5, 8, 12] },
        { name: "Python", data: [2, 4, 6, 7, 9] },
        { name: "Go", data: [3, 5, 4, 6, 8] },
      ],
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("xrange chart", async () => {
    const el = await renderChart({
      chart: { type: "xrange" },
      title: "Sprint Tasks",
      series: [{
        name: "Tasks",
        data: [
          { x: 1704067200000, x2: 1704326400000, y: 0 },
          { x: 1704153600000, x2: 1704499200000, y: 1 },
          { x: 1704240000000, x2: 1704412800000, y: 2 },
        ],
      }],
      xAxis: { type: "datetime" },
      yAxis: { categories: ["Design", "Dev", "QA"] },
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("errorbar chart", async () => {
    const el = await renderChart({
      title: "Rainfall with Error",
      series: [
        { name: "Rainfall", type: "column", data: [49, 71, 106, 129] },
        { name: "Error", type: "errorbar", data: [[44, 54], [66, 78], [96, 116], [119, 139]] },
      ],
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("polygon chart", async () => {
    const el = await renderChart({
      chart: { type: "polygon" },
      title: "Coverage Area",
      series: [{ name: "Shape", data: [[0, 0], [5, 10], [10, 5], [8, -2], [2, -3]] }],
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("item chart", async () => {
    const el = await renderChart({
      chart: { type: "item" },
      title: "Parliament Seats",
      series: [{
        name: "Seats",
        data: [
          { name: "Party A", y: 220, color: "#006edb" },
          { name: "Party B", y: 215, color: "#e5534b" },
        ],
      }],
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("tilemap chart", async () => {
    const el = await renderChart({
      chart: { type: "tilemap" },
      title: "Grid Metrics",
      series: [{
        name: "Tiles",
        data: [
          { x: 0, y: 0, value: 5, name: "A1" },
          { x: 1, y: 0, value: 8, name: "A2" },
          { x: 0, y: 1, value: 3, name: "B1" },
          { x: 1, y: 1, value: 9, name: "B2" },
        ],
      }],
      colorAxis: { min: 0, minColor: "#30363d", maxColor: "#006edb" },
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("vector chart", async () => {
    const el = await renderChart({
      chart: { type: "vector" },
      title: "Wind Vectors",
      series: [{
        name: "Wind",
        data: [[0, 0, 10, 45], [1, 0, 15, 90], [0, 1, 8, 135], [1, 1, 12, 270]],
      }],
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("windbarb chart", async () => {
    const el = await renderChart({
      chart: { type: "windbarb" },
      title: "Wind Observations",
      series: [{ name: "Wind", data: [[5, 180], [10, 90], [15, 270], [8, 45]] }],
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("histogram chart", async () => {
    const el = await renderChart({
      title: "Build Duration Distribution",
      series: [
        { type: "scatter", name: "Data", id: "data", visible: false, data: [3.5, 3, 3.2, 3.1, 3.6, 3.9, 3.4, 3.4, 2.9, 3.1, 4.7, 4.4, 5.1, 4.9, 5, 5.4, 4.6, 5, 4.4, 4.9] },
        { type: "histogram", name: "Histogram", baseSeries: "data", data: [] },
      ],
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("bellcurve chart", async () => {
    const el = await renderChart({
      title: "Normal Distribution",
      series: [
        { type: "scatter", name: "Data", id: "data", visible: false, data: [3.5, 3, 3.2, 3.1, 3.6, 3.9, 3.4, 3.4, 2.9, 3.1, 4.7, 4.4, 5.1, 4.9, 5, 5.4, 4.6, 5, 4.4, 4.9] },
        { type: "bellcurve", name: "Bell Curve", baseSeries: "data", data: [] },
      ],
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("pareto chart", async () => {
    const el = await renderChart({
      title: "Defect Analysis",
      series: [
        { type: "column", name: "Complaints", data: [100, 80, 50, 30, 20, 10] },
        { type: "pareto", name: "Cumulative", baseSeries: 0, data: [] },
      ],
      xAxis: { categories: ["Late", "Defect", "Wrong", "Missing", "Damaged", "Other"] },
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("venn diagram", async () => {
    const el = await renderChart({
      chart: { type: "venn" },
      title: "Platform Overlap",
      series: [{
        name: "Sets",
        data: [
          { sets: ["Actions"], value: 10, name: "Actions" },
          { sets: ["Copilot"], value: 8, name: "Copilot" },
          { sets: ["GHAS"], value: 6, name: "GHAS" },
          { sets: ["Actions", "Copilot"], value: 4, name: "Actions+Copilot" },
          { sets: ["Actions", "GHAS"], value: 3, name: "Actions+GHAS" },
        ],
      }],
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("arcdiagram chart", async () => {
    const el = await renderChart({
      chart: { type: "arcdiagram" },
      title: "Service Connections",
      series: [{
        name: "Links",
        data: [
          { from: "A", to: "B", weight: 4 },
          { from: "B", to: "C", weight: 2 },
          { from: "A", to: "C", weight: 3 },
        ],
      }],
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("dependencywheel chart", async () => {
    const el = await renderChart({
      chart: { type: "dependencywheel" },
      title: "Team Dependencies",
      series: [{
        name: "Deps",
        data: [
          { from: "Frontend", to: "API", weight: 5 },
          { from: "API", to: "DB", weight: 3 },
          { from: "Frontend", to: "Auth", weight: 2 },
        ],
      }],
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("organization chart", async () => {
    const el = await renderChart({
      chart: { type: "organization" },
      title: "Org Structure",
      series: [{
        name: "Org",
        data: [
          { from: "CEO", to: "CTO" },
          { from: "CEO", to: "CFO" },
          { from: "CTO", to: "Dev Lead" },
          { from: "CTO", to: "QA Lead" },
        ],
      }],
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("pyramid chart", async () => {
    const el = await renderChart({
      chart: { type: "pyramid" },
      title: "Adoption Pyramid",
      series: [{
        name: "Users",
        data: [
          ["Enterprise", 200],
          ["Mid-Market", 500],
          ["SMB", 1500],
          ["Free", 5000],
        ],
      }],
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("pictorial chart", async () => {
    const el = await renderChart({
      chart: { type: "pictorial" },
      title: "Pictorial Values",
      series: [{ name: "Values", data: [40, 60, 80] }],
      xAxis: { categories: ["A", "B", "C"] },
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });
});

describe("Chart Features", () => {
  it("height presets", async () => {
    const small = await renderChart({
      chart: { type: "line", height: 128 },
      title: "Small",
      series: [{ name: "A", data: [1, 3, 2, 5] }],
    });
    const xl = await renderChart({
      chart: { type: "line", height: 432 },
      title: "XL",
      series: [{ name: "A", data: [1, 3, 2, 5] }],
    });
    const smallH = small.querySelector(".highcharts-container")?.clientHeight ?? 0;
    const xlH = xl.querySelector(".highcharts-container")?.clientHeight ?? 0;
    expect(smallH).toBeLessThan(200);
    expect(xlH).toBeGreaterThan(400);
  });

  it("percentage stacking", async () => {
    const el = await renderChart({
      chart: { type: "column" },
      title: "100% Stacked",
      series: [
        { name: "GHR", data: [70, 75, 80] },
        { name: "SHR", data: [30, 25, 20] },
      ],
      xAxis: { categories: ["2024", "2025", "2026"] },
      yAxis: { labels: { format: "{value}%" } },
      plotOptions: { series: { stacking: "percent" } },
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("string shorthand for title/subtitle", async () => {
    const el = await renderChart({
      chart: { type: "column" },
      title: "Enterprise Deals",
      subtitle: "FY2026 Q1 — Q4 Pipeline",
      series: [{ name: "ARR", data: [1.5, 2.1, 3.0, 4.2] }],
      xAxis: { categories: ["Q1", "Q2", "Q3", "Q4"] },
    });
    const subtitle = el.querySelector(".highcharts-subtitle");
    expect(subtitle?.textContent).toContain("FY2026");
  });

  it("per-series custom colors", async () => {
    const el = await renderChart({
      chart: { type: "column" },
      title: "Custom Colors",
      series: [
        { name: "Success", data: [85], color: "#30a147" },
        { name: "Warning", data: [12], color: "#b88700" },
        { name: "Error", data: [3], color: "#df0c24" },
      ],
      xAxis: { categories: ["Status"] },
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("multi-line dash differentiation (5 series)", async () => {
    const el = await renderChart({
      chart: { type: "line" },
      title: "5 Series Dash Styles",
      series: [
        { name: "Solid", data: [10, 20, 30, 40] },
        { name: "ShortDash", data: [15, 25, 35, 45] },
        { name: "Dot", data: [20, 30, 40, 50] },
        { name: "DashDot", data: [25, 35, 45, 55] },
        { name: "LongDash", data: [30, 40, 50, 60] },
      ],
      xAxis: { categories: ["Jan", "Feb", "Mar", "Apr"] },
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("drilldown", async () => {
    const el = await renderChart({
      chart: { type: "column" },
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

  it("custom legend + plotOptions", async () => {
    const el = await renderChart({
      chart: { type: "line" },
      title: "Custom Legend Position",
      series: [{ name: "Metric", data: [5, 10, 15, 20, 25] }],
      xAxis: { categories: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
      legend: { align: "right", verticalAlign: "middle", layout: "vertical" },
      plotOptions: { line: { lineWidth: 4 } },
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("default chart type (no chart = line)", async () => {
    const el = await renderChart({
      title: "Default Type",
      series: [{ name: "Values", data: [3, 7, 2, 9, 4] }],
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
  });

  it("sparkline", async () => {
    const el = await renderChart({
      chart: { type: "areaspline", height: 128, spacing: [0, 0, 0, 0] },
      title: { text: "" },
      series: [{ name: "Trend", data: [3, 5, 4, 7, 6, 9, 8, 11] }],
      legend: { enabled: false },
      xAxis: { visible: false },
      yAxis: { visible: false },
    });
    const h = el.querySelector(".highcharts-container")?.clientHeight ?? 0;
    expect(h).toBeLessThanOrEqual(128);
  });

  it("axis titles", async () => {
    const el = await renderChart({
      chart: { type: "scatter" },
      title: "Axis Titles",
      series: [{ name: "Data", data: [{ x: 1, y: 2 }, { x: 3, y: 4 }] }],
      xAxis: { title: { text: "Concurrency Level" } },
      yAxis: { title: { text: "Throughput (req/s)" } },
    });
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
    const svg = el.querySelector(".highcharts-root")!;
    expect(svg.innerHTML).toContain("Concurrency");
  });
});

describe("GitHub Theme", () => {
  let savedDefaults: Options;

  beforeEach(() => {
    savedDefaults = Highcharts.merge(Highcharts.defaultOptions) as Options;
  });

  afterEach(() => {
    // Reset Highcharts global options to pre-test state.
    // setOptions is additive with no built-in reset, so we overwrite the internal object.
    (Highcharts as unknown as Record<string, unknown>).defaultOptions = savedDefaults;
  });

  const chartConfig = {
    chart: { type: "column" },
    title: "GitHub Actions Revenue Growth",
    subtitle: "FY2024 - FY2026",
    series: [
      { name: "GitHub-Hosted Runners", data: [2.1, 2.8, 3.5, 4.2, 5.1, 6.3] },
      { name: "Self-Hosted Runners", data: [1.8, 1.9, 2, 2, 1.9, 1.8] },
      { name: "Actions Minutes", data: [3.2, 3.5, 3.9, 4.3, 4.8, 5.4] },
    ],
    xAxis: { categories: ["Q1 FY24", "Q2 FY24", "Q3 FY24", "Q4 FY24", "Q1 FY25", "Q2 FY25"] },
    yAxis: { title: { text: "ARR ($M)" } },
    tooltip: { valuePrefix: "$", valueSuffix: "M" },
  } as const;

  function assertThemeDOM(el: HTMLElement) {
    expect(el.querySelector(".highcharts-root")).toBeTruthy();
    expect(el.querySelector(".highcharts-background")?.getAttribute("fill")).toBe("transparent");
    expect(el.querySelector(".highcharts-series-0 rect")?.getAttribute("fill")).toBe("#006edb");
    expect(el.querySelector(".highcharts-yaxis-grid .highcharts-grid-line")?.getAttribute("stroke-dasharray")).toBeTruthy();
  }

  it("applies theme from JSON file", async () => {
    const theme = await import("../../.vscode/github-theme.json");
    Highcharts.setOptions(theme as unknown as Options);
    const el = await renderChart({ ...chartConfig });
    assertThemeDOM(el);
  });

  it("applies theme from TypeScript file", async () => {
    const { default: theme } = await import("../../.vscode/github-theme.ts");
    Highcharts.setOptions(theme);
    const el = await renderChart({ ...chartConfig });
    assertThemeDOM(el);
  });
});
