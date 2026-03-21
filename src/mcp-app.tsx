import { useApp, useHostStyles } from "@modelcontextprotocol/ext-apps/react";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import Highcharts from "highcharts";
import type { Options } from "highcharts";
import "virtual:highcharts-modules";
import HighchartsReact from "highcharts-react-official";

import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

// Lazy-load the selected Highcharts theme (default: adaptive)
const themeModules = import.meta.glob(
  "/node_modules/highcharts/esm/themes/*.src.js",
) as Record<string, () => Promise<unknown>>;

const themeName =
  (window as unknown as Record<string, unknown>).__HIGHCHARTS_THEME_NAME__ as string | undefined
  ?? "adaptive";

const themeKey = `/node_modules/highcharts/esm/themes/${themeName}.src.js`;
const themeReady = (themeModules[themeKey]?.() ?? Promise.resolve()).then(() => {
  // Merge user JSON overrides (injected by server) on top
  const overrides = (window as unknown as Record<string, unknown>).__HIGHCHARTS_THEME__;
  if (overrides && typeof overrides === "object") {
    Highcharts.setOptions(overrides as Options);
  }
  Highcharts.setOptions({ credits: { enabled: false } });
});

function ChartApp() {
  const [toolResult, setToolResult] = useState<CallToolResult | null>(null);
  const [options, setOptions] = useState<Options | null>(null);
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
      const opts = JSON.parse(text) as Options & Record<string, unknown>;
      if (typeof opts.title === "string") opts.title = { text: opts.title };
      if (typeof opts.subtitle === "string") opts.subtitle = { text: opts.subtitle };
      setOptions(opts);
    } catch (e) {
      console.error("Failed to parse chart data:", e);
    }
  }, [toolResult]);

  if (error) return <div style={{ color: "#ef4444", padding: 16 }}>Error: {error.message}</div>;
  if (!app || !ready) return null;
  if (!options) return null;

  return <HighchartsReact highcharts={Highcharts} options={options} />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ChartApp />
  </StrictMode>,
);
