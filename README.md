# mcp-highcharts

Render interactive [Highcharts](https://www.highcharts.com/) charts inline in AI chat — right inside VS Code, GitHub Copilot, Claude Desktop, or any MCP client that supports [MCP Apps](https://modelcontextprotocol.io/extensions/apps/overview).

Just ask your AI to make a chart. It does the rest.

[![Install in VS Code](https://img.shields.io/badge/VS_Code-Install_MCP_Server-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=mcp-highcharts&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22mcp-highcharts%40latest%22%2C%22--stdio%22%5D%7D)
[![npm](https://img.shields.io/npm/v/mcp-highcharts?style=flat-square)](https://www.npmjs.com/package/mcp-highcharts)

## Features

- **119 chart types** — line, bar, column, pie, scatter, heatmap, sankey, gauge, treemap, wordcloud, network graph, timeline, and [many more](https://www.highcharts.com/demo)
- **Multiple charts** — render dashboards with vertical, horizontal, or grid layouts
- **Mixed/overlay charts** — combine column + line, dual Y-axes, any combination
- **Full Highcharts API** — every option from [api.highcharts.com](https://api.highcharts.com/highcharts/) is supported
- **Lazy module loading** — only loads the Highcharts modules needed for your chart type
- **Auto-generated schema** — chart types and module map regenerated from Highcharts on every build
- **Adaptive theming** — respects host dark/light mode via CSS variables
- **Custom themes** — JSON file or inline options via environment variable
- **Accessibility** — built-in screen reader support
- **Export** — PNG, SVG, PDF download
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

Render a single interactive chart. Input is any valid [Highcharts Options](https://api.highcharts.com/highcharts/) object.

**Key properties:** `chart` (type, height), `title`, `subtitle`, `series`, `xAxis`, `yAxis`, `tooltip`, `plotOptions`, `legend`, `colors`, `colorAxis`, `pane`, `drilldown`

**String shorthand:** `title` and `subtitle` accept plain strings — `"Revenue"` becomes `{ text: "Revenue" }`.

```
Show me a bar chart of Q1-Q4 revenue: 100, 200, 300, 400
```

### `render_charts`

Render multiple charts in a single view.

```
Show me a dashboard with:
1. A pie chart of market share (Chrome 65%, Firefox 20%, Safari 15%)
2. A line chart of monthly growth (Jan-Jun: 10, 15, 20, 28, 35, 42)
3. A gauge showing 95% uptime
Use a 2-column grid layout.
```

**Layout options:**
- `vertical` — stacked (default)
- `horizontal` — side by side
- `grid` — auto-grid with configurable columns

### Mixed / Overlay Charts

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

## Theming

Charts automatically adapt to your host's light/dark mode.

### Custom theme via environment variable

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

**Inline JSON:**
```
HIGHCHARTS_OPTIONS='{"chart":{"backgroundColor":"#0d1117"},"colors":["#006edb","#30a147"]}'
```

**Built-in themes** (15 available):
```
HIGHCHARTS_THEME=dark-unica
```

Available: `adaptive`, `avocado`, `brand-dark`, `brand-light`, `dark-blue`, `dark-green`, `dark-unica`, `gray`, `grid`, `grid-light`, `high-contrast-dark`, `high-contrast-light`, `sand-signika`, `skies`, `sunset`

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
npm test         # e2e tests via MCP SDK client
npm run dev      # watch mode
```

### Architecture

- **`server.ts`** — MCP server with `render_chart` and `render_charts` tools
- **`src/mcp-app.ts`** — Client-side app: receives tool results, lazy-loads Highcharts modules, renders charts
- **`src/module-loader.ts`** — Dynamic module loading using `import.meta.glob` + auto-generated type→module map
- **`src/input-schema.ts`** — Rich Zod 4 schema with typed fields, examples, and passthrough for full API access
- **`scripts/generate-schema.ts`** — Scans Highcharts package to generate chart types, module map, and Options fields
- **`vite.config.ts`** — Builds self-contained HTML for the MCP App

### Updating Highcharts

```bash
npm update highcharts
npm run build  # regenerates everything automatically
```

Zero manual maintenance — chart types, module mappings, and schema are all derived from the installed Highcharts version.

## License

MIT
