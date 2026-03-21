import type { App } from "@modelcontextprotocol/ext-apps";
import { useApp } from "@modelcontextprotocol/ext-apps/react";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import Highcharts from "highcharts";
// Chart modules — the ultimate collection
import "highcharts/highcharts-more";
import "highcharts/modules/heatmap";
import "highcharts/modules/sankey";
import "highcharts/modules/funnel";
import "highcharts/modules/treemap";
import "highcharts/modules/sunburst";
import "highcharts/modules/networkgraph";
import "highcharts/modules/solid-gauge";
import "highcharts/modules/drilldown";
import "highcharts/modules/boost";
import "highcharts/modules/accessibility";
import "highcharts/modules/exporting";
import "highcharts/modules/export-data";
import "highcharts/modules/offline-exporting";
import HighchartsReact from "highcharts-react-official";

import { StrictMode, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { buildChartOptions, type ChartToolParams } from "./chart-options";
import { theme } from "./theme";

// Apply global theme + number formatting
Highcharts.setOptions(theme);
Highcharts.setOptions({
  lang: {
    decimalPoint: ".",
    thousandsSep: ",",
  },
});

function ChartApp() {
  const [toolResult, setToolResult] = useState<CallToolResult | null>(null);

  const { app, error } = useApp({
    appInfo: { name: "Highcharts MCP App", version: "0.1.0" },
    capabilities: {},
    onAppCreated: (app) => {
      app.ontoolresult = async (result) => {
        setToolResult(result);
      };
      app.onerror = console.error;
    },
  });

  if (error) return <div style={{ color: "#ef4444", padding: 16 }}>Error: {error.message}</div>;
  if (!app) return <div style={{ color: "#9ca3af", padding: 16 }}>Connecting...</div>;

  return <ChartView app={app} toolResult={toolResult} />;
}

interface ChartViewProps {
  app: App;
  toolResult: CallToolResult | null;
}

function ChartView({ app, toolResult }: ChartViewProps) {
  const chartRef = useRef<HighchartsReact.RefObject>(null);
  const [options, setOptions] = useState<Highcharts.Options | null>(null);

  useEffect(() => {
    if (!toolResult) return;

    const text = toolResult.content?.find((c) => c.type === "text")?.text;
    if (!text) return;

    try {
      const params: ChartToolParams = JSON.parse(text);
      setOptions(buildChartOptions(params));
    } catch (e) {
      console.error("Failed to parse chart data:", e);
    }
  }, [toolResult]);

  // Reflow chart when container resizes
  useEffect(() => {
    if (!chartRef.current?.chart) return;
    const observer = new ResizeObserver(() => {
      chartRef.current?.chart?.reflow();
    });
    const el = chartRef.current.container.current;
    if (el) observer.observe(el);
    return () => observer.disconnect();
  }, [options]);

  if (!options) {
    return (
      <div style={{ color: "#9ca3af", padding: 24, textAlign: "center" }}>
        Waiting for chart data...
      </div>
    );
  }

  return (
    <div style={{ width: "100%", padding: 8 }}>
      <HighchartsReact
        highcharts={Highcharts}
        options={options}
        ref={chartRef}
      />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ChartApp />
  </StrictMode>,
);
