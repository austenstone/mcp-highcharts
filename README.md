# mcp-highcharts

Render interactive [Highcharts](https://www.highcharts.com/) charts inline in AI chat — right inside VS Code, GitHub Copilot, Claude Desktop, or any MCP client that supports [MCP Apps](https://modelcontextprotocol.io/extensions/apps/overview).

Just ask your AI to make a chart. It does the rest.

[![Install in VS Code](https://img.shields.io/badge/VS_Code-Install_MCP_Server-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=mcp-highcharts&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22mcp-highcharts%40latest%22%2C%22--stdio%22%5D%7D)
[![Install in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-Install_MCP_Server-24bfa5?style=flat-square&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=mcp-highcharts&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22mcp-highcharts%40latest%22%2C%22--stdio%22%5D%7D&quality=insider)
[![npm](https://img.shields.io/npm/v/mcp-highcharts?style=flat-square)](https://www.npmjs.com/package/mcp-highcharts)

![Code_-_Insiders_15uBYM8FHt](https://github.com/user-attachments/assets/39b9dc4b-1c12-455d-8e14-f6e87d1d1e3a)

## Features

- **6 specialized tools** — charts, stock, dashboards, maps, gantt, and data grids
- **65+ chart types** — line, bar, column, pie, scatter, heatmap, sankey, gauge, treemap, wordcloud, network graph, timeline, and [many more](https://www.highcharts.com/demo)
- **Full Highcharts API** — every option from [api.highcharts.com](https://api.highcharts.com/highcharts/) is supported
- **Lazy module loading** — only loads the Highcharts modules needed for your chart type
- **Auto-generated schema** — chart types, module map, and options schema regenerated from Highcharts on every build
- **Adaptive theming** — respects host dark/light mode via CSS variables
- **Custom themes** — 15 built-in themes or bring your own via JSON/JS
- **Color modes** — monochrome palettes from any base color via `colorMode`
- **Data sources** — read CSV/JSON/TSV files with `dataSource` (Highcharts `data.csv` module)
- **MCP Prompts** — 5 reusable slash commands for common charting tasks
- **Accessibility** — built-in screen reader support
- **Zero config** — `npx mcp-highcharts@latest --stdio` just works

## Quick Start

### VS Code / GitHub Copilot

Click the badge above, or add to your MCP config:

```json
{
  "mcp": {
    "servers": {
      "highcharts": {
        "command": "npx",
        "args": ["-y", "mcp-highcharts@latest", "--stdio"]
      }
    }
  }
}
```

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "highcharts": {
      "command": "npx",
      "args": ["-y", "mcp-highcharts@latest", "--stdio"]
    }
  }
}
```

## Tools

### `render_chart`

Render any interactive Highcharts chart. Input is a [Highcharts Options](https://api.highcharts.com/highcharts/) object.

Supports all 65+ chart types: line, bar, column, pie, scatter, spline, area, heatmap, treemap, sankey, gauge, funnel, waterfall, boxplot, wordcloud, networkgraph, sunburst, timeline, and more.

```
Show me a bar chart of Q1-Q4 revenue: 100, 200, 300, 400
```

**String shorthand:** `title` and `subtitle` accept plain strings — `"Revenue"` becomes `{ text: "Revenue" }`.

### `render_stock_chart`

Financial charts with navigator, range selector, and technical indicators.

```
Show me AAPL stock price as a candlestick chart with volume bars
```

Supports OHLC, candlestick, HLC, flags, and 40+ technical indicators. Dual y-axis for price + volume.

### `render_dashboard`

Multi-component dashboards with KPIs, charts, and data grids in a synced layout.

```
Create a sales dashboard with revenue KPI, monthly trend chart, and top products pie chart
```

Uses [@highcharts/dashboards](https://www.highcharts.com/docs/dashboards/installation) with data connectors and component sync.

### `render_map`

Geographic visualizations — choropleth maps, map bubbles, map points.

```
Show a world map colored by population density
```

Supports GeoJSON/TopoJSON inline, multiple projections, and map navigation.

### `render_gantt`

Project timelines with tasks, dependencies, milestones, and progress tracking.

```
Create a project timeline for a 3-month software release
```

### `render_grid`

Standalone data grids for tabular data display with sorting, filtering, and custom formatting.

```
Show a grid of the top 10 largest companies by market cap
```

Accepts data as columns (`Record<string, array>`) or rows (`array of objects`).

## Mixed / Overlay Charts

Combine chart types by setting `type` per series:

```json
{
  "series": [
    { "type": "column", "name": "Revenue", "data": [100, 200, 300] },
    { "type": "spline", "name": "Trend", "data": [150, 200, 250] }
  ]
}
```

Dual Y-axis:

```json
{
  "yAxis": [
    { "title": { "text": "Revenue ($)" } },
    { "title": { "text": "Growth (%)" }, "opposite": true }
  ],
  "series": [
    { "name": "Revenue", "data": [100, 200, 300], "yAxis": 0 },
    { "name": "Growth", "data": [10, 15, 20], "yAxis": 1 }
  ]
}
```

## Prompts

Reusable slash commands (available in VS Code as `/mcp.highcharts.<prompt>`):

| Prompt | Description |
|--------|-------------|
| `chart_from_data` | Paste data and get the best chart recommendation |
| `dashboard_layout` | Scaffold a multi-component dashboard |
| `stock_analysis` | Candlestick + volume + indicators template |
| `comparison_chart` | Side-by-side comparison patterns |
| `project_timeline` | Gantt chart with dependencies and milestones |

## Theming

Charts automatically adapt to your host's light/dark mode via the `adaptive` theme (default).

### Custom theme

**JSON file:**
```json
{
  "mcp": {
    "servers": {
      "highcharts": {
        "command": "npx",
        "args": ["-y", "mcp-highcharts@latest", "--stdio"],
        "env": {
          "HIGHCHARTS_OPTIONS": "./my-theme.json"
        }
      }
    }
  }
}
```

Supports `.json`, `.js`, `.mjs`, and `.ts` files (TypeScript requires `tsx` installed).

**Inline JSON:**
```
HIGHCHARTS_OPTIONS='{"chart":{"backgroundColor":"#0d1117"},"colors":["#006edb","#30a147"]}'
```

**Built-in themes** (15 available):
```
HIGHCHARTS_THEME=dark-unica
```

Available: `adaptive` (default), `avocado`, `brand-dark`, `brand-light`, `dark-blue`, `dark-green`, `dark-unica`, `gray`, `grid`, `grid-light`, `high-contrast-dark`, `high-contrast-light`, `sand-signika`, `skies`, `sunset`

### Color modes

Generate monochrome palettes from a single color:

```json
{ "colorMode": "monochrome-blue", "series": [{ "data": [1, 2, 3] }] }
```

Presets: `monochrome`, `monochrome-blue`, `monochrome-green`, `monochrome-purple`, `monochrome-red`, `monochrome-orange`, `monochrome-teal`

Or any CSS color: `"colorMode": "#7b68ee"`

## Data Sources

Read data from files instead of inlining it:

```json
{ "dataSource": "sales.csv", "chart": { "type": "line" } }
```

- **CSV/TSV** → injected as `data.csv` for Highcharts' built-in data module
- **JSON** → parsed and merged as series data
- **URLs** → HTTPS only (fetched server-side)
- Paths are sandboxed to the workspace directory

## HTTP Mode

For non-stdio transports:

```bash
npx mcp-highcharts@latest          # starts HTTP server on port 3001
PORT=8080 npx mcp-highcharts@latest  # custom port
```

MCP endpoint: `http://localhost:3001/mcp`

## Development

```bash
git clone https://github.com/austenstone/mcp-highcharts.git
cd mcp-highcharts
npm install
npm run build    # prebuild auto-generates schema + module map
npm test         # e2e tests
npm run dev      # watch mode
```

### Architecture

| File | Purpose |
|------|---------|
| `server.ts` | MCP server — 6 tools, 5 prompts, 1 app resource |
| `main.ts` | Entry point — stdio + Streamable HTTP transports |
| `src/mcp-app.ts` | Client-side app — theming, rendering, streaming preview |
| `src/module-loader.ts` | Dynamic module loading via `import.meta.glob` + type→module map |
| `src/input-schema.ts` | Rich Zod 4 schema with typed fields, examples, passthrough |
| `src/data-source.ts` | Sandboxed file reader for `dataSource` parameter |
| `scripts/generate-module-map.mjs` | Generates chart type → module mappings from Highcharts |
| `scripts/generate-schema.ts` | Generates chart types and options fields from Highcharts types |
| `scripts/generate-schema-from-tree.ts` | Downloads Highcharts API tree.json for schema enrichment |
| `vite.config.ts` | Builds self-contained HTML via vite-plugin-singlefile |

### Updating Highcharts

```bash
npm update highcharts @highcharts/dashboards @highcharts/grid-lite
npm run build  # regenerates everything automatically
```

Zero manual maintenance — chart types, module mappings, and schema are all derived from the installed Highcharts version.

## License

MIT
