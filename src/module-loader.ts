import moduleMapData from "./generated/module-map.json" with { type: "json" };

const { typeToModule } = moduleMapData;

// Use import.meta.glob to create lazy loaders for ALL Highcharts modules.
// Paths use es-modules/masters/ (granular ESM) matching Highcharts' own repo structure.
const allModules = import.meta.glob([
  "/node_modules/highcharts/es-modules/masters/highcharts-more.src.js",
  "/node_modules/highcharts/es-modules/masters/highcharts-3d.src.js",
  "/node_modules/highcharts/es-modules/masters/modules/*.src.js",
  "/node_modules/highcharts/es-modules/masters/indicators/*.src.js",
]);

/** Build a name→loader map from the glob results */
function buildLoaderMap(): Record<string, () => Promise<unknown>> {
  const loaders: Record<string, () => Promise<unknown>> = {};
  for (const [path, loader] of Object.entries(allModules)) {
    const match = path.match(/\/es-modules\/masters\/(.+)\.src\.js$/);
    if (match) {
      loaders[match[1]] = loader; // e.g. "modules/stock", "indicators/rsi", "highcharts-more"
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
  "modules/data",
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
  if (options.annotations) await loadModule("modules/annotations-advanced");
  if (options.sonification) await loadModule("modules/sonification");
  if (options.boost) await loadModule("modules/boost");
  if ((chart as any)?.options3d) await loadModule("highcharts-3d");

  // Pattern fill — detect pattern usage in colors or series color values
  const colorsStr = JSON.stringify(options.colors ?? options.series ?? "");
  if (colorsStr.includes('"pattern"') || colorsStr.includes('"patternOptions"')) {
    await loadModule("modules/pattern-fill");
  }

  // Boost heuristic — auto-enable for large datasets
  if (!options.boost && Array.isArray(series)) {
    const maxPoints = Math.max(0, ...series.map(s =>
      Array.isArray(s.data) ? s.data.length : 0
    ));
    if (maxPoints > 10000) await loadModule("modules/boost");
  }

  // Stock chart detection
  if (options.__chartType === "stock" || options.navigator || options.rangeSelector || options.stockTools) {
    await loadModule("modules/stock");
  }

  // Map chart detection
  if (options.__chartType === "map" || options.mapNavigation || options.mapView) {
    await loadModule("modules/map");
  }

  // Gantt chart detection
  if (options.__chartType === "gantt") {
    await loadModule("modules/gantt");
  }

  // Load indicator modules if any series reference them
  if (Array.isArray(series)) {
    for (const s of series) {
      const t = s.type as string | undefined;
      if (t && loaders[`indicators/${t}`]) {
        await loadModule("indicators/indicators");
        await loadModule(`indicators/${t}`);
      }
    }
  }

  // Load modules for each type (in dependency order from generated map)
  for (const type of types) {
    const modules = (typeToModule as Record<string, string[]>)[type];
    if (modules) {
      for (const mod of modules) await loadModule(mod);
    }
  }
}
