/**
 * Auto-generates module map + chart types from the installed Highcharts package.
 *
 * Outputs:
 *   src/generated/module-map.json   — type→module deps, available modules/themes
 *   src/generated/chart-types.json  — full enum of chart types
 *   src/highcharts-meta.json        — backward-compat (optionsKeys + chartTypes)
 *
 * Run: npx tsx scripts/generate-schema.ts
 */
import ts from "typescript";
import fs from "node:fs";
import path from "node:path";

const HC_ESM = path.resolve("node_modules/highcharts/esm");
const HIGHCHARTS_DTS = path.resolve("node_modules/highcharts/highcharts.d.ts");
const GENERATED_DIR = path.resolve("src/generated");

fs.mkdirSync(GENERATED_DIR, { recursive: true });

// ─── 1. Scan modules for registerSeriesType calls ───────────────────────────

/** Scan a file for registerSeriesType('typename' calls, return type names */
function extractRegisteredTypes(filePath: string): string[] {
  const src = fs.readFileSync(filePath, "utf-8");
  const types: string[] = [];
  const re = /registerSeriesType\(['"]([a-z0-9-]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) types.push(m[1]);
  return types;
}

/** Scan a file for seriesTypes references to infer which other series types this module depends on */
function extractSeriesTypeDeps(filePath: string, ownTypes: Set<string>): string[] {
  const src = fs.readFileSync(filePath, "utf-8");
  // Strip block and line comments
  const stripped = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*/g, "");
  const deps = new Set<string>();
  const SKIP = new Set([...CORE_TYPES, "prototype", "pointClass", "series"]);

  // Match: seriesTypes.xxx (dot access) — but skip ternary checks like seriesTypes.xxx ?
  for (const m of stripped.matchAll(/seriesTypes\.([a-z][a-z0-9]*)\b(?!\s*\?)/g)) {
    const t = m[1];
    if (!SKIP.has(t) && !ownTypes.has(t)) deps.add(t);
  }

  // Match: const { xxx: ... } = (...).seriesTypes;
  // Look for destructuring before .seriesTypes
  for (const m of stripped.matchAll(/const\s*\{([^}]+)\}\s*=\s*[^;]*\.seriesTypes\b/g)) {
    for (const km of m[1].matchAll(/\b([a-z][a-z0-9]*)\s*[,:}]/g)) {
      const t = km[1];
      if (!SKIP.has(t) && !ownTypes.has(t)) deps.add(t);
    }
  }

  // Match: seriesTypes: { key: ... } (nested destructuring — handle nested braces)
  for (const m of stripped.matchAll(/seriesTypes\s*:\s*\{/g)) {
    const start = m.index! + m[0].length;
    let depth = 1;
    let i = start;
    while (i < stripped.length && depth > 0) {
      if (stripped[i] === "{") depth++;
      else if (stripped[i] === "}") depth--;
      i++;
    }
    const inner = stripped.slice(start, i - 1);
    // Extract top-level keys only (depth=0 within this block)
    let d = 0;
    const keyRe = /\b([a-z][a-z0-9]*)\s*:/g;
    let prevEnd = 0;
    for (const km of inner.matchAll(keyRe)) {
      // Count braces between prevEnd and this match to track depth
      const seg = inner.slice(prevEnd, km.index);
      for (const c of seg) { if (c === "{") d++; else if (c === "}") d--; }
      if (d === 0) {
        const t = km[1];
        if (!SKIP.has(t) && !ownTypes.has(t)) deps.add(t);
      }
      prevEnd = km.index! + km[0].length;
    }
  }

  return [...deps];
}

// Core types built into highcharts.js — no module needed
const CORE_TYPES = new Set([
  "line", "area", "spline", "areaspline", "column", "bar", "scatter", "pie",
]);

// Map from type name → which module file provides it
const typeToProvider = new Map<string, string>(); // type → module name
const typeToModule = new Map<string, string[]>();  // type → ordered deps

