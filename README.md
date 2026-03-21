# mcp-highcharts

Interactive Highcharts MCP App for VS Code — render charts inline in AI chat conversations.

Built with [MCP Apps SDK](https://github.com/modelcontextprotocol/ext-apps) + React + [Highcharts](https://www.highcharts.com/).

## Features

- **17 chart types**: line, bar, column, area, pie, spline, areaspline, scatter, heatmap, gauge, solidgauge, treemap, sunburst, sankey, funnel, networkgraph + any type via `highchartsOptions`
- **GitHub Primer theme**: Colors, typography, axes, and tooltips match [github/github-ui chart-card](https://github.com/github/github-ui/tree/main/packages/chart-card)
- **Primer data-viz accessibility**: Auto-cycling dash styles + marker shapes per [primer.style/product/ui-patterns/data-visualization](https://primer.style/product/ui-patterns/data-visualization/)
- **Stacking**: `normal` and `percentage` stacked bar/area/column
- **Height presets**: `small`, `medium`, `large`, `xl` (matching chart-card sizes)
- **Y-axis formatting**: `${value}`, `{value}%`, `{value}K`
- **Drilldown**: Click-to-drill sub-category data
- **Export**: PNG, SVG, CSV, data table (via Highcharts modules)
- **Accessibility**: Screen reader support, keyboard navigation, ARIA
- **Boost**: WebGL rendering for 100K+ data points
- **Dark/light mode**: Adapts via `prefers-color-scheme`
- **`highchartsOptions` escape hatch**: Deep-merge any valid Highcharts config
- **Combined chart types**: Set `type` per-series to mix line + column, area + scatter, etc.

## Setup

Add to your VS Code MCP config (`.vscode/mcp.json` or user `mcp.json`):

```json
{
  "mcpServers": {
    "highcharts": {
      "command": "bash",
      "args": ["-c", "cd ~/source/mcp-highcharts && npm run build >&2 && node dist/main.js --stdio"]
    }
  }
}
```

## Usage

Just ask your AI agent to render a chart:

> "Render a line chart of monthly Actions spend for CaptivateIQ"

The LLM calls `render-chart` with series data and the chart renders inline.

## Tool Schema

| Parameter | Type | Description |
|-----------|------|-------------|
| `chartType` | string | Chart type (default: `line`) |
| `title` | string | Chart title |
| `subtitle` | string | Chart subtitle |
| `series` | array | Highcharts series objects `[{name, data, type?}]` |
| `xAxisCategories` | string[] | X axis category labels |
| `xAxisTitle` | string | X axis title |
| `yAxisTitle` | string | Y axis title |
| `yAxisFormat` | string | Y axis label format (e.g. `${value}`, `{value}%`) |
| `stacking` | string | `normal` or `percentage` |
| `height` | string | `small`, `medium`, `large`, `xl`, or px number |
| `tooltipValueSuffix` | string | Suffix for tooltip values (e.g. ` USD`, `%`) |
| `tooltipValuePrefix` | string | Prefix for tooltip values (e.g. `$`) |
| `drilldown` | object | Highcharts drilldown config |
| `highchartsOptions` | object | Any Highcharts options (deep-merged) |

### Combined Chart Types

Set `type` on individual series to mix chart types:

```json
{
  "chartType": "column",
  "series": [
    { "name": "Revenue", "data": [10, 20, 30], "type": "column" },
    { "name": "Trend", "data": [12, 18, 28], "type": "spline" }
  ]
}
```

## Theme

Edit [`src/theme.ts`](src/theme.ts) to customize globally. Colors use GitHub Primer `data-*-color-emphasis` tokens in the same order as `github/github-ui` chart-card.

## Development

```bash
npm install
npm run dev     # watch mode + HTTP server
npm run build   # production build
```

## License

MIT
