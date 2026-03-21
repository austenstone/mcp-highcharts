# mcp-highcharts

Render interactive [Highcharts](https://www.highcharts.com/) charts inline in AI chat — right inside VS Code, GitHub Copilot, Claude Desktop, or any MCP client that supports [MCP Apps](https://github.com/modelcontextprotocol/ext-apps).

Just ask your AI to make a chart. It does the rest.

<!-- TODO: add screenshot/gif here -->

## Quick Start

Add to your MCP config (`.vscode/mcp.json`, Claude Desktop, etc.):

```json
{
  "servers": {
    "highcharts": {
      "command": "npx",
      "args": ["-y", "mcp-highcharts@latest", "--stdio"]
    }
  }
}
```

That's it. No API keys, no build steps, no config.

## Usage

Ask your AI agent to render a chart in natural language:

- *"Show a bar chart of Q1-Q4 revenue"*
- *"Pie chart of browser market share"*
- *"Line chart comparing 2025 vs 2026 sales with a trend line"*
- *"Render a sankey diagram of our deployment pipeline"*
- *"Heatmap of commits by day of week and hour"*

The LLM calls the `render-chart` tool with Highcharts options, and the chart renders inline in chat.

### 50+ Chart Types

All Highcharts modules are bundled into a single self-contained HTML file at build time via a [custom Vite plugin](vite-plugin-highcharts-modules.ts). Every extension module is loaded in the correct dependency order — no extra config needed. The LLM just sets `chart.type` or `series[].type` and it works.

| Category | Types |
|----------|-------|
| **Core** | line, area, spline, areaspline, column, bar, scatter, pie |
| **More** | arearange, areasplinerange, boxplot, bubble, columnrange, columnpyramid, errorbar, gauge, packedbubble, polygon, waterfall |
| **Maps** | map, mapbubble, mapline, mappoint, flowmap, geoheatmap, tiledwebmap |
| **Flow** | sankey, dependency-wheel, arc-diagram, organization |
| **Specialized** | wordcloud, timeline, treegraph, treemap, sunburst, networkgraph, funnel, solid-gauge, venn, variwide, heatmap, histogram, bellcurve, bullet, dumbbell, lollipop, streamgraph, tilemap, xrange, pictorial, pareto, item-series, windbarb, vector |

Modules with dependencies (e.g., `funnel3d` → `highcharts-3d` → `cylinder`) are auto-resolved. You can also limit which modules are included by setting `HIGHCHARTS_MODULES` at build time:

```bash
# Only include what you need (dependencies are auto-added)
HIGHCHARTS_MODULES=sankey,heatmap,funnel npm run build
```

By default, all modules are included (~1.5 MB inlined HTML).

### Mix Chart Types

Set `type` per-series to combine different visualizations:

```jsonc
// The LLM generates this — you just ask for it
{
  "chart": { "type": "column" },
  "title": "Revenue vs Trend",
  "series": [
    { "name": "Revenue", "data": [10, 20, 30], "type": "column" },
    { "name": "Trend", "data": [12, 18, 28], "type": "spline" }
  ]
}
```

## Tool Schema

The `render-chart` tool accepts any valid [Highcharts Options](https://api.highcharts.com/highcharts/) object. Key properties:

| Property | Type | Description |
|----------|------|-------------|
| `chart` | object | `{ type, height }` — chart type and dimensions |
| `title` | string \| object | Chart title (string shorthand or `{ text, style }`) |
| `subtitle` | string \| object | Chart subtitle |
| `series` | array | `[{ type?, name, data, color? }]` — the data |
| `xAxis` | object | Categories, datetime, labels, title |
| `yAxis` | object | Title, format (`{value}%`, `${value}`), min/max |
| `tooltip` | object | `{ valueSuffix, valuePrefix, shared }` |
| `plotOptions` | object | Stacking (`normal`, `percentage`), data labels |
| `legend` | object | Position, layout, enabled |
| `colors` | string[] | Custom color palette |
| `colorAxis` | object | For heatmaps, choropleth |
| `pane` | object | For gauges, polar charts |
| `drilldown` | object | Click-to-drill sub-category data |

Any valid Highcharts config property works — the schema is intentionally open to give the LLM full access to the Highcharts API.

## Features

- **Adaptive theme** — Automatically matches your VS Code color scheme (light/dark) using Highcharts' built-in [adaptive theme](https://www.highcharts.com/docs/chart-design-and-style/themes)
- **15 built-in themes** — Set `HIGHCHARTS_THEME` to any Highcharts theme name
- **Dark/light mode** — Syncs with VS Code's theme via the MCP Apps host context
- **Export** — PNG, SVG, CSV, data table via Highcharts exporting module
- **Boost** — WebGL rendering for 100K+ data points
- **Custom themes** — Override via `HIGHCHARTS_THEME` env var (theme name, inline JSON, or file path)

## Themes

Set `HIGHCHARTS_THEME` to a built-in theme name, inline JSON, or a file path:

```json
{
  "servers": {
    "highcharts": {
      "command": "npx",
      "args": ["-y", "mcp-highcharts@latest", "--stdio"],
      "env": {
        "HIGHCHARTS_THEME": "dark-unica"
      }
    }
  }
}
```

Available built-in themes:

| Theme | Description |
|-------|-------------|
| `adaptive` | **(default)** Auto light/dark based on OS/VS Code preference |
| `dark-unica` | Dark theme with blue accents |
| `dark-blue` | Dark blue background |
| `dark-green` | Dark green background |
| `brand-dark` | Highcharts brand colors on dark |
| `brand-light` | Highcharts brand colors on light |
| `high-contrast-dark` | High contrast dark mode |
| `high-contrast-light` | High contrast light mode |
| `avocado` | Green-toned light theme |
| `gray` | Neutral gray theme |
| `grid` | Grid-focused layout |
| `grid-light` | Light grid theme |
| `sand-signika` | Warm sand tones |
| `skies` | Sky blue gradient |
| `sunset` | Warm sunset colors |

For fully custom themes, pass inline JSON or a file path:

```json
{
  "env": {
    "HIGHCHARTS_THEME": "{\"colors\":[\"#ff6384\",\"#36a2eb\",\"#ffce56\"]}"
  }
}
```

The theme object is any valid [Highcharts.setOptions()](https://api.highcharts.com/class-reference/Highcharts#.setOptions) config.

## Transports

| Transport | Usage |
|-----------|-------|
| **stdio** (default) | `npx mcp-highcharts --stdio` |
| **Streamable HTTP** | `npx mcp-highcharts` → listens on `http://localhost:3001/mcp` |

Set the HTTP port with `PORT` env var.

## Development

```bash
npm install
npm run dev       # watch + HTTP server
npm run build     # production build
npm run test      # run tests
npm run test:e2e  # e2e tests
```

## License

MIT
