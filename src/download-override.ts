/**
 * Override for Highcharts' DownloadURL module.
 * Re-exports all original functions but wraps downloadURL to route through
 * the MCP SDK's app.downloadFile() when available.
 *
 * This is necessary because Highcharts' ESM modules import downloadURL directly
 * from DownloadURL.js via `import { downloadURL } from '...'` — they don't go
 * through H.downloadURL, so Object.defineProperty on the Highcharts object
 * has no effect.
 */

// @ts-nocheck — Vite alias resolves these at build time; TS can't resolve the raw node_modules paths
// Import originals
export {
  dataURLtoBlob,
  getBlobFromContent,
  getScript,
} from "/node_modules/highcharts/es-modules/Shared/DownloadURL.js";
export { default } from "/node_modules/highcharts/es-modules/Shared/DownloadURL.js";

import { downloadURL as origDownloadURL } from "/node_modules/highcharts/es-modules/Shared/DownloadURL.js";

// Lazy reference to the MCP app instance — set by mcp-app.ts
let _appInstance: { downloadFile: (params: any) => Promise<any>; sendLog?: (params: any) => void } | null = null;
let _canDownload = false;

function log(level: string, msg: string) {
  console.log(msg);
  try { _appInstance?.sendLog?.({ level, data: msg }); } catch {}
}

export function setMcpApp(app: any, canDownload: boolean) {
  _appInstance = app;
  _canDownload = canDownload;
  log("info", `[download] setMcpApp called, canDownload=${canDownload}`);
}

export function downloadURL(dataURL: string | URL, filename: string): void {
  log("info", `[download] downloadURL called: ${filename}, canDownload=${_canDownload}, hasApp=${!!_appInstance}`);
  if (!_canDownload || !_appInstance) {
    log("info", "[download] falling back to original");
    origDownloadURL(dataURL, filename);
    return;
  }

  const dataStr = String(dataURL);
  const mimeMatch = dataStr.match(/^data:([^;,]+)/);
  const mimeType = mimeMatch?.[1] || "application/octet-stream";
  const base64 = dataStr.split(",")[1];

  if (!base64) {
    log("warning", "[download] no base64 in dataURL, falling back");
    origDownloadURL(dataURL, filename);
    return;
  }

  log("info", `[download] calling app.downloadFile: ${filename} ${mimeType} blob=${base64.length} chars`);
  _appInstance
    .downloadFile({
      contents: [
        {
          type: "resource" as const,
          resource: {
            uri: `file:///${filename}`,
            mimeType,
            blob: base64,
          },
        },
      ],
    })
    .then((result: any) => log("info", `[download] result: ${JSON.stringify(result)}`))
    .catch((err: any) => {
      log("error", `[download] error: ${err?.message || err}`);
      origDownloadURL(dataURL, filename);
    });
}
