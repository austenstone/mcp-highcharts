import { App, PostMessageTransport, applyHostStyleVariables, applyDocumentTheme, applyHostFonts } from "@modelcontextprotocol/ext-apps";
import type { McpUiHostContext } from "@modelcontextprotocol/ext-apps";
// Import Highcharts core
import Highcharts from "highcharts";
import type { Options } from "highcharts";
// Static imports for chart constructors we call directly (mapChart, stockChart, ganttChart)
// These register on Highcharts via es-modules/masters/ side effects
import "highcharts/modules/map";
import "highcharts/modules/stock";
import "highcharts/modules/gantt";
import Dashboards from "@highcharts/dashboards";
import "@highcharts/dashboards/modules/layout";
import "@highcharts/dashboards/css/dashboards.css";
import GridLite from "@highcharts/grid-lite";
import "@highcharts/grid-lite/css/grid-lite.css";
import { loadModulesForOptions } from "./module-loader";

// Official ESM plugin connection (per Highcharts docs)
Dashboards.HighchartsPlugin.custom.connectHighcharts(Highcharts);
Dashboards.PluginHandler.addPlugin(Dashboards.HighchartsPlugin);

// Theme name is a runtime value (from env var), so we use import.meta.glob for dynamic loading.
// Highcharts themes self-register via Highcharts.setOptions() when imported — no manual setup needed.
const themeModules = import.meta.glob(
  "/node_modules/highcharts/es-modules/masters/themes/*.src.js",
) as Record<string, () => Promise<unknown>>;

const userOverrides = (window as unknown as Record<string, unknown>).__HIGHCHARTS_OPTIONS__ as Options | undefined;

const themeName =
  (window as unknown as Record<string, unknown>).__HIGHCHARTS_THEME_NAME__ as string | undefined
  ?? "adaptive";

// When user provides full custom options, skip the built-in theme entirely.
// Otherwise, dynamically import the theme module — it self-registers on load.
const themeKey = `/node_modules/highcharts/es-modules/masters/themes/${themeName}.src.js`;
const themeReady = (userOverrides
  ? Promise.resolve()
  : themeModules[themeKey]?.() ?? Promise.resolve()
).then(() => {
  Highcharts.setOptions({
    credits: { enabled: false },
    exporting: {
      enabled: true,
      fallbackToExportServer: false,
      buttons: {
        contextButton: {
          symbolStroke: "var(--highcharts-neutral-color-80, #999)",
          theme: {
            fill: "transparent",
            states: {
              hover: { fill: "var(--highcharts-neutral-color-10, #333)" },
              select: { fill: "var(--highcharts-neutral-color-10, #333)" },
            },
          } as any,
        },
      },
    },
    navigation: {
      buttonOptions: {
        symbolStroke: "var(--highcharts-neutral-color-80, #999)",
        theme: {
          fill: "transparent",
        },
      },
      menuStyle: {
        background: "var(--highcharts-background-color, #1a1a2e)",
        color: "var(--highcharts-neutral-color-80, #ccc)",
      },
      menuItemStyle: {
        color: "var(--highcharts-neutral-color-80, #ccc)",
      },
      menuItemHoverStyle: {
        background: "var(--highcharts-neutral-color-10, #333)",
      },
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

async function renderMapChart(opts: Record<string, unknown>) {
  const container = document.getElementById("root")!;
  container.innerHTML = "";
  container.style.display = "";

  const processed = processOptions(opts);

  try {
    await loadModulesForOptions(processed as Record<string, unknown>);
    delete (processed as any).__chartType;
    (Highcharts as any).mapChart(container, processed as any);
  } catch (e) {
    showError(container, e);
  }
}

async function renderGrid(opts: Record<string, unknown>) {
  const container = document.getElementById("root")!;
  container.innerHTML = "";
  container.style.display = "";

  const { __chartType, ...gridOpts } = opts;

  try {
    GridLite.grid(container, gridOpts as any);
  } catch (e) {
    showError(container, e);
  }
}

function showError(container: HTMLElement, e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  container.innerHTML = `<div style="padding:24px;color:#f85149;font-family:system-ui;font-size:14px;">
    <strong>Chart rendering failed</strong><br><code style="color:#8b949e;font-size:12px;">${msg}</code>
  </div>`;
  console.error("Chart rendering failed:", e);
}

async function renderStockChart(opts: Record<string, unknown>) {
  const root = document.getElementById("root")!;
  root.innerHTML = "";
  root.style.display = "";

  const { __chartType, ...rest } = opts;
  const processed = processOptions(rest);
  await loadModulesForOptions({ ...processed as Record<string, unknown>, __chartType: "stock" });

  try {
    (Highcharts as any).stockChart(root, processed as Options);
  } catch (e) {
    showError(root, e);
  }
}

async function renderGanttChart(opts: Record<string, unknown>) {
  const container = document.getElementById("root")!;
  container.innerHTML = "";
  container.style.display = "";
  const processed = processOptions(opts as Record<string, unknown>);
  delete processed.__chartType;
  try {
    await loadModulesForOptions({ ...opts }); // pass original with __chartType for module detection
    (Highcharts as any).ganttChart(container, processed as any);
  } catch (e) {
    showError(container, e);
  }
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

async function renderDashboard(config: Record<string, unknown>) {
  const root = document.getElementById("root")!;
  root.innerHTML = "";
  root.style.display = "";
  root.style.flexDirection = "";
  root.style.gap = "";
  root.style.padding = "";
  root.style.overflow = "";
  root.style.gridTemplateColumns = "";
  // Dashboards needs the container to have dimensions
  root.style.width = "100%";
  root.style.minHeight = "400px";

  // Normalize gui config: LLMs often send gui.rows shorthand,
  // but Dashboards requires gui.layouts[].rows[]
  const gui = config.gui as Record<string, unknown> | undefined;
  if (gui?.rows && !gui.layouts) {
    gui.layouts = [{ rows: gui.rows }];
    delete gui.rows;
    gui.enabled = true;
  }

  // Load modules for all Highcharts components' chartOptions
  const components = config.components as Array<Record<string, unknown>> | undefined;
  if (components) {
    for (const comp of components) {
      if (comp.chartOptions) {
        try {
          await loadModulesForOptions(comp.chartOptions as Record<string, unknown>);
        } catch (e) {
          console.warn("Module loading for component failed:", e);
        }
      }
    }
  }

  try {
    await Dashboards.board(root, config as any, true);
  } catch (e) {
    showError(root, e);
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

      if (opts.__chartType === "stock") {
        // Stock chart mode (from render_stock_chart)
        await renderStockChart(opts);
      } else if (opts.__chartType === "map") {
        // Map chart mode (from render_map)
        await renderMapChart(opts);
      } else if (opts.__chartType === "gantt") {
        // Gantt chart mode (from render_gantt)
        await renderGanttChart(opts);
      } else if (opts.__chartType === "grid") {
        // Grid mode (from render_grid)
        await renderGrid(opts);
      } else if (opts.components && Array.isArray(opts.components)) {
        // Dashboard mode (from render_dashboard)
        await renderDashboard(opts);
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
