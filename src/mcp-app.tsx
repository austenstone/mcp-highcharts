import { useApp, useHostStyles } from "@modelcontextprotocol/ext-apps/react";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { McpUiHostContext } from "@modelcontextprotocol/ext-apps";
import Highcharts from "highcharts";
import type { Options } from "highcharts";
import "virtual:highcharts-modules";
import HighchartsReact from "highcharts-react-official";

import { StrictMode, useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

// Lazy-load the selected Highcharts theme (default: adaptive)
const themeModules = import.meta.glob(
  "/node_modules/highcharts/esm/themes/*.src.js",
) as Record<string, () => Promise<unknown>>;

const userOverrides = (window as unknown as Record<string, unknown>).__HIGHCHARTS_OPTIONS__ as Options | undefined;

const themeName =
  (window as unknown as Record<string, unknown>).__HIGHCHARTS_THEME_NAME__ as string | undefined
  ?? "adaptive";

// When user provides full custom options, skip the built-in theme entirely —
// the adaptive theme registers a matchMedia listener that re-applies its colors
// on color scheme changes, overriding user setOptions calls.
const themeKey = `/node_modules/highcharts/esm/themes/${themeName}.src.js`;
const themeReady = (userOverrides
  ? Promise.resolve()
  : themeModules[themeKey]?.() ?? Promise.resolve()
).then(() => {
  Highcharts.setOptions({
    credits: { enabled: false },
    exporting: { enabled: false },
  });
  if (userOverrides) {
    Highcharts.setOptions(userOverrides);
  }
});

// Sync host theme to adaptive theme's forced class + bridge CSS vars.
// The adaptive theme uses highcharts-light/highcharts-dark classes on parent
// elements to force light/dark mode instead of relying on prefers-color-scheme.
function applyHostTheme(ctx: McpUiHostContext | null | undefined) {
  if (!ctx) return;

  const root = document.documentElement;

  // Force adaptive theme mode via class names
  if (ctx.theme === "dark") {
    root.classList.add("highcharts-dark");
    root.classList.remove("highcharts-light");
  } else {
    root.classList.add("highcharts-light");
    root.classList.remove("highcharts-dark");
  }

  // Bridge MCP host vars → Highcharts CSS vars so chart matches VS Code theme
  const vars = ctx.styles?.variables;
  if (!vars) return;
  const map: Record<string, string | undefined> = {
    "--highcharts-background-color": vars["--color-background-primary"],
    "--highcharts-neutral-color-100": vars["--color-text-primary"],
    "--highcharts-neutral-color-80": vars["--color-text-secondary"],
    "--highcharts-neutral-color-60": vars["--color-text-tertiary"],
    "--highcharts-neutral-color-40": vars["--color-border-primary"],
    "--highcharts-neutral-color-20": vars["--color-border-secondary"],
    "--highcharts-neutral-color-10": vars["--color-border-tertiary"],
    "--highcharts-neutral-color-5": vars["--color-background-secondary"],
    "--highcharts-neutral-color-3": vars["--color-background-tertiary"],
  };
  for (const [hcVar, value] of Object.entries(map)) {
    if (value) root.style.setProperty(hcVar, value);
  }
}

function ChartApp() {
  const [toolResult, setToolResult] = useState<CallToolResult | null>(null);
  const [options, setOptions] = useState<Options | null>(null);
  const [ready, setReady] = useState(false);
  const chartRef = useRef<HighchartsReact.RefObject>(null);

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

  // Apply host theme on connect and on theme changes
  const applyAndRedraw = useCallback((ctx: McpUiHostContext | null | undefined) => {
    if (!userOverrides) {
      applyHostTheme(ctx);
      // Force all existing charts to redraw with new CSS var values
      Highcharts.charts.forEach(c => c?.redraw());
    }
  }, []);

  useEffect(() => {
    applyAndRedraw(app?.getHostContext());
  }, [app, applyAndRedraw]);

  useEffect(() => {
    if (!app) return;
    const prev = app.onhostcontextchanged;
    app.onhostcontextchanged = (ctx) => {
      applyAndRedraw(ctx);
      if (typeof prev === "function") prev(ctx);
    };
  }, [app, applyAndRedraw]);

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
