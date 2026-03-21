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

Every Highcharts series type is supported — including all extension modules:

| Category | Types |
|----------|-------|
| **Core** | line, area, spline, areaspline, column, bar, scatter, pie |
| **More** | arearange, areasplinerange, boxplot, bubble, columnrange, columnpyramid, errorbar, gauge, packedbubble, polygon, waterfall |
| **Maps** | map, mapbubble, mapline, mappoint, flowmap, geoheatmap, tiledwebmap |
| **Flow** | sankey, dependency-wheel, arc-diagram, organization |
| **Specialized** | wordcloud, timeline, treegraph, treemap, sunburst, networkgraph, funnel, solid-gauge, venn, variwide, heatmap, histogram, bellcurve, bullet, dumbbell, lollipop, streamgraph, tilemap, xrange, pictorial, pareto, item-series, windbarb, vector |

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

- **GitHub Primer theme** — Colors, typography, and axes match [Primer data visualization](https://primer.style/product/ui-patterns/data-visualization/) patterns out of the box
- **Accessibility built-in** — Auto-cycling dash styles + marker shapes per series, screen reader support, keyboard navigation
- **Dark/light mode** — Adapts automatically via `prefers-color-scheme`
- **Export** — PNG, SVG, CSV, data table via Highcharts exporting module
- **Boost** — WebGL rendering for 100K+ data points
- **Custom themes** — Override via `HIGHCHARTS_THEME` env var (inline JSON or file path)

## Custom Theme

You can override the default Primer theme by setting `HIGHCHARTS_THEME` in your MCP config:

```json
{
  "servers": {
    "highcharts": {
      "command": "npx",
      "args": ["-y", "mcp-highcharts@latest", "--stdio"],
      "env": {
        "HIGHCHARTS_THEME": "{\"colors\":[\"#ff6384\",\"#36a2eb\",\"#ffce56\"]}"
      }
    }
  }
}
```

Or point to a JSON file:

```json
{
  "env": {
    "HIGHCHARTS_THEME": "/path/to/my-theme.json"
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
