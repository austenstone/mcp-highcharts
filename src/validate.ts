/**
 * Server-side validation helpers for Highcharts options.
 *
 * Not a replacement for Highcharts runtime validation — these are
 * lightweight checks that catch common LLM mistakes and return
 * actionable feedback in the same tool result turn.
 */
import { inputSchema } from "./input-schema.js";

const KNOWN_TOP_KEYS = new Set(Object.keys(inputSchema));

// Also accept Highcharts internal keys that aren't in our schema
const INTERNAL_KEYS = new Set(["__chartType"]);

/** Levenshtein distance for typo detection */
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/** Find the closest known key to a typo */
function closestKey(typo: string): string | null {
  let best: string | null = null;
  let bestDist = Infinity;
  const maxDist = Math.max(2, Math.floor(typo.length * 0.4));

  for (const key of KNOWN_TOP_KEYS) {
    const dist = levenshtein(typo.toLowerCase(), key.toLowerCase());
    if (dist < bestDist && dist <= maxDist) {
      bestDist = dist;
      best = key;
    }
  }
  return best;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

/**
 * Validate chart options and return warnings (not errors).
 * Never blocks rendering — just provides LLM-actionable feedback.
 */
export function validateOptions(opts: Record<string, unknown>): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  // 1. Typo detection — unknown top-level keys
  for (const key of Object.keys(opts)) {
    if (KNOWN_TOP_KEYS.has(key) || INTERNAL_KEYS.has(key)) continue;
    const suggestion = closestKey(key);
    warnings.push({
      field: key,
      message: `Unknown option "${key}"${suggestion ? `. Did you mean "${suggestion}"?` : " — will be silently ignored by Highcharts."}`,
      suggestion: suggestion ?? undefined,
    });
  }

  // 2. Series validation
  const series = opts.series;
  if (series !== undefined) {
    if (!Array.isArray(series)) {
      warnings.push({
        field: "series",
        message: `series must be an array, got ${typeof series}`,
        suggestion: "Wrap in array: series: [{ name: '...', data: [...] }]",
      });
    } else {
      for (let i = 0; i < series.length; i++) {
        const s = series[i];
        if (s && typeof s === "object") {
          // data must be an array if present
          if (s.data !== undefined && !Array.isArray(s.data)) {
            warnings.push({
              field: `series[${i}].data`,
              message: `data must be an array, got ${typeof s.data}. Use number[], [x,y][], or {name,y}[] format.`,
              suggestion: "series: [{ data: [1, 2, 3] }] or series: [{ data: [[0,1], [1,2]] }]",
            });
          }
          // Empty data array with data module active → we handle this, but warn
          if (Array.isArray(s.data) && s.data.length === 0 && !opts.data) {
            warnings.push({
              field: `series[${i}].data`,
              message: "Empty data array — chart will render with no points. Provide data or use data module (data.csvURL).",
            });
          }
          // String data values
          if (Array.isArray(s.data)) {
            const strIdx = s.data.findIndex((d: unknown) => typeof d === "string" && d !== "");
            if (strIdx !== -1) {
              warnings.push({
                field: `series[${i}].data[${strIdx}]`,
                message: `Data contains string value "${s.data[strIdx]}" — Highcharts expects numbers. Use xAxis.categories for labels.`,
                suggestion: 'Move labels to xAxis: { categories: [...] } and use numeric data values.',
              });
            }
          }
        }
      }
    }
  }

  // 3. Data module validation
  const data = opts.data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const d = data as Record<string, unknown>;
    if (d.enablePolling && !d.csvURL && !d.rowsURL && !d.columnsURL) {
      warnings.push({
        field: "data.enablePolling",
        message: "enablePolling is true but no data URL specified. Set csvURL, rowsURL, or columnsURL.",
      });
    }
  }

  // 4. Chart type check (if not using Zod enum validation)
  const chart = opts.chart;
  if (chart && typeof chart === "object") {
    const type = (chart as Record<string, unknown>).type;
    if (type && typeof type === "string") {
      // We rely on Zod enum for this, but add a friendlier message
      // if it somehow gets through
    }
  }

  return warnings;
}

/**
 * Format warnings into a string for inclusion in tool result text.
 */
export function formatWarnings(warnings: ValidationWarning[]): string {
  if (warnings.length === 0) return "";
  const lines = warnings.map(w =>
    `⚠️ ${w.field}: ${w.message}${w.suggestion ? `\n   Fix: ${w.suggestion}` : ""}`
  );
  return "\n\n" + lines.join("\n");
}
