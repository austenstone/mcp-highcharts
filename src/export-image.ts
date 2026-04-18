/**
 * Server-side chart-to-PNG export via the Highcharts Export Server API.
 *
 * When IMAGE_EXPORT=true, tool results include a base64 PNG alongside
 * the interactive structuredContent — a fallback for clients that don't
 * support MCP apps.
 *
 * Supports self-hosted export servers via EXPORT_SERVER_URL env var.
 * The public export.highcharts.com endpoint has fair-usage limits and
 * requires a valid Highcharts license for production use.
 */

const DEFAULT_EXPORT_URL = "https://export.highcharts.com/";
const EXPORT_TIMEOUT_MS = 15_000;
const DEFAULT_WIDTH = 800;

/** Chart constructor names expected by the Highcharts Export Server */
const CONSTRUCTOR_MAP: Record<string, string> = {
  stock: "StockChart",
  map: "MapChart",
  gantt: "GanttChart",
};

export interface ExportImageConfig {
  /** Highcharts options object (will be JSON-stringified) */
  options: Record<string, unknown>;
  /** Internal chart type tag from __chartType */
  chartType?: string;
  /** Override export image width (default: 800) */
  width?: number;
}

/**
 * Returns true if image export is enabled via env var.
 */
export function isImageExportEnabled(): boolean {
  return process.env.IMAGE_EXPORT === "true" || process.env.IMAGE_EXPORT === "1";
}

/**
 * Checks whether the given chart config can be exported as an image.
 * Dashboards (components array) and grids are not supported by the
 * Highcharts Export Server. Maps with string-based mapData/chart.map
 * keys can't be resolved server-side and are also skipped.
 */
export function isExportable(config: Record<string, unknown>): boolean {
  // Dashboards have a components array
  if (Array.isArray(config.components)) return false;

  // Grids use the grid renderer
  if (config.__chartType === "grid") return false;

  // Maps with unresolved string map keys can't be exported
  if (config.__chartType === "map") {
    const chart = config.chart as Record<string, unknown> | undefined;
    if (typeof chart?.map === "string") return false;

    const series = config.series as Array<Record<string, unknown>> | undefined;
    if (series?.some(s => typeof s.mapData === "string")) return false;
  }

  return true;
}

/**
 * Prepare a clean options object for the export server.
 * Strips internal fields and app-specific config.
 */
function sanitizeForExport(config: Record<string, unknown>): Record<string, unknown> {
  const clone = structuredClone(config);
  delete clone.__chartType;
  delete clone.responsive;
  return clone;
}

/**
 * Export a Highcharts chart config to a PNG image via the export server.
 * Returns base64-encoded PNG data, or null if export fails.
 * Failures are silent (logged to stderr) — never breaks the tool response.
 */
export async function exportChartToImage(
  config: ExportImageConfig,
): Promise<string | null> {
  const exportUrl = process.env.EXPORT_SERVER_URL?.trim() || DEFAULT_EXPORT_URL;
  const width = config.width ?? DEFAULT_WIDTH;
  const constr = CONSTRUCTOR_MAP[config.chartType ?? ""] ?? "Chart";

  const sanitized = sanitizeForExport(config.options);

  const body = JSON.stringify({
    type: "image/png",
    options: JSON.stringify(sanitized),
    constr,
    width,
  });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), EXPORT_TIMEOUT_MS);

    const response = await fetch(exportUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "image/png",
        "User-Agent": "mcp-highcharts",
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.error(
        `[mcp-highcharts] Export server returned ${response.status}: ${response.statusText}`,
      );
      return null;
    }

    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString("base64");
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.error("[mcp-highcharts] Export server request timed out");
    } else {
      console.error("[mcp-highcharts] Export failed:", error);
    }
    return null;
  }
}
