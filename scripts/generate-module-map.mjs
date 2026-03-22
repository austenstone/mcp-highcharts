#!/usr/bin/env node
/**
 * Generate type→module mapping using Highcharts' actual runtime registry.
 * 
 * Uses es-modules/masters/ (granular ESM) — the same module structure
 * Highcharts uses internally. Imports each module, diffs seriesTypes
 * before/after, and records which module provides which chart types.
 *
 * @see https://www.highcharts.com/docs/getting-started/installation-with-esm
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const HC_ESM = path.join(ROOT, "node_modules/highcharts/es-modules/masters");
const MODULES_DIR = path.join(HC_ESM, "modules");
const THEMES_DIR = path.join(HC_ESM, "themes");
const GENERATED_DIR = path.join(ROOT, "src/generated");

// Convert absolute paths to file:// URLs for cross-platform ESM import compatibility
const toURL = (p) => pathToFileURL(p).href;

fs.mkdirSync(GENERATED_DIR, { recursive: true });

// Import Highcharts from es-modules/masters/ (same entry point used at runtime)
const Highcharts = (await import(toURL(path.join(HC_ESM, "highcharts.src.js")))).default;

// Module load order (deps before dependents)
const LOAD_ORDER = [
  ["highcharts-more", path.join(HC_ESM, "highcharts-more.src.js")],
  ["highcharts-3d", path.join(HC_ESM, "highcharts-3d.src.js")],
];

// Scan all module files
const moduleFiles = fs.readdirSync(MODULES_DIR)
  .filter(f => f.endsWith(".src.js"))
  .map(f => f.replace(".src.js", ""));

// Dependency graph — modules that must be loaded before others
const DEPS = {
  "tilemap": ["heatmap"],
  "arc-diagram": ["sankey"],
  "dependency-wheel": ["sankey"],
  "organization": ["sankey"],
  "solid-gauge": ["../highcharts-more"],
  "cylinder": ["../highcharts-3d"],
  "funnel3d": ["../highcharts-3d", "cylinder"],
  "pyramid3d": ["../highcharts-3d", "cylinder", "funnel3d"],
  "export-data": ["exporting"],
  "offline-exporting": ["exporting"],
  "lollipop": ["dumbbell"],
};

// Build load order: root modules first, then topo-sort modules
const loaded = new Set();
const orderedModules = [];

function ensureLoaded(modName) {
  if (loaded.has(modName)) return;
  const deps = DEPS[modName] || [];
  for (const dep of deps) {
    if (dep.startsWith("../")) continue;
    ensureLoaded(dep);
  }
  loaded.add(modName);
  orderedModules.push(modName);
}

for (const mod of moduleFiles) ensureLoaded(mod);

for (const mod of orderedModules) {
  LOAD_ORDER.push([`modules/${mod}`, path.join(MODULES_DIR, `${mod}.src.js`)]);
}

// ── Run: import each module, diff seriesTypes ──

const coreTypes = [...Object.keys(Highcharts.seriesTypes)].sort();
const typeToProvider = {};

for (const [name, filePath] of LOAD_ORDER) {
  if (!fs.existsSync(filePath)) continue;
  const before = new Set(Object.keys(Highcharts.seriesTypes));
  try {
    await import(toURL(filePath));
  } catch (e) {
    continue;
  }
  const added = Object.keys(Highcharts.seriesTypes).filter(t => !before.has(t));
  for (const t of added) typeToProvider[t] = name;
  if (added.length) console.log(`  ${name} → ${added.join(", ")}`);
}

// ── Build typeToModule with dependency chains ──

const MODULE_DEPS = {
  "modules/arc-diagram": ["modules/sankey"],
  "modules/dependency-wheel": ["modules/sankey"],
  "modules/organization": ["modules/sankey"],
  "modules/tilemap": ["modules/heatmap"],
  "modules/solid-gauge": ["highcharts-more"],
  "modules/cylinder": ["highcharts-3d"],
  "modules/funnel3d": ["highcharts-3d", "modules/cylinder"],
  "modules/pyramid3d": ["highcharts-3d", "modules/cylinder", "modules/funnel3d"],
  "modules/export-data": ["modules/exporting"],
  "modules/offline-exporting": ["modules/exporting"],
  "modules/lollipop": ["modules/dumbbell"],
};

const typeToModule = {};
for (const [type, provider] of Object.entries(typeToProvider)) {
  const deps = MODULE_DEPS[provider] || [];
  typeToModule[type] = [...deps, provider];
}

// ── Gather metadata ──

const availableModules = [
  ...["highcharts-more", "highcharts-3d"].filter(m => fs.existsSync(path.join(HC_ESM, `${m}.src.js`))),
  ...moduleFiles.map(m => `modules/${m}`),
].sort();

const availableThemes = fs.readdirSync(THEMES_DIR)
  .filter(f => f.endsWith(".src.js"))
  .map(f => f.replace(".src.js", ""))
  .sort();

const chartTypes = [...new Set([...coreTypes, ...Object.keys(typeToProvider)])].sort();

// ── Write outputs ──

const moduleMap = {
  typeToModule,
  availableModules,
  availableThemes,
  chartTypes,
  coreTypes,
};

fs.writeFileSync(
  path.join(GENERATED_DIR, "module-map.json"),
  JSON.stringify(moduleMap, null, 2) + "\n"
);

console.log(`\n✅ module-map.json: ${Object.keys(typeToModule).length} type mappings, ${chartTypes.length} chart types, ${availableModules.length} modules, ${availableThemes.length} themes`);
