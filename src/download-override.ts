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
let _appInstance: { downloadFile: (params: any) => Promise<any> } | null = null;
let _canDownload = false;

export function setMcpApp(app: any, canDownload: boolean) {
  _appInstance = app;
  _canDownload = canDownload;
}

export function downloadURL(dataURL: string | URL, filename: string): void {
  if (!_canDownload || !_appInstance) {
    origDownloadURL(dataURL, filename);
    return;
  }

  const dataStr = String(dataURL);

  try {
    const mimeMatch = dataStr.match(/^data:([^;,]+)/);
    const mimeType = mimeMatch?.[1] || "application/octet-stream";
    const base64 = dataStr.split(",")[1];

    if (!base64) {
      origDownloadURL(dataURL, filename);
      return;
    }

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
      .catch(() => {
        origDownloadURL(dataURL, filename);
      });
  } catch {
    origDownloadURL(dataURL, filename);
  }
}
