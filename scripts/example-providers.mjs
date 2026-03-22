/**
 * Highcharts example providers for the Zod schema generator.
 *
 * Three swappable providers:
 *   - curated:  Static hand-picked examples (no network)
 *   - samples:  Scrape demo.js from Highcharts GitHub, parse full chart
 *               options, and distribute every top-level key to a shared bucket.
 *               One demo contributes examples to chart, tooltip, series, etc.
 *   - combined: Curated first, fill gaps from samples
 *
 * @typedef {Object} ExampleProvider
 * @property {(fieldPath: string, samples?: Array<{value: string}>) => Promise<any[]>} getExamples
 */

const SAMPLE_BASE = "https://raw.githubusercontent.com/highcharts/highcharts/master/samples/";

// Map GitHub directory names back to schema field names (dirs use lowercase)
const DIR_TO_SCHEMA = {
  xaxis: "xAxis",
  yaxis: "yAxis",
  plotoptions: "plotOptions",
  coloraxis: "colorAxis",
  "3d": "chart",
  "no-data-to-display": "noData",
};

// ── Parse a demo.js into a full Highcharts options object ──

// Default colors from Highcharts (used by demos that call getOptions().colors)
const HC_DEFAULT_COLORS = [
  "#2caffe", "#544fc5", "#00e272", "#fe6a35", "#6b8abc",
  "#d568fb", "#2ee0ca", "#fa4b42", "#feb56a", "#91e8e1",
];

