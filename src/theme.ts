import type { Options } from "highcharts";

/**
 * Global Highcharts theme using GitHub Primer data visualization tokens.
 * Colors sourced from Primer's `data-*-color-emphasis` palette.
 * https://primer.style/foundations/color/overview
 *
 * Applied via `Highcharts.setOptions(theme)` before any chart renders.
 * Any property here can be overridden per-chart via the tool's `highchartsOptions`.
 */
export const theme: Options = {
  // Primer data-visualization emphasis colors (ordered for max contrast between adjacent series)
  colors: [
    "#006edb", // data-blue
    "#d43511", // data-coral
    "#30a147", // data-green
    "#894ceb", // data-purple
    "#eb670f", // data-orange
    "#179b9b", // data-teal
    "#ce2c85", // data-pink
    "#b88700", // data-yellow
    "#527a29", // data-lime
    "#a830e8", // data-plum
    "#9d615c", // data-auburn
    "#167e53", // data-pine
    "#866e04", // data-lemon
    "#808fa3", // data-gray
    "#856d4c", // data-brown
    "#64762d", // data-olive
    "#df0c24", // data-red
  ],

  chart: {
    backgroundColor: "transparent",
    style: {
      fontFamily:
        'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    spacingTop: 20,
    spacingBottom: 20,
  },

  title: {
    style: {
      color: "var(--vscode-foreground, #e5e7eb)",
      fontSize: "16px",
      fontWeight: "600",
    },
  },

  subtitle: {
    style: {
      color: "var(--vscode-descriptionForeground, #9ca3af)",
      fontSize: "12px",
    },
  },

  xAxis: {
    labels: {
      style: {
        color: "var(--vscode-foreground, #d1d5db)",
        fontSize: "11px",
      },
    },
    title: {
      style: {
        color: "var(--vscode-descriptionForeground, #9ca3af)",
      },
    },
    gridLineColor: "var(--vscode-editorWidget-border, #374151)",
    lineColor: "var(--vscode-editorWidget-border, #4b5563)",
    tickColor: "var(--vscode-editorWidget-border, #4b5563)",
  },

  yAxis: {
    labels: {
      style: {
        color: "var(--vscode-foreground, #d1d5db)",
        fontSize: "11px",
      },
    },
    title: {
      style: {
        color: "var(--vscode-descriptionForeground, #9ca3af)",
      },
    },
    gridLineColor: "var(--vscode-editorWidget-border, #374151)",
  },

  legend: {
    itemStyle: {
      color: "var(--vscode-foreground, #d1d5db)",
      fontWeight: "400",
      fontSize: "12px",
    },
    itemHoverStyle: {
      color: "var(--vscode-focusBorder, #60a5fa)",
    },
  },

  tooltip: {
    backgroundColor: "var(--vscode-editorWidget-background, #1f2937)",
    borderColor: "var(--vscode-editorWidget-border, #374151)",
    style: {
      color: "var(--vscode-foreground, #e5e7eb)",
      fontSize: "12px",
    },
    borderRadius: 6,
    shadow: false,
  },

  plotOptions: {
    series: {
      animation: {
        duration: 600,
      },
    },
    line: {
      lineWidth: 2,
      marker: { radius: 3 },
    },
    area: {
      fillOpacity: 0.15,
      lineWidth: 2,
      marker: { radius: 3 },
    },
    column: {
      borderWidth: 0,
      borderRadius: 3,
    },
    bar: {
      borderWidth: 0,
      borderRadius: 3,
    },
    pie: {
      borderWidth: 0,
      dataLabels: {
        color: "var(--vscode-foreground, #e5e7eb)",
        style: { fontSize: "11px", textOutline: "none" },
      },
    },
  },

  credits: {
    enabled: false,
  },
};
