/**
 * Data source reader: loads file content from paths or URLs.
 * Highcharts' built-in data module handles CSV/TSV parsing natively via `data.csv`.
 */
import fs from "node:fs/promises";

/**
 * Read raw file content from a local path or URL.
 */
export async function readDataSource(source: string): Promise<string> {
  if (/^https?:\/\//i.test(source)) {
    const resp = await fetch(source);
    if (!resp.ok) throw new Error(`Failed to fetch ${source}: ${resp.status}`);
    return resp.text();
  }
  return fs.readFile(source, "utf-8");
}

/**
 * Detect if content is JSON (vs CSV/TSV).
 */
export function isJsonContent(source: string, content: string): boolean {
  if (source.toLowerCase().endsWith(".json")) return true;
  const trimmed = content.trimStart();
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}