function extractOptions(source) {
  const match = source.match(/(?:(?:const|let|var)\s+\w+\s*=\s*)?Highcharts\.(?:chart|stockChart|mapChart|ganttChart)\s*\(\s*['"][^'"]+['"]\s*,\s*/);
  if (!match) return null;

  const start = match.index + match[0].length;
  let depth = 0;
  let inString = false;
  let stringChar = "";

  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    const prev = i > 0 ? source[i - 1] : "";

    if (inString) {
      if (ch === stringChar && prev !== "\\") inString = false;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") {
      inString = true;
      stringChar = ch;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        const objStr = source.slice(start, i + 1);
        try {
          // Extract preceding variable declarations to include as context
          const preamble = source.slice(0, match.index);
          // Match const/let/var declarations (simple forms only)
          const varDecls = [];
          for (const m of preamble.matchAll(/(?:const|let|var)\s+(\w+)\s*=\s*(?:\[[\s\S]*?\]|'[^']*'|"[^"]*"|\d+|true|false|null)\s*[;,]/g)) {
            varDecls.push(m[0]);
          }
          const preambleCode = varDecls.join("\n");

          const fn = new Function("Highcharts", "Date", "Math", "document", "window",
            `${preambleCode}\nreturn (${objStr});`);
          const hcStub = {
            color: (c) => ({ get: () => c }),
            dateFormat: () => "",
            numberFormat: (n) => String(n),
            getJSON: () => {},
            merge: (...args) => Object.assign({}, ...args),
            getOptions: () => ({
              colors: HC_DEFAULT_COLORS,
              lang: { thousandsSep: ",", decimalPoint: "." },
            }),
            theme: {},
          };
          const docStub = { getElementById: () => null, querySelector: () => null };
          const winStub = { innerWidth: 800, innerHeight: 600 };
          return fn(hcStub, Date, Math, docStub, winStub);
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

// ── Strip noisy data from extracted examples ──

function stripForExample(obj) {
  if (typeof obj !== "object" || obj === null) return obj;
  if (Array.isArray(obj)) {
    // Truncate large arrays (data arrays are noisy)
    if (obj.length > 6) return obj.slice(0, 3);
    return obj.map(stripForExample);
  }
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    // Skip data arrays, functions, and DOM references
    if (k === "data" && Array.isArray(v) && v.length > 6) continue;
    if (typeof v === "function") continue;
    if (v instanceof Date) continue;
    result[k] = stripForExample(v);
  }
  return result;
}

// ── Fetch and parse a single demo ──

async function fetchDemo(samplePath) {
  try {
    const path = samplePath.endsWith("/") ? samplePath : samplePath + "/";
    const url = SAMPLE_BASE + path + "demo.js";
    const resp = await fetch(url);
    if (!resp.ok) return null;

    const source = await resp.text();
    // Only skip if the Highcharts.chart() call itself uses async patterns
    // (fetching data before rendering)
    if (source.includes("$.get") || source.includes("$.getJSON")) {
      return null;
    }
    // Skip files that use fetch() to load data before the chart call
    const chartCallIdx = source.search(/Highcharts\.(?:chart|stockChart|mapChart|ganttChart)\s*\(/);
    if (chartCallIdx >= 0) {
      const beforeChart = source.slice(0, chartCallIdx);
      if (beforeChart.includes("fetch(") || beforeChart.includes("await ")) {
        return null;
      }
    } else if (source.includes("fetch(") || source.includes("async ")) {
      return null;
    }

    return extractOptions(source);
  } catch {
    return null;
  }
}

// ── Batch-scrape provider: parse every demo and distribute to all fields ──

/**
 * Create a provider that scrapes demos and distributes every
 * parsed option value into dot-path buckets.
 *
 * @param {Object} [opts]
 * @param {number} [opts.maxPerField=3] Max examples per field
 * @returns {ExampleProvider}
 */
export function createSampleProvider(opts = {}) {
  const { maxPerField = 3 } = opts;

  /** @type {Map<string, any[]>} field → deduplicated examples */
  let buckets = null;

  async function buildBuckets(allSamples) {
    buckets = new Map();

    // Collect unique sample paths
    const seen = new Set();
    const paths = [];
    for (const s of allSamples) {
      if (!s.value || seen.has(s.value)) continue;
      if (s.products && !s.products.includes("highcharts")) continue;
      seen.add(s.value);
      paths.push(s.value);
    }

    // Fetch all demos in parallel
    const results = await Promise.all(paths.map(fetchDemo));

    // Distribute each parsed demo's leaf-level values into dot-path buckets
    const seenJson = new Map(); // dotPath → Set of JSON strings for dedup

    function addToBucket(dotPath, value) {
      if (value === undefined || value === null) return;
      if (typeof value === "function") return;

      if (!buckets.has(dotPath)) {
        buckets.set(dotPath, []);
        seenJson.set(dotPath, new Set());
      }

      const bucket = buckets.get(dotPath);
      if (bucket.length >= maxPerField) return;

      const json = JSON.stringify(value);
      if (json.length > 500) return;
      if (seenJson.get(dotPath).has(json)) return;

      seenJson.get(dotPath).add(json);
      bucket.push(value);
    }

    /**
     * Generic recursive walker. Distributes every value at its dot-path.
     * - Primitives → stored directly
     * - Objects → stored as stripped example AND recursed into children
     * - Arrays of objects → walk each item using parent key as prefix;
     *   if item has a `type` field, also store at {parent}.{type}
     * - Large arrays (>20 items, e.g. data) → skipped to avoid noise
     */
    function walk(obj, prefix, rootOpts) {
      if (!obj || typeof obj !== "object") return;

      for (const [key, value] of Object.entries(obj)) {
        if (value === undefined || value === null) continue;
        if (typeof value === "function") continue;

        const path = prefix ? `${prefix}.${key}` : key;

        if (Array.isArray(value)) {
          // Skip large arrays (data arrays, long point arrays)
          if (value.length > 20) continue;

          // Arrays of objects → walk into each item using parent key as prefix
          const hasObjects = value.some(v => v && typeof v === "object" && !Array.isArray(v));
          if (hasObjects) {
            for (const item of value) {
              if (!item || typeof item !== "object" || Array.isArray(item)) continue;
              // Walk children: series[0].name → series.name
              walk(item, path, rootOpts);

              // If item has a `type` discriminator, also store at {parent}.{type}
              // This handles series[{type:"column",...}] → series.column, plotOptions.column
              const itemType = item.type || (path === "series" ? rootOpts?.chart?.type : undefined);
              if (itemType && typeof itemType === "string") {
                const stripped = stripForExample(item);
                if (stripped && Object.keys(stripped).length > 0) {
                  delete stripped.type;
                  addToBucket(`${path}.${itemType}`, stripped);
                  // Mirror series types to plotOptions
                  if (path === "series") {
                    addToBucket(`plotOptions.${itemType}`, stripped);
                  }
                }
              }
            }
          } else {
            // Array of primitives → store the array itself
            addToBucket(path, stripForExample(value));
          }
        } else if (typeof value === "object") {
          // Store the whole object as an example (for z.any() leaf nodes)
          const stripped = stripForExample(value);
          if (stripped && Object.keys(stripped).length > 0) {
            addToBucket(path, stripped);
          }
          // Recurse into children
          walk(value, path, rootOpts);
        } else {
          // Primitive leaf
          addToBucket(path, value);
        }
      }
    }

    for (const fullOpts of results) {
      if (!fullOpts || typeof fullOpts !== "object") continue;
      walk(fullOpts, "", fullOpts);
    }
  }

  return {
    async getExamples(fieldPath, samples) {
      if (!buckets) {
        await buildBuckets(samples || []);
      }
      return buckets.get(fieldPath) || [];
    },

    async preload(allSamples) {
      if (!buckets) {
        await buildBuckets(allSamples);
      }
    },
  };
}

// ── Curated provider (static, no network) ──

const CURATED_EXAMPLES = {
  "chart.type": ["line", "column", "pie", "bar", "scatter", "area", "spline"],
  "chart.height": [400, "56%"],
  "chart.inverted": [true],
  "chart.polar": [true],
  "title.text": ["Monthly Revenue", "Sales Report", "Q4 Performance"],
  "title.align": ["left", "center"],
  "subtitle.text": ["Source: Company Data", "Click columns for details"],
  "tooltip.shared": [true],
  "tooltip.valueSuffix": [" units", " °C", " USD"],
  "tooltip.pointFormat": ["{series.name}: <b>{point.y}</b>"],
  "tooltip.split": [true],
  "legend.layout": ["vertical", "horizontal"],
  "legend.align": ["right", "center"],
  "legend.verticalAlign": ["middle", "bottom"],
  "legend.enabled": [false],
  "xAxis.categories": [["Jan", "Feb", "Mar", "Apr", "May", "Jun"]],
  "xAxis.type": ["datetime", "category"],
  "yAxis.title": [{ text: "Values" }, { text: "Temperature (°C)" }],
  "yAxis.min": [0],
  "plotOptions.series": [{ stacking: "normal" }, { stacking: "percent" }],
  "plotOptions.column": [{ borderRadius: 5 }],
  "data.csv": ["Category,Value\nA,10\nB,20\nC,30"],
  "data.csvURL": ["https://example.com/data.csv"],
  "data.enablePolling": [true],
  "colorAxis.minColor": ["#FFFFFF"],
  "colorAxis.maxColor": ["#006edb"],
  "colors": [["#006edb", "#30a147", "#eb670f", "#ce2c85", "#b88700"]],
};

export function createCuratedProvider() {
  return {
    async getExamples(fieldPath) {
      return CURATED_EXAMPLES[fieldPath] || [];
    },
    async preload() {},
  };
}

// ── GitHub directory discovery ──

/**
 * Discover sample paths from GitHub's samples/highcharts/ directory
 * using the Git Trees API (3 calls, no auth needed).
 *
 * Returns an array of { value, category } objects compatible with the
 * tree.json samples format.
 */
export async function discoverGitHubSamples() {
  // Step 1: Get root tree → find samples/
  const rootResp = await fetch(
    "https://api.github.com/repos/highcharts/highcharts/git/trees/master"
  );
  if (!rootResp.ok) throw new Error(`GitHub API ${rootResp.status}`);
  const root = await rootResp.json();
  const samplesEntry = root.tree.find((e) => e.path === "samples");
  if (!samplesEntry) return [];

  // Step 2: samples/ tree → find highcharts/ and unit-tests/
  const samplesResp = await fetch(
    `https://api.github.com/repos/highcharts/highcharts/git/trees/${samplesEntry.sha}`
  );
  if (!samplesResp.ok) return [];
  const samples = await samplesResp.json();

  const results = [];

  // Scrape samples/highcharts/
  const hcEntry = samples.tree.find((e) => e.path === "highcharts");
  if (hcEntry) {
    const hcResp = await fetch(
      `https://api.github.com/repos/highcharts/highcharts/git/trees/${hcEntry.sha}?recursive=1`
    );
    if (hcResp.ok) {
      const hc = await hcResp.json();
      for (const entry of hc.tree) {
        if (!entry.path.endsWith("/demo.js")) continue;
        const category = entry.path.split("/")[0];
        results.push({
          value: "highcharts/" + entry.path.replace(/\/demo\.js$/, "/"),
          _category: DIR_TO_SCHEMA[category] || category,
        });
      }
    }
  }

  // Scrape samples/unit-tests/
  const utEntry = samples.tree.find((e) => e.path === "unit-tests");
  if (utEntry) {
    const utResp = await fetch(
      `https://api.github.com/repos/highcharts/highcharts/git/trees/${utEntry.sha}?recursive=1`
    );
    if (utResp.ok) {
      const ut = await utResp.json();
      for (const entry of ut.tree) {
        if (!entry.path.endsWith("/demo.js")) continue;
        const category = entry.path.split("/")[0];
        results.push({
          value: "unit-tests/" + entry.path.replace(/\/demo\.js$/, "/"),
          _category: DIR_TO_SCHEMA[category] || category,
        });
      }
    }
  }

  return results;
}

// ── Combined provider ──

export function createCombinedProvider(opts = {}) {
  const curated = createCuratedProvider();
  const samples = createSampleProvider(opts);

  return {
    async getExamples(fieldPath, samplesList) {
      const curatedExamples = await curated.getExamples(fieldPath);
      if (curatedExamples.length > 0) return curatedExamples;
      return samples.getExamples(fieldPath, samplesList);
    },
    async preload(allSamples) {
      await samples.preload(allSamples);
    },
  };
}