// Scan highcharts-more
const moreTypes = extractRegisteredTypes(path.join(HC_ESM, "highcharts-more.src.js"));
for (const t of moreTypes) typeToProvider.set(t, "highcharts-more");

// Scan highcharts-3d
const threeDTypes = extractRegisteredTypes(path.join(HC_ESM, "highcharts-3d.src.js"));
for (const t of threeDTypes) typeToProvider.set(t, "highcharts-3d");

// Scan all modules
const modulesDir = path.join(HC_ESM, "modules");
const moduleFiles = fs.readdirSync(modulesDir).filter(f => f.endsWith(".src.js"));

// Bundle modules that aggregate many types — prefer standalone modules over these
const BUNDLE_MODULES = new Set(["modules/map", "modules/stock"]);

for (const file of moduleFiles) {
  const moduleName = `modules/${file.replace(".src.js", "")}`;
  const filePath = path.join(modulesDir, file);
  const types = extractRegisteredTypes(filePath);
  for (const t of types) {
    // Don't let bundle modules overwrite standalone providers
    if (typeToProvider.has(t) && BUNDLE_MODULES.has(moduleName)) continue;
    typeToProvider.set(t, moduleName);
  }
}

// Now build dependency chains by analyzing seriesTypes references
for (const [type, provider] of typeToProvider) {
  if (CORE_TYPES.has(type)) continue;

  const filePath = provider.startsWith("modules/")
    ? path.join(modulesDir, provider.replace("modules/", "") + ".src.js")
    : path.join(HC_ESM, provider + ".src.js");

  const ownTypes = new Set(extractRegisteredTypes(filePath));
  const depTypes = extractSeriesTypeDeps(filePath, ownTypes);

  // Resolve dep types to their provider modules
  const depModules: string[] = [];
  for (const dt of depTypes) {
    const depProvider = typeToProvider.get(dt);
    if (depProvider && depProvider !== provider) {
      if (!depModules.includes(depProvider)) depModules.push(depProvider);
    }
  }

  // Special cases: solid-gauge needs highcharts-more (gauge type)
  if (provider === "modules/solid-gauge" && !depModules.includes("highcharts-more")) {
    depModules.unshift("highcharts-more");
  }

  // Add the provider itself at the end
  depModules.push(provider);
  typeToModule.set(type, depModules);
}

// Types from highcharts-more just need highcharts-more
for (const t of moreTypes) {
  if (!typeToModule.has(t)) typeToModule.set(t, ["highcharts-more"]);
}
for (const t of threeDTypes) {
  if (!typeToModule.has(t)) typeToModule.set(t, ["highcharts-3d"]);
}

// Resolve transitive deps: if type A needs module X which provides type B,
// and type B needs modules [Y, X], then type A needs [Y, X, ...its own deps]
// Build module→types-it-registers map for reverse lookup
const moduleToTypes = new Map<string, string[]>();
for (const [t, prov] of typeToProvider) {
  if (!moduleToTypes.has(prov)) moduleToTypes.set(prov, []);
  moduleToTypes.get(prov)!.push(t);
}

function resolveTransitiveDeps(type: string, visited = new Set<string>()): string[] {
  if (visited.has(type)) return [];
  visited.add(type);
  const modules = typeToModule.get(type);
  if (!modules) return [];
  
  const result: string[] = [];
  for (const mod of modules) {
    // For each dep module (not the provider itself), check if its types have deps
    const modTypes = moduleToTypes.get(mod) || [];
    for (const mt of modTypes) {
      if (mt !== type) {
        const transitive = resolveTransitiveDeps(mt, visited);
        for (const td of transitive) {
          if (!result.includes(td)) result.push(td);
        }
      }
    }
    if (!result.includes(mod)) result.push(mod);
  }
  return result;
}

// Re-resolve all type→module mappings with transitive deps
for (const [type] of typeToModule) {
  const resolved = resolveTransitiveDeps(type);
  if (resolved.length > 0) typeToModule.set(type, resolved);
}

