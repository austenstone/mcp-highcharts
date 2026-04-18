/**
 * Server-side chart-to-PNG export for MCP clients that don't support apps.
 *
 * Rendering strategy (in order):
 *  1. Local — `highcharts-export-server` npm package (Puppeteer-based, no network)
 *  2. Remote — POST to Highcharts Export Server HTTP API (export.highcharts.com)
 *
 * The local renderer is used automatically when `highcharts-export-server` is
 * installed. Otherwise the remote HTTP endpoint is used as a fallback.
 * Override the remote URL with the EXPORT_SERVER_URL env var.
 */

const DEFAULT_EXPORT_URL = "https://export.highcharts.com/";
const EXPORT_TIMEOUT_MS = 15_000;
const DEFAULT_WIDTH = 800;

/** Chart constructor names expected by the export server */
const CONSTRUCTOR_MAP: Record<string, string> = {
  stock: "StockChart",
  map: "MapChart",
  gantt: "GanttChart",
};

export interface ExportImageConfig {
  /** Highcharts options object (will be JSON-stringified for remote) */
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
 * Dashboards (components array) and grids are not supported.
 * Maps with string-based mapData/chart.map keys can't be resolved server-side.
 */
export function isExportable(config: Record<string, unknown>): boolean {
  if (Array.isArray(config.components)) return false;
  if (config.__chartType === "grid") return false;

  if (config.__chartType === "map") {
    const chart = config.chart as Record<string, unknown> | undefined;
    if (typeof chart?.map === "string") return false;

    const series = config.series as Array<Record<string, unknown>> | undefined;
    if (series?.some(s => typeof s.mapData === "string")) return false;
  }

  return true;
}

/**
 * Strip internal fields before sending to the export server.
 */
function sanitizeForExport(config: Record<string, unknown>): Record<string, unknown> {
  const clone = structuredClone(config);
  delete clone.__chartType;
  delete clone.responsive;
  return clone;
}

// ---------------------------------------------------------------------------
// Local export via highcharts-export-server (Puppeteer)
// ---------------------------------------------------------------------------

let localExporter: any = null;
let localPoolReady = false;
let localAvailable: boolean | null = null; // null = not yet checked

async function ensureLocalPool(): Promise<boolean> {
  if (localAvailable === false) return false;

  if (!localExporter) {
    try {
      // Dynamic import — only succeeds if the package is installed
      // @ts-expect-error — optional peer dep, no types available
      const mod = await import("highcharts-export-server");
      localExporter = mod.default ?? mod;
      localAvailable = true;
    } catch {
      localAvailable = false;
      return false;
    }
  }

  if (!localPoolReady) {
    try {
      localExporter.initPool();
      localPoolReady = true;

      // Best-effort cleanup on exit
      const cleanup = () => {
        try { localExporter?.killPool(); } catch { /* ignore */ }
      };
      process.once("exit", cleanup);
      process.once("SIGINT", cleanup);
      process.once("SIGTERM", cleanup);
    } catch (err) {
      console.error("[mcp-highcharts] Failed to init local export pool:", err);
      localAvailable = false;
      return false;
    }
  }

  return true;
}

async function exportLocal(config: ExportImageConfig): Promise<string | null> {
  const ready = await ensureLocalPool();
  if (!ready) return null;

  const constr = CONSTRUCTOR_MAP[config.chartType ?? ""] ?? "chart";
  const sanitized = sanitizeForExport(config.options);

  return new Promise((resolve) => {
    localExporter.export(
      {
        type: "png",
        constr: constr.toLowerCase(),
        width: config.width ?? DEFAULT_WIDTH,
        options: sanitized,
      },
      (err: any, res: any) => {
        if (err) {
          console.error("[mcp-highcharts] Local export failed:", err);
          resolve(null);
        } else {
          resolve(res?.data ?? null);
        }
      },
    );
  });
}

// ---------------------------------------------------------------------------
// Remote export via HTTP API
// ---------------------------------------------------------------------------

async function exportRemote(config: ExportImageConfig): Promise<string | null> {
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

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Export a Highcharts chart config to a base64-encoded PNG.
 * Tries local Puppeteer rendering first, falls back to remote HTTP API.
 * Returns null if both fail — never throws.
 */
export async function exportChartToImage(
  config: ExportImageConfig,
): Promise<string | null> {
  const localResult = await exportLocal(config);
  if (localResult) return localResult;

  return exportRemote(config);
}
