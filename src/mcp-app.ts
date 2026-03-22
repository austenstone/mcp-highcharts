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

Dashboards.GridPlugin.custom.connectGrid(GridLite);
Dashboards.PluginHandler.addPlugin(Dashboards.GridPlugin);

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
).catch(e => console.warn(`Theme "${themeName}" failed to load:`, e))
.then(() => {
  Highcharts.setOptions({
    credits: { enabled: false },
    exporting: { enabled: false },
    chart: { displayErrors: false },
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

  // Apply MCP SDK theme helpers — sets all --color-* and font CSS vars on document
  if (ctx.theme) applyDocumentTheme(ctx.theme);
  if (ctx.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
  if (ctx.styles?.css?.fonts) applyHostFonts(ctx.styles.css.fonts);

  // Toggle Highcharts adaptive theme light/dark
  // Also set color-scheme so @media (prefers-color-scheme) matches correctly
  if (ctx.theme === "dark") {
    document.documentElement.classList.add("highcharts-dark");
    document.documentElement.classList.remove("highcharts-light");
    document.documentElement.style.colorScheme = "dark";
  } else {
    document.documentElement.classList.add("highcharts-light");
    document.documentElement.classList.remove("highcharts-dark");
    document.documentElement.style.colorScheme = "light";
  }

  const vars = ctx.styles?.variables;
  if (!vars) return;

  const el = document.documentElement;

  // Bridge host tokens → Highcharts CSS variables.
  // Structural colors: backgrounds, text, grid lines, borders
  // These are set as CSS vars so the adaptive theme's defaults are overridden
  // only when the host provides values.
  const structuralMappings: [string, string | undefined][] = [
    // Chart background = secondary (lighter/darker surface for contrast against container)
    ["--highcharts-background-color", vars["--color-background-secondary"]],
    // Dashboard outer wrapper = primary (the base layer)
    ["--highcharts-neutral-color-0", vars["--color-background-primary"]],
    // Dashboard cell/card background = tertiary (distinct from both chart and wrapper)
    ["--highcharts-dashboards-content-background-color", vars["--color-background-tertiary"]],
    ["--highcharts-neutral-color-100", vars["--color-text-primary"]],
    ["--highcharts-neutral-color-80", vars["--color-text-secondary"]],
    ["--highcharts-neutral-color-60", vars["--color-text-tertiary"]],
    ["--highcharts-neutral-color-20", vars["--color-border-secondary"]],
    ["--highcharts-neutral-color-10", vars["--color-border-tertiary"]],
    ["--highcharts-neutral-color-5", vars["--color-background-secondary"]],
  ];

  // Series palette: leave to the adaptive theme by default.
  // The adaptive theme's 10 colors are designed for contrast.

  for (const [hcVar, value] of structuralMappings) {
    if (value) el.style.setProperty(hcVar, value);
    else el.style.removeProperty(hcVar);
  }

  // Font family sync
  const fontFamily = vars["--font-sans"];
  if (fontFamily) {
    Highcharts.setOptions({ chart: { style: { fontFamily } } });
  }
}

function applyThemeAndRedraw(ctx: McpUiHostContext | null | undefined) {
  if (!userOverrides) {
    applyHostTheme(ctx);
    // Force charts to re-read CSS variables by triggering a full update
    Highcharts.charts.forEach(c => {
      if (!c) return;
      c.update({}, true, true);
    });
  }
}

/** Set a minimum chart height if not explicitly specified */
function ensureMinHeight(opts: Record<string, unknown>, minHeight: number) {
  const chart = (opts.chart || {}) as Record<string, unknown>;
  if (!chart.height) {
    chart.height = minHeight;
    opts.chart = chart;
  }
}

/**
 * Fetch map TopoJSON from Highcharts CDN by map key.
 * Map keys follow the pattern: "custom/world", "countries/us/us-all", "countries/gb/gb-all", etc.
 * @see https://code.highcharts.com/mapdata/
 */
const MAP_CACHE_MAX = 20;
const mapCache = new Map<string, unknown>();
async function fetchMapData(mapKey: string): Promise<unknown> {
  if (mapCache.has(mapKey)) return mapCache.get(mapKey)!;
  const url = `https://code.highcharts.com/mapdata/${mapKey}.topo.json`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch map "${mapKey}" from CDN (${resp.status})`);
  const data = await resp.json();
  // Evict oldest entry if cache is full
  if (mapCache.size >= MAP_CACHE_MAX) {
    const oldest = mapCache.keys().next().value!;
    mapCache.delete(oldest);
  }
  mapCache.set(mapKey, data);
  return data;
}

/**
 * Resolve map data for all series in a map chart.
 * If a series has `mapData` as a string (map key), fetch it from CDN.
 * If `chart.map` is a string, fetch it as the base map.
 * If no mapData is provided anywhere, defaults to "custom/world".
 */
async function resolveMapData(opts: Record<string, unknown>): Promise<void> {
  // Handle chart.map as string
  const chart = opts.chart as Record<string, unknown> | undefined;
  if (chart?.map && typeof chart.map === "string") {
    chart.map = await fetchMapData(chart.map);
  }

  const series = opts.series as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(series)) return;

  let hasMapData = !!chart?.map;

  for (const s of series) {
    if (typeof s.mapData === "string") {
      s.mapData = await fetchMapData(s.mapData);
      hasMapData = true;
    } else if (s.mapData && typeof s.mapData === "object") {
      hasMapData = true;
    }
  }

  // If no map data provided anywhere, fetch world map as default for the first map series
  if (!hasMapData) {
    const worldMap = await fetchMapData("custom/world");
    if (chart) {
      chart.map = worldMap;
    } else {
      opts.chart = { map: worldMap };
    }
  }
}

/** Reset the root container for a fresh render */
function prepareContainer(container: HTMLElement) {
  // Destroy all existing chart instances — we only ever have one at a time
  for (let i = Highcharts.charts.length - 1; i >= 0; i--) {
    Highcharts.charts[i]?.destroy();
  }
  container.innerHTML = "";
  container.style.display = "";
}

async function renderMapChart(opts: Record<string, unknown>) {
  const container = document.getElementById("root")!;
  prepareContainer(container);
  const { __chartType: _, ...rest } = opts;
  ensureMinHeight(rest, 500);
  const processed = rest as Options & Record<string, unknown>;

  try {
    await loadModulesForOptions({ ...processed as Record<string, unknown>, __chartType: "map" });
    await resolveMapData(processed as Record<string, unknown>);
    Highcharts.mapChart(container, processed as Options);
  } catch (e) {
    showError(container, e);
  }
}

async function renderGrid(opts: Record<string, unknown>) {
  const container = document.getElementById("root")!;
  prepareContainer(container);
  const { __chartType: _, ...gridOpts } = opts;

  try {
    GridLite.grid(container, gridOpts as any);
  } catch (e) {
    showError(container, e);
  }
}

// ── Highcharts error interception ──
// Import the debugger module to get rich, human-readable error messages
// for every Highcharts error code. The module also renders errors visually on charts.
import "highcharts/modules/debugger";

const _pendingErrors: string[] = [];

// Access the error messages dictionary from the debugger module
const errorMessages = (Highcharts as any).errorMessages as Record<number, { text: string; enduser?: string }> | undefined;

/** Strip HTML tags from Highcharts error messages for plain-text LLM context */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(h1|p|ul|li|ol|code|a|b|strong|em|span)[^>]*>/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

Highcharts.addEvent(Highcharts, 'displayError', function (e: {
  code: number | string;
  message: string;
  params?: Record<string, unknown>;
  chart?: unknown;
}) {
  const code = e.code;
  const parts: string[] = [];

  // Get the rich error description from the debugger module
  const errInfo = typeof code === 'number' && errorMessages?.[code];
  if (errInfo) {
    parts.push(`Highcharts error #${code}: ${stripHtml(errInfo.text)}`);
  } else {
    parts.push(`Highcharts error #${code}: https://www.highcharts.com/errors/${code}/`);
  }

  // Include the specific params that caused the error
  if (e.params) {
    parts.push('Error context:');
    for (const [key, value] of Object.entries(e.params)) {
      parts.push(`  ${key}: ${value}`);
    }
  }
  _pendingErrors.push(parts.join('\n'));

  // Suppress the debugger module's visual error overlay on the chart
  return false;
});

/** Drain collected Highcharts errors and return them (empty array if none). */
function drainHighchartsErrors(): string[] {
  return _pendingErrors.splice(0);
}

function showError(container: HTMLElement, e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  prepareContainer(container);
  const div = document.createElement("div");
  div.style.cssText = "padding:24px;color:#f85149;font-family:system-ui;font-size:14px;";
  const strong = document.createElement("strong");
  strong.textContent = "Chart rendering failed";
  const code = document.createElement("code");
  code.style.cssText = "color:#8b949e;font-size:12px;";
  code.textContent = msg;
  div.appendChild(strong);
  div.appendChild(document.createElement("br"));
  div.appendChild(code);
  container.appendChild(div);
  console.error("Chart rendering failed:", e);

  // Report the error + any Highcharts errors to the LLM
  const hcErrors = drainHighchartsErrors();
  const parts = [`Chart rendering failed: ${msg}`];
  if (hcErrors.length > 0) {
    parts.push(`\nHighcharts errors:\n${hcErrors.join('\n---\n')}`);
  }
  sendChartContext(parts.join('\n'));
}

async function renderStockChart(opts: Record<string, unknown>) {
  const container = document.getElementById("root")!;
  prepareContainer(container);
  const { __chartType: _, ...rest } = opts;
  ensureMinHeight(rest, 600);
  const processed = rest as Options & Record<string, unknown>;

  try {
    await loadModulesForOptions({ ...processed as Record<string, unknown>, __chartType: "stock" });
    Highcharts.stockChart(container, processed as Options);
  } catch (e) {
    showError(container, e);
  }
}

async function renderGanttChart(opts: Record<string, unknown>) {
  const container = document.getElementById("root")!;
  prepareContainer(container);
  const { __chartType: _, ...rest } = opts;
  ensureMinHeight(rest, 500);
  const processed = rest as Options & Record<string, unknown>;

  try {
    await loadModulesForOptions({ ...processed as Record<string, unknown>, __chartType: "gantt" });
    Highcharts.ganttChart(container, processed as Options);
  } catch (e) {
    showError(container, e);
  }
}

async function renderSingleChart(opts: Options & Record<string, unknown>) {
  const container = document.getElementById("root")!;
  prepareContainer(container);
  try {
    await loadModulesForOptions(opts as Record<string, unknown>);
    Highcharts.chart(container, opts);
  } catch (e) {
    showError(container, e);
  }
}

async function renderDashboard(config: Record<string, unknown>) {
  const root = document.getElementById("root")!;
  prepareContainer(root);
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

/** Extract chart options from a tool result */
function extractOptions(result: any): Record<string, unknown> | undefined {
  if (result.structuredContent && typeof result.structuredContent === "object") {
    return result.structuredContent as Record<string, unknown>;
  }
  return undefined;
}

/** Get series array from options, safely */
function getSeries(opts: Record<string, unknown>): Array<Record<string, unknown>> {
  return (opts.series as Array<Record<string, unknown>>) || [];
}

/** Get title text from options */
function getTitle(opts: Record<string, unknown>): string {
  return (opts.title as any)?.text || "";
}

/** Count data points across all series */
function countDataPoints(series: Array<Record<string, unknown>>): number {
  return series.reduce((n, s) => n + (Array.isArray(s.data) ? s.data.length : 0), 0);
}

/** Route options to the appropriate renderer and send context */
async function renderByType(opts: Record<string, unknown>): Promise<void> {
  // Clear any stale errors from previous renders
  _pendingErrors.length = 0;

  const series = getSeries(opts);
  let summary = "";

  switch (opts.__chartType) {
    case "stock": {
      await renderStockChart(opts);
      const types = [...new Set(series.map(s => (s.type as string) || "line"))].join(", ");
      summary = `Rendered stock chart "${getTitle(opts)}" with ${series.length} series (${types}).`;
      break;
    }
    case "map": {
      const mapKey = typeof (opts.chart as any)?.map === "string" ? (opts.chart as any).map : "custom/world";
      await renderMapChart(opts);
      summary = `Rendered map chart (map: ${mapKey}) with ${countDataPoints(series)} data points across ${series.length} series.`;
      break;
    }
    case "gantt": {
      await renderGanttChart(opts);
      summary = `Rendered Gantt chart with ${countDataPoints(series)} tasks across ${series.length} series.`;
      break;
    }
    case "grid": {
      await renderGrid(opts);
      const cols = Array.isArray((opts as any).columns) ? (opts as any).columns.length : 0;
      const dataObj = (opts as any).data?.columns as Record<string, unknown[]> | undefined;
      const rows = dataObj ? Math.max(0, ...Object.values(dataObj).map(a => Array.isArray(a) ? a.length : 0)) : 0;
      summary = `Rendered data grid with ${rows} rows and ${cols} columns.`;
      break;
    }
    default: {
      if (opts.components && Array.isArray(opts.components)) {
        await renderDashboard(opts);
        const types = [...new Set(opts.components.map((c: any) => (c.type as string) || "unknown"))].join(", ");
        summary = `Rendered dashboard with ${opts.components.length} components (${types}).`;
      } else {
        await renderSingleChart(opts as Options & Record<string, unknown>);
        const chartType = (opts.chart as any)?.type || series[0]?.type || "line";
        summary = `Rendered ${chartType} chart "${getTitle(opts)}" with ${series.length} series.`;
      }
    }
  }

  // Combine summary + any Highcharts errors into a single context update
  const errors = drainHighchartsErrors();
  if (errors.length > 0) {
    summary += `\n\n⚠ Highcharts reported ${errors.length} error(s):\n\n${errors.join('\n\n---\n\n')}`;
  }
  sendChartContext(summary);
}

let appInstance: InstanceType<typeof App> | null = null;

/** Send chart context back to the LLM — gated on host capability */
let _canUpdateContext = false;
function sendChartContext(description: string) {
  if (!_canUpdateContext || !appInstance) return;

  appInstance.updateModelContext({
    content: [{ type: "text", text: description }],
  }).catch(() => {});
}

async function init() {
  await themeReady;

  const app = new App(
    { name: "Highcharts MCP App", version: "2.2.0" },
    {},
  );
  appInstance = app;

  app.ontoolresult = async (result) => {
    const opts = extractOptions(result);
    if (!opts) return;

    try {
      await renderByType(opts);
    } catch (e) {
      showError(document.getElementById("root")!, e instanceof Error ? e : new Error("Render failed"));
    }
  };

  app.onhostcontextchanged = (ctx) => {
    applyThemeAndRedraw(ctx);
  };

  app.onerror = console.error;

  await app.connect(new PostMessageTransport(window.parent, window.parent));

  // Check host capabilities — only enable features the host supports
  const caps = app.getHostCapabilities?.() ?? {};
  console.debug("[mcp-highcharts] host capabilities:", caps);

  // Enable updateModelContext if host supports it
  _canUpdateContext = !!caps.updateModelContext;

  // ── openLink: intercept external link clicks ──
  if (caps.openLinks) {
    document.addEventListener('click', (e) => {
      const anchor = (e.target as HTMLElement).closest('a[href]');
      if (anchor) {
        const href = anchor.getAttribute('href');
        if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
          e.preventDefault();
          appInstance?.openLink({ url: href }).catch(() => {});
        }
      }
    });
  }

  // Apply initial host theme
  applyThemeAndRedraw(app.getHostContext());
}

init().catch(console.error);
