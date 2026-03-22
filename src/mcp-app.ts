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

// ── Highcharts error interception ──
// Collect errors during rendering and feed them back to the LLM
const renderErrors: Array<{ code: number; message: string }> = [];

Highcharts.addEvent(Highcharts, "displayError", (e: any) => {
  const code = e?.code ?? e?.message ?? "unknown";
  const msg = typeof e === "object" && e.message ? e.message : `Highcharts error #${code}`;
  renderErrors.push({ code: Number(code), message: msg });
  console.warn(`[Highcharts error #${code}]`, msg);
});
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
  // Host semantic tokens (ring, info, success) tend to be too similar
  // (e.g. ring-primary and text-info are both blue in most VS Code themes).
  // Users can override via colorMode or explicit colors[] in chart options.

  for (const [hcVar, value] of structuralMappings) {
    if (value) el.style.setProperty(hcVar, value);
    else el.style.removeProperty(hcVar);
  }

  // Font family sync
  const opts: Highcharts.Options = {};
  const fontFamily = vars["--font-sans"];
  if (fontFamily) {
    opts.chart = { style: { fontFamily } };
  }
  if (Object.keys(opts).length) Highcharts.setOptions(opts);
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
 * Apply a color palette by setting Highcharts CSS variables (--highcharts-color-0 through -9).
 * This is the correct way to theme Highcharts — CSS variables are picked up everywhere
 * (chart, legend, data labels, tooltips, styled mode, etc.)
 */
function applyColorPalette(colors: string[]) {
  const el = document.documentElement;
  // Apply provided colors and clear any stale vars beyond the palette length
  const maxSlots = Math.max(colors.length, 10);
  for (let i = 0; i < maxSlots; i++) {
    if (i < colors.length) {
      el.style.setProperty(`--highcharts-color-${i}`, colors[i]);
    } else {
      el.style.removeProperty(`--highcharts-color-${i}`);
    }
  }
}

/**
 * Generate a monochrome color palette from a base color using Highcharts color utilities.
 * Produces evenly-spaced brightness variants of a single hue.
 */
function generateMonochromePalette(baseColor: string, count = 10): string[] {
  const colors: string[] = [];
  const range = 0.6;
  const start = -(range / 2);
  for (let i = 0; i < count; i++) {
    const offset = start + (range * i) / (count - 1);
    colors.push(Highcharts.color(baseColor).brighten(offset).get() as string);
  }
  return colors;
}

const MONOCHROME_PRESETS: Record<string, string> = {
  monochrome: "#7cb5ec",
  "monochrome-blue": "#4572A7",
  "monochrome-green": "#2b8c5a",
  "monochrome-purple": "#7b68ee",
  "monochrome-red": "#c0392b",
  "monochrome-orange": "#e67e22",
  "monochrome-teal": "#1abc9c",
};

function processOptions(opts: Record<string, unknown>): Options & Record<string, unknown> {
  const processed = opts as Options & Record<string, unknown>;
  if (typeof processed.title === "string") processed.title = { text: processed.title };
  if (typeof processed.subtitle === "string") processed.subtitle = { text: processed.subtitle };

  // Color mode: generate palette via CSS variables using Highcharts color utilities
  const colorMode = processed.colorMode as string | undefined;
  if (colorMode) {
    delete processed.colorMode;
    const preset = MONOCHROME_PRESETS[colorMode];
    if (preset) {
      applyColorPalette(generateMonochromePalette(preset));
    } else if (colorMode.startsWith("#") || colorMode.startsWith("rgb")) {
      applyColorPalette(generateMonochromePalette(colorMode));
    }
  }

  // If explicit colors array provided, also apply via CSS variables
  if (Array.isArray(processed.colors) && processed.colors.length > 0) {
    applyColorPalette(processed.colors as string[]);
    delete processed.colors; // Don't double-set via options AND CSS vars
  }

  return processed;
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

/** Destroy any Highcharts chart instances rendered in the given container */
function destroyExistingCharts(container: HTMLElement) {
  for (let i = Highcharts.charts.length - 1; i >= 0; i--) {
    const chart = Highcharts.charts[i];
    if (chart && ((chart as any).renderTo === container || container.contains((chart as any).renderTo))) {
      chart.destroy();
    }
  }
}

async function renderMapChart(opts: Record<string, unknown>) {
  const container = document.getElementById("root")!;
  destroyExistingCharts(container);
  container.innerHTML = "";
  container.style.display = "";

  ensureMinHeight(opts, 500);
  const processed = processOptions(opts);

  try {
    await loadModulesForOptions(processed as Record<string, unknown>);
    await resolveMapData(processed as Record<string, unknown>);
    delete (processed as any).__chartType;
    Highcharts.mapChart(container, processed as Options);
  } catch (e) {
    showError(container, e);
  }
}

async function renderGrid(opts: Record<string, unknown>) {
  const container = document.getElementById("root")!;
  destroyExistingCharts(container);
  container.innerHTML = "";
  container.style.display = "";

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
});

