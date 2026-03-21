import { App, PostMessageTransport, applyHostStyleVariables, applyDocumentTheme, applyHostFonts } from "@modelcontextprotocol/ext-apps";
import type { McpUiHostContext } from "@modelcontextprotocol/ext-apps";
import Highcharts from "highcharts";
import type { Options } from "highcharts";
import { loadModulesForOptions } from "./module-loader";

// Theme name is a runtime value (from env var), so we use import.meta.glob for dynamic loading.
// Highcharts themes self-register via Highcharts.setOptions() when imported — no manual setup needed.
const themeModules = import.meta.glob(
  "/node_modules/highcharts/esm/themes/*.src.js",
) as Record<string, () => Promise<unknown>>;

const userOverrides = (window as unknown as Record<string, unknown>).__HIGHCHARTS_OPTIONS__ as Options | undefined;

const themeName =
  (window as unknown as Record<string, unknown>).__HIGHCHARTS_THEME_NAME__ as string | undefined
  ?? "adaptive";

// When user provides full custom options, skip the built-in theme entirely.
// Otherwise, dynamically import the theme module — it self-registers on load.
const themeKey = `/node_modules/highcharts/esm/themes/${themeName}.src.js`;
const themeReady = (userOverrides
  ? Promise.resolve()
  : themeModules[themeKey]?.() ?? Promise.resolve()
).then(() => {
  Highcharts.setOptions({
    credits: { enabled: false },
    exporting: {
      enabled: true,
      fallbackToExportServer: false, // Client-side only — don't send data to Highcharts servers
    },
  });
  if (userOverrides) {
    Highcharts.setOptions(userOverrides);
  }
});

/**
 * Sync host theme to Highcharts adaptive theme.
 *
 * The adaptive theme (built-in since v12.2+) uses CSS variables in both classic
 * and styled modes and handles light/dark automatically via class names.
 * We only need to:
 * 1. Toggle highcharts-light/dark classes
 * 2. Apply MCP SDK helpers (fonts, style variables)
 * 3. Bridge the few host tokens that map to Highcharts CSS vars
 */
function applyHostTheme(ctx: McpUiHostContext | null | undefined) {
  if (!ctx) return;

  const root = document.documentElement;

  // Apply MCP SDK theme helpers
  if (ctx.theme) applyDocumentTheme(ctx.theme);

  // Let Highcharts adaptive theme handle light/dark via class names
  if (ctx.theme === "dark") {
    root.classList.add("highcharts-dark");
    root.classList.remove("highcharts-light");
  } else {
    root.classList.add("highcharts-light");
    root.classList.remove("highcharts-dark");
  }

  if (ctx.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
  if (ctx.styles?.css?.fonts) applyHostFonts(ctx.styles.css.fonts);

  const vars = ctx.styles?.variables;
  if (!vars) return;

  // Only override specific vars the host provides — adaptive theme handles the rest
  const overrides: Record<string, string | undefined> = {
    "--highcharts-background-color": vars["--color-background-primary"],
    "--highcharts-neutral-color-100": vars["--color-text-primary"],
    "--highcharts-neutral-color-80": vars["--color-text-secondary"],
    "--highcharts-neutral-color-5": vars["--color-background-secondary"],
  };

  for (const [hcVar, value] of Object.entries(overrides)) {
    if (value) root.style.setProperty(hcVar, value);
  }

  // Font family — use CSS custom property so it works in both classic and styled modes
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

function showError(container: HTMLElement, e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  container.innerHTML = `<div style="padding:24px;color:#f85149;font-family:system-ui;font-size:14px;">
    <strong>Chart rendering failed</strong><br><code style="color:#8b949e;font-size:12px;">${msg}</code>
  </div>`;
  console.error("Chart rendering failed:", e);
}

async function renderSingleChart(opts: Options & Record<string, unknown>) {
  const processed = processOptions(opts as Record<string, unknown>);
  const container = document.getElementById("root")!;
  try {
    await loadModulesForOptions(processed as Record<string, unknown>);

    // Update existing chart if possible — smoother than destroy + recreate
    const existingChart = Highcharts.charts.find(c => (c as any)?.renderTo === container);
    if (existingChart) {
      existingChart.update(processed, true, true);
    } else {
      container.innerHTML = "";
      container.style.display = "";
      Highcharts.chart(container, processed);
    }
  } catch (e) {
    showError(container, e);
  }
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
    try {
      await loadModulesForOptions(processed as Record<string, unknown>);
      Highcharts.chart(container, processed as Options);
    } catch (e) {
      showError(container, e);
    }
  }
}

async function init() {
  await themeReady;

  const app = new App(
    { name: "Highcharts MCP App", version: "2.0.0" },
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
