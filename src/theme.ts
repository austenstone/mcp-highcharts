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
  // github/github-ui chart-card color order (Primer data-visualization tokens)
  colors: [
    "#006edb", // data-blue
    "#30a147", // data-green
    "#eb670f", // data-orange
    "#ce2c85", // data-pink
    "#b88700", // data-yellow
    "#df0c24", // data-red
    "#894ceb", // data-purple
    "#9d615c", // data-auburn
    "#179b9b", // data-teal
    "#808fa3", // data-gray
  ],

  chart: {
    backgroundColor: "transparent",
    animation: false,
    style: {
      fontFamily: "var(--fontStack-sansSerif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)",
      fontSize: "var(--text-body-size-small, 12px)",
      color: "var(--fgColor-default, #e5e7eb)",
    },
    spacing: [4, 0, 4, 0],
  },

  title: {
    style: {
      color: "var(--fgColor-default, #e5e7eb)",
      fontSize: "16px",
      fontWeight: "600",
    },
  },

  subtitle: {
    style: {
      color: "var(--fgColor-muted, #9ca3af)",
      fontSize: "12px",
    },
  },

  xAxis: {
    tickWidth: 0,
    lineWidth: 1,
    gridLineColor: "var(--borderColor-muted, #374151)",
    gridLineDashStyle: "Dash",
    lineColor: "var(--borderColor-default, #4b5563)",
    labels: {
      style: {
        color: "var(--fgColor-muted, #d1d5db)",
        fontSize: "var(--text-body-size-small, 11px)",
      },
    },
    title: {
      style: {
        color: "var(--fgColor-muted, #9ca3af)",
        fontSize: "var(--text-body-size-small, 11px)",
      },
    },
  },

  yAxis: {
    tickWidth: 0,
    lineWidth: 0,
    gridLineColor: "var(--borderColor-muted, #374151)",
    gridLineDashStyle: "Dash",
    labels: {
      style: {
        color: "var(--fgColor-muted, #d1d5db)",
        fontSize: "var(--text-body-size-small, 11px)",
      },
    },
    title: {
      style: {
        color: "var(--fgColor-muted, #9ca3af)",
        fontSize: "var(--text-body-size-small, 11px)",
      },
    },
  },

  legend: {
    itemStyle: {
      fontSize: "var(--text-body-size-small, 12px)",
      font: "var(--fontStack-sansSerif, system-ui)",
      color: "var(--fgColor-default, #d1d5db)",
    },
    align: "left",
    verticalAlign: "top",
    x: -8,
    y: -12,
    itemHoverStyle: {
      color: "var(--fgColor-default, #60a5fa)",
    },
  },

  tooltip: {
    backgroundColor: "var(--bgColor-default, #1f2937)",
    borderColor: "var(--borderColor-muted, #374151)",
    borderWidth: 1,
    borderRadius: 6,
    shadow: false,
    useHTML: true,
    style: {
      color: "var(--fgColor-default, #e5e7eb)",
      fontFamily: "var(--fontStack-sansSerif, system-ui)",
      fontSize: "var(--text-body-size-small, 12px)",
    },
  },

  navigation: {
    buttonOptions: {
      enabled: false,
    },
  },

  exporting: {
    fallbackToExportServer: false,
  },

  plotOptions: {
    series: {
      animation: false,
    },
    line: {
      lineWidth: 2,
      marker: { radius: 3 },
    },
    spline: {
      animation: false,
    },
    area: {
      fillOpacity: 0.15,
      lineWidth: 2,
      marker: { radius: 3 },
    },
    column: {
      borderColor: "var(--bgColor-default, transparent)",
      borderWidth: 1.5,
    },
    bar: {
      borderColor: "var(--bgColor-default, transparent)",
      borderWidth: 1.5,
    },
    pie: {
      borderWidth: 0,
      dataLabels: {
        color: "var(--fgColor-default, #e5e7eb)",
        style: { fontSize: "11px", textOutline: "none" },
      },
    },
  },

  credits: {
    enabled: false,
  },
};