/** Drain collected Highcharts errors and return them (empty array if none). */
function drainHighchartsErrors(): string[] {
  return _pendingErrors.splice(0);
}

function showError(container: HTMLElement, e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  destroyExistingCharts(container);
  container.innerHTML = "";
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
  const root = document.getElementById("root")!;
  destroyExistingCharts(root);
  root.innerHTML = "";
  root.style.display = "";

  const { __chartType: _ct, ...rest } = opts;
  ensureMinHeight(rest, 600);
  const processed = processOptions(rest);

  try {
    await loadModulesForOptions({ ...processed as Record<string, unknown>, __chartType: "stock" });
    Highcharts.stockChart(root, processed as Options);
  } catch (e) {
    showError(root, e);
  }
}

async function renderGanttChart(opts: Record<string, unknown>) {
  const container = document.getElementById("root")!;
  destroyExistingCharts(container);
  container.innerHTML = "";
  container.style.display = "";
  ensureMinHeight(opts, 500);
  try {
    await loadModulesForOptions(opts); // load modules before stripping __chartType
    const processed = processOptions({ ...opts });
    delete processed.__chartType;
    Highcharts.ganttChart(container, processed as Options);
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
      destroyExistingCharts(container);
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
  destroyExistingCharts(root);
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

/** Extract chart options from a tool result (structuredContent or text fallback) */
function extractOptions(result: any): Record<string, unknown> | undefined {
  if (result.structuredContent && typeof result.structuredContent === "object") {
    return result.structuredContent as Record<string, unknown>;
  }
  const textContent = result.content?.find((c: any) => c.type === "text") as { text: string } | undefined;
  if (!textContent?.text) return undefined;
  try {
    return JSON.parse(textContent.text) as Record<string, unknown>;
  } catch {
    showError(document.getElementById("root")!, new Error("Failed to parse chart data"));
    return undefined;
  }
}

/** Get series array from options, safely */
function getSeries(opts: Record<string, unknown>): Array<Record<string, unknown>> {
  return (opts.series as Array<Record<string, unknown>>) || [];
}

/** Get title text from options (handles string shorthand and object) */
function getTitle(opts: Record<string, unknown>): string {
  return typeof opts.title === "string" ? opts.title : (opts.title as any)?.text || "";
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
let streamDebounce: ReturnType<typeof setTimeout>;

/** Send chart context back to the LLM — gated on host capability */
let _canUpdateContext = false;
function sendChartContext(description: string) {
  if (!_canUpdateContext || !appInstance) return;

  // Include any Highcharts errors collected during rendering
  let text = description;
  if (renderErrors.length > 0) {
    const errText = renderErrors
      .map(e => `⚠️ Highcharts error #${e.code}: ${e.message}`)
      .join("\n");
    text += "\n\nErrors during rendering:\n" + errText;
    renderErrors.length = 0; // Clear for next render
  }

  appInstance.updateModelContext({
    content: [{ type: "text", text }],
  }).catch(() => {});
}

async function init() {
  await themeReady;

  const app = new App(
    { name: "Highcharts MCP App", version: "2.0.0" },
    {},
  );
  appInstance = app;

  app.ontoolresult = async (result) => {
    // Cancel any pending streaming preview to avoid overwriting the final render
    clearTimeout(streamDebounce);

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

  // ── ontoolinputpartial: streaming preview ──
  app.ontoolinputpartial = (partialArgs) => {
    try {
      const partial = partialArgs.arguments;
      if (!partial) return;

      // Only attempt streaming render for single charts (render_chart)
      const opts = partial as Record<string, unknown>;
      if (opts.__chartType || opts.components) return; // skip stock/map/gantt/dashboard/grid

      if (opts.series && Array.isArray(opts.series)) {
        clearTimeout(streamDebounce);
        streamDebounce = setTimeout(() => {
          renderSingleChart(opts as any).catch(() => {});
        }, 300);
      }
    } catch {
      // Partial args may be incomplete — expected, just wait
    }
  };

  // Apply initial host theme
  applyThemeAndRedraw(app.getHostContext());
}

init().catch(console.error);
