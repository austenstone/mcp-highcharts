# mcp-highcharts

Render interactive [Highcharts](https://www.highcharts.com/) charts inline in AI chat — VS Code, GitHub Copilot, Claude Desktop, or any MCP client with [MCP Apps](https://modelcontextprotocol.io/extensions/apps/overview) support.

[![Install in VS Code](https://img.shields.io/badge/VS_Code-Install_MCP_Server-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=mcp-highcharts&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22mcp-highcharts%40latest%22%2C%22--stdio%22%5D%7D)
[![Install in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-Install_MCP_Server-24bfa5?style=flat-square&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=mcp-highcharts&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22mcp-highcharts%40latest%22%2C%22--stdio%22%5D%7D&quality=insider)
[![npm](https://img.shields.io/npm/v/mcp-highcharts?style=flat-square)](https://www.npmjs.com/package/mcp-highcharts)

![Code_-_Insiders_15uBYM8FHt](https://github.com/user-attachments/assets/39b9dc4b-1c12-455d-8e14-f6e87d1d1e3a)

## Setup

Click a badge above, or add to your MCP config:

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

<details>
<summary>Claude Desktop</summary>

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
</details>

<details>
<summary>HTTP mode</summary>

```bash
npx mcp-highcharts@latest          # http://localhost:3001/mcp
PORT=8080 npx mcp-highcharts@latest  # custom port
```
</details>

## Tools

| Tool | Description |
|------|-------------|
| `render_chart` | Any chart type — line, bar, pie, scatter, heatmap, sankey, gauge, treemap, wordcloud, and [60+ more](https://www.highcharts.com/demo) |
| `render_stock_chart` | Financial charts with navigator, range selector, and 40+ technical indicators |
| `render_dashboard` | Multi-component layouts with charts, KPIs, and data grids |
| `render_map` | Choropleth maps, map bubbles, map points (auto-fetches map data from CDN) |
| `render_gantt` | Project timelines with tasks, dependencies, and milestones |
| `render_grid` | Standalone data tables with sorting, pagination, and formatting |

All tools accept the full [Highcharts Options API](https://api.highcharts.com/highcharts/). Title and subtitle accept string shorthand.

## Prompts

| Prompt | What it does |
|--------|-------------|
| `chart_from_data` | Paste data → get the best chart |
| `dashboard_layout` | Scaffold a dashboard |
| `stock_analysis` | Candlestick + volume + indicators |
| `comparison_chart` | Side-by-side comparison patterns |
| `project_timeline` | Gantt with dependencies |

## Configuration

### Theming

Charts auto-adapt to host light/dark mode. Override with environment variables:

```json
{
  "env": {
    "HIGHCHARTS_THEME": "dark-unica",
    "HIGHCHARTS_OPTIONS": "./my-theme.json"
  }
}
```

`HIGHCHARTS_OPTIONS` accepts `.json`, `.js`, `.mjs`, `.ts`, or inline JSON.

**Built-in themes:** `adaptive` (default), `avocado`, `brand-dark`, `brand-light`, `dark-blue`, `dark-green`, `dark-unica`, `gray`, `grid`, `grid-light`, `high-contrast-dark`, `high-contrast-light`, `sand-signika`, `skies`, `sunset`

### Schema detail

Controls how much type information is sent to the LLM:

```json
{ "env": { "SCHEMA_DETAIL": "basic" } }
```

| Level | Description |
|-------|-------------|
| `minimal` | Property names only — zero context overhead |
| `basic` (default) | Top-level types + descriptions + examples |
| `full` | Complete recursive Highcharts type tree |

### Color modes

Generate monochrome palettes: `"colorMode": "monochrome-blue"` or any CSS color like `"#7b68ee"`.

### Data sources

Read files instead of inlining data: `"dataSource": "sales.csv"`. Supports CSV, JSON, TSV, and HTTPS URLs. Paths are sandboxed to the workspace.

## Development

```bash
npm install && npm run build && npm test
```

Chart types, module mappings, and schemas are auto-generated from the installed Highcharts version — just `npm update highcharts` and rebuild.

## License

MIT
