import type { Options } from "highcharts";

const ChartTheme: Options = {
  colors: [
    "#006edb", "#30a147", "#eb670f", "#ce2c85", "#b88700",
    "#df0c24", "#894ceb", "#9d615c", "#179b9b", "#808fa3",
  ],
  chart: {
    backgroundColor: "#0d1117",
    style: {
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif",
    },
  },
  title: {
    style: {
      color: "#c9d1d9",
      fontWeight: "600",
    },
  },
  subtitle: {
    style: {
      color: "#8b949e",
    },
  },
  legend: {
    itemStyle: {
      color: "#c9d1d9",
    },
    itemHoverStyle: {
      color: "#f0f6fc",
    },
  },
  tooltip: {
    backgroundColor: "#161b22",
    borderColor: "#30363d",
    style: {
      color: "#c9d1d9",
    },
  },
  xAxis: {
    lineColor: "#30363d",
    gridLineColor: "#21262d",
    labels: { style: { color: "#8b949e" } },
    title: { style: { color: "#8b949e" } },
  },
  yAxis: {
    lineColor: "#30363d",
    gridLineColor: "#21262d",
    gridLineDashStyle: "Dash",
    labels: { style: { color: "#8b949e" } },
    title: { style: { color: "#8b949e" } },
  },
};

export default ChartTheme;
