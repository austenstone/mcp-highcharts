/**
 * Extracts chart types and Options keys from highcharts.d.ts → writes src/highcharts-meta.json.
 * Run: npm run generate:schema
 */
import ts from "typescript";
import fs from "node:fs";
import path from "node:path";

const HIGHCHARTS_DTS = path.resolve("node_modules/highcharts/highcharts.d.ts");
const OUTPUT_FILE = path.resolve("src/highcharts-meta.json");

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

// Extract Options keys + JSDoc
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

// Extract chart types from options/*.d.ts files
const chartTypes = fs.readdirSync(path.resolve("node_modules/highcharts/options"))
  .filter((f) => f.endsWith(".d.ts") && !f.includes(".src."))
  .map((f) => f.replace(".d.ts", ""))
  .sort();

const meta = { chartTypes, optionsKeys };
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(meta, null, 2) + "\n");
console.log(`Generated ${OUTPUT_FILE} (${chartTypes.length} types, ${optionsKeys.length} keys)`);
