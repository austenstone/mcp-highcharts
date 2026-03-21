import { App, PostMessageTransport, applyHostStyleVariables, applyDocumentTheme, applyHostFonts } from "@modelcontextprotocol/ext-apps";
import type { McpUiHostContext } from "@modelcontextprotocol/ext-apps";
import Highcharts from "highcharts";
import type { Options } from "highcharts";
import { loadModulesForOptions } from "./module-loader";

// Lazy-load the selected Highcharts theme (default: adaptive)
const themeModules = import.meta.glob(
  "/node_modules/highcharts/esm/themes/*.src.js",
) as Record<string, () => Promise<unknown>>;

const userOverrides = (window as unknown as Record<string, unknown>).__HIGHCHARTS_OPTIONS__ as Options | undefined;

const themeName =
  (window as unknown as Record<string, unknown>).__HIGHCHARTS_THEME_NAME__ as string | undefined
  ?? "adaptive";

// When user provides full custom options, skip the built-in theme entirely
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

/**
 * Sync host theme to adaptive theme's forced class + bridge CSS vars.
 */
function applyHostTheme(ctx: McpUiHostContext | null | undefined) {
  if (!ctx) return;

  const root = document.documentElement;

  // Apply MCP SDK theme helpers
  if (ctx.theme) {
    applyDocumentTheme(ctx.theme);
  }

  // Force adaptive theme mode via class names
  if (ctx.theme === "dark") {
    root.classList.add("highcharts-dark");
    root.classList.remove("highcharts-light");
  } else {
    root.classList.add("highcharts-light");
    root.classList.remove("highcharts-dark");
  }

  // Apply host style variables
  if (ctx.styles?.variables) {
    applyHostStyleVariables(ctx.styles.variables);
  }

  // Apply host fonts
  if (ctx.styles?.css?.fonts) {
    applyHostFonts(ctx.styles.css.fonts);
  }

  const vars = ctx.styles?.variables;
  if (!vars) return;

  // CSS variable bridge: MCP host tokens → Highcharts adaptive theme CSS vars
  const cssVarMap: Record<string, string | undefined> = {
    "--highcharts-background-color": vars["--color-background-primary"],
    "--highcharts-neutral-color-100": vars["--color-text-primary"],
    "--highcharts-neutral-color-80": vars["--color-text-secondary"],
    "--highcharts-neutral-color-60": vars["--color-text-tertiary"],
    "--highcharts-neutral-color-40": vars["--color-border-primary"],
    "--highcharts-neutral-color-20": vars["--color-border-secondary"],
    "--highcharts-neutral-color-10": vars["--color-border-tertiary"],
    "--highcharts-neutral-color-5": vars["--color-background-secondary"],
    "--highcharts-neutral-color-3": vars["--color-background-tertiary"],
    "--highcharts-highlight-color-100": vars["--color-ring-primary"],
    "--highcharts-highlight-color-80": vars["--color-ring-info"],
    "--highcharts-highlight-color-60": vars["--color-background-info"],
    "--highcharts-highlight-color-20": vars["--color-border-info"],
    "--highcharts-highlight-color-10": vars["--color-background-secondary"],
    "--highcharts-positive-color": vars["--color-text-success"],
    "--highcharts-negative-color": vars["--color-text-danger"],
  };

  for (const [hcVar, value] of Object.entries(cssVarMap)) {
    if (value) root.style.setProperty(hcVar, value);
  }

  // Font family via setOptions
  const fontFamily = vars["--font-sans"];
  if (fontFamily) {
    Highcharts.setOptions({
      chart: { style: { fontFamily } },
    });
  }
}

function applyThemeAndRedraw(ctx: McpUiHostContext | null | undefined) {
  if (!userOverrides) {
    applyHostTheme(ctx);
    Highcharts.charts.forEach(c => c?.redraw());
  }
}

function processOptions(opts: Record<string, unknown>): Options & Record<string, unknown> {
  const processed = opts as Options & Record<string, unknown>;
  if (typeof processed.title === "string") processed.title = { text: processed.title };
  if (typeof processed.subtitle === "string") processed.subtitle = { text: processed.subtitle };
  return processed;
}

async function renderSingleChart(opts: Options & Record<string, unknown>) {
  const processed = processOptions(opts as Record<string, unknown>);
  const container = document.getElementById("root")!;
  container.innerHTML = "";
  container.style.display = "";
  await loadModulesForOptions(processed as Record<string, unknown>);
  Highcharts.chart(container, processed);
}

async function renderMultipleCharts(
  charts: Record<string, unknown>[],
  layout: string,
  columns: number
) {
  const root = document.getElementById("root")!;
  root.innerHTML = "";

  root.style.display = layout === "horizontal" || layout === "grid" ? "grid" : "flex";
  root.style.flexDirection = "column";
  root.style.gap = "16px";

  if (layout === "grid") {
    root.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
  } else if (layout === "horizontal") {
    root.style.gridTemplateColumns = `repeat(${charts.length}, 1fr)`;
  } else {
    root.style.gridTemplateColumns = "";
  }

  for (const chartOpts of charts) {
    const container = document.createElement("div");
    container.style.width = "100%";
    container.style.minHeight = "300px";
    root.appendChild(container);

    const processed = processOptions(chartOpts);
    await loadModulesForOptions(processed as Record<string, unknown>);
    Highcharts.chart(container, processed as Options);
  }
}

async function init() {
  await themeReady;

  const app = new App(
    { name: "Highcharts MCP App", version: "1.0.0" },
    {},
  );

  app.ontoolresult = async (result) => {
    const textContent = result.content?.find((c: any) => c.type === "text") as { text: string } | undefined;
    const text = textContent?.text;
    if (!text) return;
    try {
      const opts = JSON.parse(text) as Record<string, unknown>;

      if (opts.charts && Array.isArray(opts.charts)) {
        // Multi-chart mode (from render_charts)
        const layout = (opts.layout as string) || "vertical";
        const columns = (opts.columns as number) || 2;
        await renderMultipleCharts(opts.charts, layout, columns);
      } else {
        // Single chart mode (from render_chart)
        await renderSingleChart(opts as Options & Record<string, unknown>);
      }
    } catch (e) {
      console.error("Failed to parse chart data:", e);
    }
  };

  app.onhostcontextchanged = (ctx) => {
    applyThemeAndRedraw(ctx);
  };

  app.onerror = console.error;

  await app.connect(new PostMessageTransport(window.parent, window.parent));

  // Apply initial host theme
  applyThemeAndRedraw(app.getHostContext());
}

init().catch(console.error);
