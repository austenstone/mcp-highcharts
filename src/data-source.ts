/**
 * Data source reader: loads CSV, TSV, or JSON from file paths or URLs.
 * No external dependencies — simple parsing only.
 */
import fs from "node:fs/promises";

export interface TabularData {
  headers: string[];
  rows: any[][];
}

export type ParsedData =
  | { kind: "tabular"; data: TabularData }
  | { kind: "json"; data: unknown };

function detectFormat(source: string, content?: string): "csv" | "tsv" | "json" {
  const lower = source.toLowerCase();
  if (lower.endsWith(".csv")) return "csv";
  if (lower.endsWith(".tsv")) return "tsv";
  if (lower.endsWith(".json")) return "json";
  // Sniff content
  if (content) {
    const trimmed = content.trimStart();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) return "json";
    // Check if tabs are more common than commas
    const firstLine = trimmed.split("\n")[0] || "";
    if (firstLine.includes("\t")) return "tsv";
  }
  return "csv";
}

function coerce(value: string): string | number {
  const trimmed = value.trim();
  if (trimmed === "") return trimmed;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : trimmed;
}

function parseDelimited(content: string, delimiter: string): TabularData {
  const lines = content.trim().split(/\r?\n/).filter(l => l.trim() !== "");
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = lines[0].split(delimiter).map(h => h.trim());
  const rows = lines.slice(1).map(line =>
    line.split(delimiter).map(cell => coerce(cell))
  );
  return { headers, rows };
}

async function readSource(source: string): Promise<string> {
  if (/^https?:\/\//i.test(source)) {
    const resp = await fetch(source);
    if (!resp.ok) throw new Error(`Failed to fetch ${source}: ${resp.status}`);
    return resp.text();
  }
  return fs.readFile(source, "utf-8");
}

export async function loadDataSource(source: string): Promise<ParsedData> {
  const content = await readSource(source);
  const format = detectFormat(source, content);

  if (format === "json") {
    return { kind: "json", data: JSON.parse(content) };
  }

  const delimiter = format === "tsv" ? "\t" : ",";
  return { kind: "tabular", data: parseDelimited(content, delimiter) };
}

/**
 * Auto-generate Highcharts series and xAxis categories from parsed data.
 * Only called when the tool args don't already have series[].data populated.
 */
export function autoGenerateSeries(
  parsed: ParsedData,
  existingSeries?: any[],
): { series: any[]; xAxis?: { categories: string[] } } {
  if (parsed.kind === "tabular") {
    const { headers, rows } = parsed.data;
    if (headers.length < 2) return { series: existingSeries || [] };

    const categories = rows.map(r => String(r[0]));
    const series: any[] = [];

    for (let col = 1; col < headers.length; col++) {
      const base = existingSeries?.[col - 1] || {};
      series.push({
        ...base,
        name: base.name || headers[col],
        data: rows.map(r => r[col]),
      });
    }
    return { series, xAxis: { categories } };
  }

  // JSON: array of objects → keys become series
  if (parsed.kind === "json" && Array.isArray(parsed.data)) {
    const arr = parsed.data as Record<string, unknown>[];
    if (arr.length === 0) return { series: existingSeries || [] };

    const keys = Object.keys(arr[0]);
    if (keys.length < 2) return { series: existingSeries || [] };

    const categoryKey = keys[0];
    const categories = arr.map(obj => String(obj[categoryKey]));
    const series: any[] = [];

    for (let i = 1; i < keys.length; i++) {
      const key = keys[i];
      const base = existingSeries?.[i - 1] || {};
      series.push({
        ...base,
        name: base.name || key,
        data: arr.map(obj => {
          const v = obj[key];
          return typeof v === "number" ? v : Number(v) || v;
        }),
      });
    }
    return { series, xAxis: { categories } };
  }

  return { series: existingSeries || [] };
}
