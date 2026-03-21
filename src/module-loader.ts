import Highcharts from "highcharts";
import moduleMapData from "./generated/module-map.json" with { type: "json" };

const { typeToModule } = moduleMapData;

// Use import.meta.glob to create lazy loaders for ALL Highcharts modules at once.
// Vite resolves these through the aliases defined in vite.config.ts.
const allModules = import.meta.glob([
  "/node_modules/highcharts/esm/highcharts-more.src.js",
  "/node_modules/highcharts/esm/highcharts-3d.src.js",
  "/node_modules/highcharts/esm/modules/*.src.js",
]);

/** Build a name→loader map from the glob results */
function buildLoaderMap(): Record<string, () => Promise<unknown>> {
  const loaders: Record<string, () => Promise<unknown>> = {};
  for (const [path, loader] of Object.entries(allModules)) {
    const match = path.match(/\/highcharts\/esm\/(.+)\.src\.js$/);
    if (match) {
      loaders[match[1]] = loader; // e.g. "modules/heatmap" or "highcharts-more"
    }
  }
  return loaders;
}

const loaders = buildLoaderMap();
const loaded = new Set<string>();

// Always load these for common functionality
const ALWAYS_LOAD = [
  "modules/accessibility",
  "modules/drilldown",
  "modules/no-data-to-display",
];

async function loadModule(name: string): Promise<void> {
  if (loaded.has(name) || !loaders[name]) return;
  await loaders[name]();
  loaded.add(name);
}

/**
 * Inspect chart options, determine which modules are needed, and dynamically import them.
 * Safe to call multiple times — modules are only loaded once.
 */
export async function loadModulesForOptions(options: Record<string, unknown>): Promise<void> {
  // Load always-needed modules once
  for (const mod of ALWAYS_LOAD) await loadModule(mod);

  // Collect all chart types from options
  const types = new Set<string>();
  const chart = options.chart as Record<string, unknown> | undefined;
  if (chart?.type && typeof chart.type === "string") types.add(chart.type);

  const series = options.series as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(series)) {
    for (const s of series) {
      if (s.type && typeof s.type === "string") types.add(s.type);
    }
  }

  // Feature-based module detection
  if (options.colorAxis) await loadModule("modules/coloraxis");
  if (options.drilldown) await loadModule("modules/drilldown");

  // Load modules for each type (in dependency order from generated map)
  for (const type of types) {
    const modules = (typeToModule as Record<string, string[]>)[type];
    if (modules) {
      for (const mod of modules) await loadModule(mod);
    }
  }
}
