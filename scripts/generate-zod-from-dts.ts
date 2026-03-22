#!/usr/bin/env npx tsx
/**
 * Generate Zod schemas from Highcharts TypeScript definitions using ts-to-zod.
 *
 * Pipeline:
 * 1. Extract Options + all referenced interfaces (BFS depth 2) from highcharts.d.ts
 * 2. Preprocess: simplify unions, strip generics, replace unknown types with `any`
 * 3. Feed to ts-to-zod for Zod schema generation
 *
 * Usage: npx tsx scripts/generate-zod-from-dts.ts [--slim]
 *   --slim: Skip JSDoc comments (smaller output)
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname!, "..");
const GENERATED_DIR = join(ROOT, "src", "generated");
const DTS_PATH = join(ROOT, "node_modules", "highcharts", "highcharts.d.ts");
const PREPROCESSED_PATH = join(GENERATED_DIR, "highcharts-preprocessed.d.ts");
const OUTPUT_PATH = join(GENERATED_DIR, "highcharts-options.gen.ts");
const SLIM = process.argv.includes("--slim");

// ── Step 1: Extract interfaces via BFS ──

function extractInterface(content: string, name: string): string | null {
  const pattern = new RegExp(`^export interface ${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\{`, "m");
  const match = pattern.exec(content);
  if (!match) return null;

  let depth = 0;
  const start = match.index;
  const braceStart = content.indexOf("{", start);
  for (let j = braceStart; j < content.length; j++) {
    if (content[j] === "{") depth++;
    else if (content[j] === "}") depth--;
    if (depth === 0) return content.slice(start, j + 1);
  }
  return null;
}

function getOptionRefs(block: string): Set<string> {
  return new Set([...block.matchAll(/\b([A-Z]\w+Options)\b/g)].map(m => m[1]));
}

function extractAllInterfaces(content: string, maxDepth = 2): Map<string, string> {
  const visited = new Set<string>();
  const queue: [string, number][] = [["Options", 0]];
  const result = new Map<string, string>();

  while (queue.length > 0) {
    const [name, depth] = queue.shift()!;
    if (visited.has(name)) continue;
    visited.add(name);

    const block = extractInterface(content, name);
    if (!block) continue;
    result.set(name, block);

    if (depth < maxDepth) {
      for (const ref of getOptionRefs(block)) {
        if (!visited.has(ref)) queue.push([ref, depth + 1]);
      }
    }
  }

  return result;
}

// ── Step 2: Preprocess for ts-to-zod compatibility ──

function preprocess(interfaces: Map<string, string>): string {
  const knownNames = new Set(interfaces.keys());
  let blocks: string[] = [];

  for (const [, block] of [...interfaces.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    let processed = block;

    // Strip generic type parameters from interface declarations
    processed = processed.replace(/<T\b[^>]*>/g, "");

    // Replace any Type<Foo> patterns with `any`
    processed = processed.replace(/\b\w+<[^>]*>/g, "any");

    // Clean up malformed remnants: any)]> etc
    processed = processed.replace(/any\)\]>/g, "any");
    processed = processed.replace(/any\)>/g, "any");

    // Simplify union types in parens: (Foo|Bar|Baz) -> any
    processed = processed.replace(/\(([^()]+)\)/g, (_, inner: string) => {
      const types = inner.split("|").map(t => t.trim());
      if (types.length <= 1) return `(${inner})`;
      return "any";
    });

    // Array<Foo|Bar> -> any[]
    processed = processed.replace(/Array<[^>]*\|[^>]*>/g, "any[]");

    // Array<[...]> -> any[]
    processed = processed.replace(/Array<\[[^\]]+\]>/g, "any[]");

    // Array<any[]> -> any[]
    processed = processed.replace(/Array<any\[\]>/g, "any[]");

    // Array<KnownOptions> -> KnownOptions[]
    processed = processed.replace(/Array<(\w+)>/g, (_, inner: string) => {
      if (knownNames.has(inner)) return `${inner}[]`;
      return "any[]";
    });

    // Highcharts.Xxx -> any
    processed = processed.replace(/Highcharts\.\w+/g, "any");

    // DOM types -> any
    processed = processed.replace(/\b(SVGElement|HTMLElement|HTMLDOMElement)\b/g, "any");

    // CSSObject -> any (Record<string, string> causes issues)
    processed = processed.replace(/\bCSSObject\b/g, "any");

    // Color types -> string
    processed = processed.replace(/\b(GradientColorObject|PatternObject|ColorString|ColorType)\b/g, "string");

    // Function -> any
    processed = processed.replace(/:\s*Function\b/g, ": any");

    // FooOptions|FooOptions[] -> FooOptions[]
    processed = processed.replace(/(\w+Options)\|(\w+Options)\[\]/g, "$1[]");
    processed = processed.replace(/(\w+Options)\[\]\|(\w+Options)/g, "$1[]");

    // Simple primitive unions without parens: string|number -> any
    processed = processed.replace(/:\s*(string|number|boolean|any)\|(string|number|boolean|any|null)\b/g, ": any");
    processed = processed.replace(/:\s*null\|(string|number|boolean|any)\b/g, ": any");

    // type|undefined -> type
    processed = processed.replace(/:\s*(\w+)\|undefined\b/g, ": $1");
    processed = processed.replace(/:\s*undefined\|(\w+)\b/g, ": $1");

    blocks.push(processed);
  }

  let output = blocks.join("\n\n");

  // Final pass: replace any remaining non-basic, non-interface types with `any`
  const basicTypes = new Set([
    "string", "number", "boolean", "any", "null", "undefined", "void",
    "never", "unknown", "object", "Record",
  ]);

  // Find ALL capitalized type references and replace unknowns
  output = output.replace(/\b([A-Z][a-zA-Z0-9]+)\b/g, (match) => {
    if (knownNames.has(match)) return match;
    if (["Record", "Array", "Date", "RegExp", "Function", "Promise", "Map", "Set"].includes(match)) return match;
    return "any";
  });

  // Clean up any remaining Array<...> patterns
  output = output.replace(/Array<[^>]+>/g, "any[]");

  return output;
}

// ── Step 3: Run ts-to-zod ──

function runTsToZod(inputPath: string, outputPath: string, slim: boolean): void {
  const flags = ["--skipValidation"];
  if (slim) flags.push("--skipParseJSDoc");
  else flags.push("--keepComments");

  const relInput = inputPath.replace(ROOT + "/", "");
  const relOutput = outputPath.replace(ROOT + "/", "");
  const cmd = `npx ts-to-zod "${relInput}" "${relOutput}" ${flags.join(" ")}`;
  console.log(`Running: ${cmd}`);
  execSync(cmd, { cwd: ROOT, stdio: "inherit" });
}

// ── Main ──

async function main() {
  mkdirSync(GENERATED_DIR, { recursive: true });

  if (!existsSync(DTS_PATH)) {
    console.error(`❌ ${DTS_PATH} not found. Run npm install first.`);
    process.exit(1);
  }

  console.log("Step 1: Extracting interfaces from highcharts.d.ts...");
  const content = readFileSync(DTS_PATH, "utf-8");
  const interfaces = extractAllInterfaces(content);
  console.log(`  Found ${interfaces.size} interfaces`);

  console.log("Step 2: Preprocessing for ts-to-zod compatibility...");
  const preprocessed = preprocess(interfaces);
  writeFileSync(PREPROCESSED_PATH, preprocessed);
  console.log(`  Wrote ${PREPROCESSED_PATH} (${(preprocessed.length / 1024).toFixed(0)} KB)`);

  console.log(`Step 3: Running ts-to-zod${SLIM ? " (slim)" : ""}...`);
  runTsToZod(PREPROCESSED_PATH, OUTPUT_PATH, SLIM);

  // Stats
  const output = readFileSync(OUTPUT_PATH, "utf-8");
  const schemas = [...output.matchAll(/export const \w+Schema/g)].length;
  const bytes = Buffer.byteLength(output, "utf-8");
  const lines = output.split("\n").length;
  const tokens = Math.round(bytes / 4);

  console.log(`\n✅ Generated ${OUTPUT_PATH}`);
  console.log(`  ${schemas} schemas | ${lines} lines | ${(bytes / 1024).toFixed(0)} KB | ~${tokens.toLocaleString()} tokens`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