// ─── 2. Collect all available modules and themes ────────────────────────────

const availableModules = moduleFiles
  .map(f => `modules/${f.replace(".src.js", "")}`)
  .sort();

const themesDir = path.join(HC_ESM, "themes");
const availableThemes = fs.readdirSync(themesDir)
  .filter(f => f.endsWith(".src.js"))
  .map(f => f.replace(".src.js", ""))
  .sort();

// ─── 3. Get chart types from options/*.d.ts ─────────────────────────────────

const optionsTypes = fs.readdirSync(path.resolve("node_modules/highcharts/options"))
  .filter(f => f.endsWith(".d.ts") && !f.includes(".src."))
  .map(f => f.replace(".d.ts", ""));

// Merge all known types: options dir + registered types + core
const allTypes = new Set([...optionsTypes, ...typeToProvider.keys(), ...CORE_TYPES]);
const chartTypes = [...allTypes].sort();

// ─── 4. Write module-map.json ───────────────────────────────────────────────

const typeToModuleObj: Record<string, string[]> = {};
for (const [k, v] of [...typeToModule.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  typeToModuleObj[k] = v;
}

const moduleMap = { typeToModule: typeToModuleObj, availableModules, availableThemes, chartTypes };
fs.writeFileSync(
  path.join(GENERATED_DIR, "module-map.json"),
  JSON.stringify(moduleMap, null, 2) + "\n"
);

// ─── 5. Write chart-types.json ──────────────────────────────────────────────

fs.writeFileSync(
  path.join(GENERATED_DIR, "chart-types.json"),
  JSON.stringify(chartTypes, null, 2) + "\n"
);

// ─── 6. Extract Options keys from highcharts.d.ts (existing logic) ──────────

const SKIP_KEYS = new Set([
  "chart", "series", "title", "subtitle",
  "boost", "credits", "defs", "exporting", "global", "lang", "loading",
  "mapNavigation", "mapView", "navigation", "navigator", "noData",
  "rangeSelector", "scrollbar", "sonification", "stockTools", "time",
  "connectors", "data",
  "backgroundColor", "borderColor", "borderRadius", "borderWidth",
  "className", "innerRadius", "outerRadius", "shape", "background",
  "center", "endAngle", "innerSize", "size", "startAngle",
]);

const program = ts.createProgram([HIGHCHARTS_DTS], {
  target: ts.ScriptTarget.ESNext,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
});
const checker = program.getTypeChecker();
const sourceFile = program.getSourceFile(HIGHCHARTS_DTS)!;

const optionsKeys: Array<{ name: string; description: string }> = [];
ts.forEachChild(sourceFile, (node) => {
  if (!ts.isInterfaceDeclaration(node) || node.name.text !== "Options") return;
  for (const member of node.members) {
    if (!ts.isPropertySignature(member) || !member.name) continue;
    const name = (member.name as ts.Identifier).text;
    if (SKIP_KEYS.has(name)) continue;
    const symbol = checker.getSymbolAtLocation(member.name);
    const description = symbol
      ? ts.displayPartsToString(symbol.getDocumentationComment(checker)).replace(/\n/g, " ").replace(/^\(.*?\)\s*/, "").trim()
      : name;
    optionsKeys.push({ name, description });
  }
});

// Write backward-compat highcharts-meta.json (still used by input-schema.ts for optionsKeys)
const meta = { chartTypes, optionsKeys };
fs.writeFileSync(path.resolve("src/highcharts-meta.json"), JSON.stringify(meta, null, 2) + "\n");

console.log(`Generated:`);
console.log(`  src/generated/module-map.json  (${Object.keys(typeToModuleObj).length} type mappings, ${availableModules.length} modules, ${availableThemes.length} themes)`);
console.log(`  src/generated/chart-types.json (${chartTypes.length} types)`);
console.log(`  src/highcharts-meta.json       (${chartTypes.length} types, ${optionsKeys.length} keys)`);
