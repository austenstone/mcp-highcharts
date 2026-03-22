#!/usr/bin/env node
/**
 * Generate Zod schemas from Highcharts tree.json API spec.
 *
 * Features:
 *   - Proper types: string, number, boolean, enums, unions, arrays
 *   - Descriptions from official API docs (capped at 200 chars)
 *   - Default values appended to descriptions
 *   - `values` field converted to z.enum() (24 extra enums)
 *   - Highcharts named types (AlignValue, DashStyleValue, etc.) → z.enum()
 *   - Deprecated fields skipped entirely (saves ~52 fields of tokens)
 *   - Product filtering: skip highstock/highmaps/gantt-only fields
 *   - z.looseObject() instead of z.object().passthrough()
 *
 * Usage: node scripts/generate-from-tree.mjs [options]
 *   --depth N       Max depth to expand children (default: 1)
 *   --multi         Generate schemas for depths 0, 1, and 2
 *   --fetch         Re-download tree.json even if cached
 *   --no-filter     Include all products (not just highcharts)
 *   --keep-deprecated  Include deprecated fields
 *
 * Output: src/generated/highcharts-depth-{N}.gen.ts
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { createCuratedProvider, createSampleProvider, createCombinedProvider, discoverGitHubSamples } from "./example-providers.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const GENERATED_DIR = join(ROOT, "src", "generated");
const TREE_CACHE = join(ROOT, "tree.json");
const DISCOVER_CACHE = join(ROOT, "github-samples-cache.json");
const OUTPUT_DEPTH_PATH = (d) => join(GENERATED_DIR, `highcharts-depth-${d}.gen.ts`);
const TREE_URL = "https://api.highcharts.com/highcharts/tree.json";

// ── CLI args ──
const args = process.argv.slice(2);
const multiMode = args.includes("--multi");
const maxDepth = args.includes("--depth")
  ? parseInt(args[args.indexOf("--depth") + 1])
  : 1;
const forceFetch = args.includes("--fetch");
const filterProducts = !args.includes("--no-filter");
const skipDeprecated = !args.includes("--keep-deprecated");
const examplesMode = args.includes("--examples")
  ? args[args.indexOf("--examples") + 1]
  : "combined"; // "curated" | "samples" | "combined" | "none"
const discover = args.includes("--discover");

// ── Stats ──
let stats = { deprecated: 0, productFiltered: 0, enums: 0, defaults: 0, valuesEnums: 0 };

// ── Fetch or load tree.json ──
async function loadTree() {
  if (!forceFetch && existsSync(TREE_CACHE)) {
    console.log(`Using cached ${TREE_CACHE}`);
    return JSON.parse(readFileSync(TREE_CACHE, "utf-8"));
  }
  console.log(`Fetching ${TREE_URL}...`);
  const resp = await fetch(TREE_URL);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = await resp.json();
  writeFileSync(TREE_CACHE, JSON.stringify(data, null, 2));
  console.log(`Cached to ${TREE_CACHE}`);
  return data;
}

// ── Known Highcharts enum types ──
const HC_ENUMS = {
  "Highcharts.AlignValue": ["left", "center", "right"],
  "Highcharts.VerticalAlignValue": ["top", "middle", "bottom"],
  "Highcharts.DashStyleValue": [
    "Dash", "DashDot", "Dot", "LongDash", "LongDashDot",
    "LongDashDotDot", "ShortDash", "ShortDashDot", "ShortDashDotDot",
    "ShortDot", "Solid",
  ],
  "Highcharts.ButtonRelativeToValue": ["plotBox", "spacingBox"],
  "Highcharts.SeriesLinecapValue": ["butt", "round", "square"],
  "Highcharts.BubbleSizeByValue": ["area", "width"],
  "Highcharts.DataGroupingApproximationValue": [
    "average", "averages", "close", "high", "low", "open", "sum", "range",
  ],
  "Highcharts.OptionsHeaderKeyValue": ["camelCase", "none"],
};

// ── Check if a node should be skipped ──
function shouldSkip(node) {
  const doclet = node.doclet || {};
  // Skip deprecated
  if (skipDeprecated && doclet.deprecated) {
    stats.deprecated++;
    return true;
  }
  // Skip non-highcharts products (e.g. highstock-only, gantt-only)
  if (filterProducts && doclet.products) {
    if (!doclet.products.includes("highcharts")) {
      stats.productFiltered++;
      return true;
    }
  }
  return false;
}

// ── Type mapping ──
function mapTypes(typeNames, valuesField) {
  // If doclet has a `values` field, use it as an enum
  if (valuesField) {
    let vals = valuesField;
    // values can be a stringified array — parse it
    if (typeof vals === "string") {
      try { vals = JSON.parse(vals); } catch { vals = null; }
    }
    if (Array.isArray(vals) && vals.length > 0) {
      const allStrings = vals.every(v => typeof v === "string");
      if (allStrings) {
        stats.valuesEnums++;
        return `z.enum([${vals.map(v => JSON.stringify(v)).join(", ")}])`;
      }
    }
  }

  if (!typeNames || typeNames.length === 0) return "z.any()";

  const enumVals = [];
  const structTypes = [];

  for (const t of typeNames) {
    if (t === "null" || t === "undefined") continue;
    const unquoted = t.match(/^['"](.+)['"]$/);
    if (unquoted) {
      enumVals.push(unquoted[1]);
    } else {
      structTypes.push(t);
    }
  }

  // Pure enum from type names
  if (enumVals.length > 0 && structTypes.length === 0) {
    stats.enums++;
    return `z.enum([${enumVals.map(v => JSON.stringify(v)).join(", ")}])`;
  }

  // Mixed enum + primitive
  if (enumVals.length > 0) {
    stats.enums++;
    const parts = [`z.enum([${enumVals.map(v => JSON.stringify(v)).join(", ")}])`];
    for (const t of structTypes) {
      const m = mapSingleType(t);
      if (m && !parts.includes(m)) parts.push(m);
    }
    return parts.length === 1 ? parts[0] : `z.union([${parts.join(", ")}])`;
  }

  // Structural types only
  const mapped = [...new Set(structTypes.map(mapSingleType).filter(Boolean))];
  if (mapped.length === 0) return "z.any()";
  if (mapped.length === 1) return mapped[0];
  if (mapped.includes("z.any()")) return "z.any()";
  return `z.union([${mapped.join(", ")}])`;
}

function mapSingleType(t) {
  if (t === "string") return "z.string()";
  if (t === "number") return "z.number()";
  if (t === "boolean") return "z.boolean()";
  if (t === "*" || t === "Object") return "z.any()";
  if (t === "function") return "z.any()";
  if (t === "Array" || t === "Array.<*>") return "z.array(z.any())";
  if (t === "Array.<string>") return "z.array(z.string())";
  if (t === "Array.<number>") return "z.array(z.number())";
  if (t.startsWith("Array.<")) return "z.array(z.any())";
  if (t === "Highcharts.ColorString" || t === "Highcharts.ColorType" ||
      t === "Highcharts.GradientColorObject" || t === "Highcharts.PatternObject" ||
      t === "Highcharts.Color") return "z.string()";
  if (t === "Highcharts.CSSObject" || t === "Highcharts.SVGAttributes")
    return "z.record(z.string(), z.any())";
  if (HC_ENUMS[t]) {
    stats.enums++;
    return `z.enum([${HC_ENUMS[t].map(v => JSON.stringify(v)).join(", ")}])`;
  }
  if (t.includes("Callback") || t.includes("Function") || t.includes("Formatter"))
    return "z.any()";
  if (t.startsWith("Highcharts.") || t.startsWith("Partial.<")) return "z.any()";
  return "z.any()";
}

// ── Clean description + append default ──
function cleanDesc(desc, defaultVal) {
  if (!desc) return null;
  let cleaned = desc
    .replace(/<[^>]+>/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\{@link [^}]+\}/g, "")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Append default value
  if (defaultVal !== undefined && defaultVal !== null && defaultVal !== "undefined" && defaultVal !== "null") {
    const defStr = typeof defaultVal === "string" ? defaultVal : JSON.stringify(defaultVal);
    if (defStr.length <= 30) {
      stats.defaults++;
      cleaned += ` (default: ${defStr})`;
    }
  }

  return cleaned.slice(0, 250);
}

// ── Collect samples from a node and its children (up to 2 levels deep) ──
function collectSamples(node, depth = 0) {
  const samples = [];
  if (node.doclet?.samples) {
    samples.push(...node.doclet.samples);
  }
  if (node.children && depth < 2) {
    for (const child of Object.values(node.children)) {
      samples.push(...collectSamples(child, depth + 1));
    }
  }
  return samples;
}

// ── Generate schema for a given depth ──
async function generateForDepth(tree, topKeys, depth, exampleProvider, outputPath) {
  // Reset stats for this depth
  stats = { deprecated: 0, productFiltered: 0, enums: 0, defaults: 0, valuesEnums: 0 };
  // Temporarily override maxDepth for emitNode
  const savedMaxDepth = maxDepth;

  const lines = [];
  lines.push("// Auto-generated from https://api.highcharts.com/highcharts/tree.json");
  lines.push(`// Depth: ${depth} | Generated: ${new Date().toISOString().split("T")[0]}`);
  lines.push("// Do not edit manually — regenerate with: node scripts/generate-from-tree.mjs");
  lines.push('import { z } from "zod";');
  lines.push("");

  // Named sub-schema exports
  const namedExports = [
    ["chart", "chartOptionsSchema"],
    ["title", "titleOptionsSchema"],
    ["subtitle", "subtitleOptionsSchema"],
    ["tooltip", "tooltipOptionsSchema"],
    ["legend", "legendOptionsSchema"],
    ["data", "dataOptionsSchema"],
    ["xAxis", "xAxisOptionsSchema"],
    ["yAxis", "yAxisOptionsSchema"],
  ];

  for (const [key, exportName] of namedExports) {
    const node = tree[key];
    if (!node) continue;
    const desc = cleanDesc(node.doclet?.description, node.doclet?.defaultvalue);
    const expr = await emitNodeAtDepth(node, 0, 1, key, exampleProvider, depth);
    let chain = expr;
    if (desc) chain += `.describe(${JSON.stringify(desc)})`;
    // Attach examples at the top level too
    if (exampleProvider) {
      const examples = await exampleProvider.getExamples(key);
      if (examples.length > 0) chain += `.meta({ examples: ${JSON.stringify(examples)} })`;
    }
    lines.push(`export const ${exportName} = ${chain};`);
    lines.push("");
  }

  // Main options schema
  lines.push("export const optionsSchema = z.lazy(() => z.looseObject({");
  for (const key of topKeys) {
    const node = tree[key];
    if (shouldSkip(node)) continue;

    const desc = cleanDesc(node.doclet?.description, node.doclet?.defaultvalue);
    const expr = await emitNodeAtDepth(node, 0, 1, key, exampleProvider, depth);
    let chain = `${expr}.optional()`;
    if (desc) chain += `.describe(${JSON.stringify(desc)})`;
    // Attach examples at the top level too
    if (exampleProvider) {
      const examples = await exampleProvider.getExamples(key);
      if (examples.length > 0) chain += `.meta({ examples: ${JSON.stringify(examples)} })`;
    }
    const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : JSON.stringify(key);
    lines.push(`  ${safeKey}: ${chain},`);
  }
  lines.push("}));");

  const output = lines.join("\n") + "\n";
  writeFileSync(outputPath, output);

  const bytes = Buffer.byteLength(output, "utf-8");
  const lineCount = output.split("\n").length;
  const schemaCount = [...output.matchAll(/export const \w+/g)].length;
  const descCount = [...output.matchAll(/\.describe\(/g)].length;

  console.log(`\n✅ ${outputPath}`);
  console.log(`  ${schemaCount} exports | ${lineCount} lines | ${(bytes / 1024).toFixed(1)} KB | ~${Math.round(bytes / 4).toLocaleString()} tokens`);
  console.log(`  ${descCount} descriptions | ${stats.enums} enums (type) | ${stats.valuesEnums} enums (values)`);
  console.log(`  ${stats.defaults} defaults in descriptions`);
  console.log(`  ${stats.deprecated} deprecated skipped | ${stats.productFiltered} product-filtered`);
}

// emitNode variant that uses an explicit depth limit
async function emitNodeAtDepth(node, currentDepth, indent, parentPath, exampleProvider, depthLimit) {
  const pad = "  ".repeat(indent);
  const children = node.children;
  const hasChildren = children && Object.keys(children).length > 0;
  const doclet = node.doclet || {};
  const typeNames = doclet.type?.names || [];

  // At max depth or leaf node
  if (!hasChildren || currentDepth >= depthLimit) {
    return mapTypes(typeNames, doclet.values);
  }

  // Object with children — use z.looseObject()
  const lines = ["z.looseObject({"];
  const entries = Object.entries(children).filter(([k]) => !k.startsWith("_"));

  for (const [key, child] of entries) {
    if (shouldSkip(child)) continue;

    const childDoclet = child.doclet || {};
    const desc = cleanDesc(childDoclet.description, childDoclet.defaultvalue);
    const childPath = parentPath ? `${parentPath}.${key}` : key;
    const expr = await emitNodeAtDepth(child, currentDepth + 1, indent + 1, childPath, exampleProvider, depthLimit);

    let chain = `${expr}.optional()`;
    if (desc) chain += `.describe(${JSON.stringify(desc)})`;

    // Attach examples at the leaf level
    if (exampleProvider && parentPath) {
      const examples = await exampleProvider.getExamples(childPath);
      if (examples.length > 0) chain += `.meta({ examples: ${JSON.stringify(examples)} })`;
    }

    const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : JSON.stringify(key);
    lines.push(`${pad}  ${safeKey}: ${chain},`);
  }

  lines.push(`${pad}})`);
  return lines.join("\n");
}

// ── Main ──
async function main() {
  mkdirSync(GENERATED_DIR, { recursive: true });

  const tree = await loadTree();
  const topKeys = Object.keys(tree).filter(k => !k.startsWith("_"));

  const depths = multiMode ? [0, 1, 2] : [maxDepth];
  console.log(`Generating Zod schemas (depths=${depths.join(",")}, ${topKeys.length} top-level fields)`);
  if (filterProducts) console.log("  Filtering to highcharts product only");
  if (skipDeprecated) console.log("  Skipping deprecated fields");
  console.log(`  Examples: ${examplesMode}`);

  // Create example provider based on CLI flag
  const exampleProvider = examplesMode === "none" ? null
    : examplesMode === "samples" ? createSampleProvider()
    : examplesMode === "combined" ? createCombinedProvider()
    : createCuratedProvider();

  // Preload: gather ALL samples from the tree and let the provider batch-scrape
  if (exampleProvider && exampleProvider.preload) {
    const allSamples = [];
    for (const key of topKeys) {
      allSamples.push(...collectSamples(tree[key]));
    }

    // Merge in discovered GitHub samples directory paths
    if (discover) {
      let discoveredPaths;
      const cacheValid = !forceFetch && existsSync(DISCOVER_CACHE);
      if (cacheValid) {
        try {
          const cached = JSON.parse(readFileSync(DISCOVER_CACHE, "utf-8"));
          // Cache valid for 7 days
          if (cached.timestamp && Date.now() - cached.timestamp < 7 * 24 * 60 * 60 * 1000) {
            discoveredPaths = cached.paths;
            console.log(`  Using cached GitHub discovery (${discoveredPaths.length} paths)`);
          }
        } catch {}
      }

      if (!discoveredPaths) {
        discoveredPaths = await discoverGitHubSamples();
        writeFileSync(DISCOVER_CACHE, JSON.stringify({
          timestamp: Date.now(),
          paths: discoveredPaths,
        }));
        console.log(`  Discovered ${discoveredPaths.length} sample paths from GitHub`);
      }

      // Deduplicate against tree.json samples
      const existingPaths = new Set(allSamples.map(s => s.value));
      let added = 0;
      for (const s of discoveredPaths) {
        if (!existingPaths.has(s.value)) {
          allSamples.push(s);
          added++;
        }
      }
      console.log(`  Merged ${added} new paths (${existingPaths.size} already in tree.json)`);
    }

    console.log(`  Preloading ${allSamples.length} sample paths...`);
    await exampleProvider.preload(allSamples);
  }

  for (const depth of depths) {
    await generateForDepth(tree, topKeys, depth, exampleProvider, OUTPUT_DEPTH_PATH(depth));
  }
}

main().catch(err => { console.error(err); process.exit(1); });
