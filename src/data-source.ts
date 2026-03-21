/**
 * Data source reader: loads file content from paths or URLs.
 * Highcharts' built-in data module handles CSV/TSV parsing natively via `data.csv`.
 */
import fs from "node:fs/promises";
import path from "node:path";

/**
 * Read raw file content from a local path or URL.
 * Paths are resolved relative to `cwd` and must stay within it (no traversal).
 * URLs are restricted to HTTPS (no private/link-local IPs for SSRF protection).
 */
export async function readDataSource(source: string): Promise<string> {
  if (/^https?:\/\//i.test(source)) {
    const url = new URL(source);
    if (url.protocol !== "https:") {
      throw new Error("Only HTTPS URLs are allowed for dataSource");
    }
    // Block private/link-local IPs (basic SSRF protection)
    const host = url.hostname;
    if (
      host === "localhost" ||
      host.startsWith("127.") ||
      host.startsWith("10.") ||
      host.startsWith("192.168.") ||
      host.startsWith("169.254.") ||
      host === "0.0.0.0" ||
      host === "[::1]" ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    ) {
      throw new Error("Private/internal URLs are not allowed for dataSource");
    }
    const resp = await fetch(source);
    if (!resp.ok) throw new Error(`Failed to fetch ${source}: ${resp.status}`);
    return resp.text();
  }

  // Resolve path relative to cwd and ensure it doesn't escape
  const resolved = path.resolve(source);
  const cwd = process.cwd();
  if (!resolved.startsWith(cwd + path.sep) && resolved !== cwd) {
    throw new Error(`dataSource path must be within the workspace: ${source}`);
  }
  return fs.readFile(resolved, "utf-8");
}

/**
 * Detect if content is JSON (vs CSV/TSV).
 */
export function isJsonContent(source: string, content: string): boolean {
  if (source.toLowerCase().endsWith(".json")) return true;
  const trimmed = content.trimStart();
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}
