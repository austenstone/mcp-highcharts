import { useApp, useHostStyles } from "@modelcontextprotocol/ext-apps/react";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import Highcharts from "highcharts";
import "virtual:highcharts-modules";
import HighchartsReact from "highcharts-react-official";

import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { buildChartOptions } from "./chart-options";
import { getTheme } from "./theme";

// Lazy-load all built-in Highcharts themes so only the selected one executes
const themeModules = import.meta.glob(
  "/node_modules/highcharts/esm/themes/*.src.js",
) as Record<string, () => Promise<unknown>>;

const themeName =
  (window as unknown as Record<string, unknown>).__HIGHCHARTS_THEME_NAME__ as string | undefined
  ?? "adaptive";

const themeKey = `/node_modules/highcharts/esm/themes/${themeName}.src.js`;
const themeReady = (themeModules[themeKey]?.() ?? Promise.resolve()).then(() => {
  Highcharts.setOptions(getTheme());
});

function ChartApp() {
  const [toolResult, setToolResult] = useState<CallToolResult | null>(null);
  const [options, setOptions] = useState<Highcharts.Options | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => { themeReady.then(() => setReady(true)); }, []);

  const { app, error } = useApp({
    appInfo: { name: "Highcharts MCP App", version: "1.0.0" },
    capabilities: {},
    onAppCreated: (app) => {
      app.ontoolresult = async (result) => setToolResult(result);
      app.onerror = console.error;
    },
  });

  useHostStyles(app, app?.getHostContext());

  useEffect(() => {
    if (!toolResult) return;
    const text = toolResult.content?.find((c) => c.type === "text")?.text;
    if (!text) return;
    try {
      setOptions(buildChartOptions(JSON.parse(text) as Record<string, unknown>));
    } catch (e) {
      console.error("Failed to parse chart data:", e);
    }
  }, [toolResult]);

  if (error) return <div style={{ color: "#ef4444", padding: 16 }}>Error: {error.message}</div>;
  if (!app || !ready) return <div style={{ color: "#9ca3af", padding: 16 }}>Connecting...</div>;
  if (!options) return <div style={{ color: "#9ca3af", padding: 24, textAlign: "center" }}>Waiting for chart data...</div>;

  return (
    <div style={{ width: "100%", padding: 8 }}>
      <HighchartsReact highcharts={Highcharts} options={options} />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ChartApp />
  </StrictMode>,
);
