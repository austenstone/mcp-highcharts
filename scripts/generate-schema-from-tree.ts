/**
 * Auto-generate Highcharts options schema data from the official tree.json API.
 *
 * Downloads tree.json for each Highcharts product, caches the raw files,
 * and produces a rich options-fields.json with top-level fields + 1-level children.
 *
 * Usage: tsx scripts/generate-schema-from-tree.ts
 */

import { writeFileSync, existsSync, readFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const GENERATED_DIR = join(import.meta.dirname!, "..", "src", "generated");

const TREE_SOURCES: Record<string, { url: string; cacheFile: string }> = {
  highcharts: {
    url: "https://api.highcharts.com/highcharts/tree.json",
    cacheFile: "tree.json",
  },
  highstock: {
    url: "https://api.highcharts.com/highstock/tree.json",
    cacheFile: "tree-stock.json",
  },
  gantt: {
    url: "https://api.highcharts.com/gantt/tree.json",
    cacheFile: "tree-gantt.json",
  },
  highmaps: {
    url: "https://api.highcharts.com/highmaps/tree.json",
    cacheFile: "tree-maps.json",
  },
};

interface Doclet {
  description?: string;
  type?: { names?: string[] };
  defaultvalue?: unknown;
  since?: string;
}

interface TreeNode {
  doclet?: Doclet;
  children?: Record<string, TreeNode>;
}

interface ChildField {
  name: string;
  description: string;
  type: string;
  default?: unknown;
}

interface TopLevelField {
  name: string;
  description: string;
  type: string;
  optional: boolean;
  children: ChildField[];
}

function resolveType(doclet?: Doclet, hasChildren?: boolean): string {
  const names = doclet?.type?.names;
  if (!names?.length || (names.length === 1 && names[0] === "*")) {
    return hasChildren ? "object" : "any";
  }
  return names.join("|");
}

function stripHtml(html?: string): string {
  if (!html) return "";
  return html.replace(/<[^>]+>/g, "").trim();
}

function parseTree(tree: Record<string, TreeNode>): TopLevelField[] {
  const fields: TopLevelField[] = [];

  for (const [key, node] of Object.entries(tree)) {
    if (key.startsWith("_")) continue; // skip _meta etc.

    const hasChildren = !!node.children && Object.keys(node.children).length > 0;
    const type = resolveType(node.doclet, hasChildren);

    const children: ChildField[] = [];
    if (node.children) {
      for (const [childKey, childNode] of Object.entries(node.children)) {
        const childHasChildren = !!childNode.children && Object.keys(childNode.children).length > 0;
        const child: ChildField = {
          name: childKey,
          description: stripHtml(childNode.doclet?.description),
          type: resolveType(childNode.doclet, childHasChildren),
        };
        if (childNode.doclet?.defaultvalue !== undefined) {
          child.default = childNode.doclet.defaultvalue;
        }
        children.push(child);
      }
    }

    fields.push({
      name: key,
      description: stripHtml(node.doclet?.description),
      type,
      optional: true,
      children,
    });
  }

  return fields.sort((a, b) => a.name.localeCompare(b.name));
}

async function downloadTree(name: string, url: string, cachePath: string): Promise<void> {
  if (existsSync(cachePath)) {
    console.log(`  ✓ ${name}: cached (${cachePath})`);
    return;
  }
  console.log(`  ↓ ${name}: downloading from ${url}...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const text = await res.text();
  writeFileSync(cachePath, text);
  console.log(`  ✓ ${name}: saved (${(text.length / 1024).toFixed(0)} KB)`);
}

async function main() {
  mkdirSync(GENERATED_DIR, { recursive: true });

  // Download all tree.json files
  console.log("Downloading tree.json files...");
  for (const [name, { url, cacheFile }] of Object.entries(TREE_SOURCES)) {
    const cachePath = join(GENERATED_DIR, cacheFile);
    await downloadTree(name, url, cachePath);
  }

  // Parse the main highcharts tree
  console.log("\nParsing highcharts tree...");
  const treePath = join(GENERATED_DIR, "tree.json");
  const tree = JSON.parse(readFileSync(treePath, "utf-8"));
  const fields = parseTree(tree);

  const outputPath = join(GENERATED_DIR, "options-fields.json");
  writeFileSync(outputPath, JSON.stringify(fields, null, 2) + "\n");
  console.log(`✓ Generated ${outputPath} (${fields.length} top-level fields)`);

  // Summary
  const totalChildren = fields.reduce((sum, f) => sum + f.children.length, 0);
  console.log(`  ${totalChildren} total child fields across all top-level entries`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
