import type { Options } from "highcharts";

/**
 * Global Highcharts theme. Edit this file to change the look and feel
 * of every chart rendered by the MCP App.
 *
 * Applied via `Highcharts.setOptions(theme)` before any chart renders.
 * Any property here can be overridden per-chart via the tool's `highchartsOptions`.
 */
export const theme: Options = {
  colors: [
    "#2563eb", // blue-600
    "#16a34a", // green-600
    "#ea580c", // orange-600
    "#9333ea", // purple-600
    "#dc2626", // red-600
    "#0891b2", // cyan-600
    "#ca8a04", // yellow-600
    "#db2777", // pink-600
    "#4f46e5", // indigo-600
    "#0d9488", // teal-600
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
