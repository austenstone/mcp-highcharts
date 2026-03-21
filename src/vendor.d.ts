// Type declarations for packages with non-standard type exports

declare module "@highcharts/dashboards" {
  import type { Board } from "@highcharts/dashboards/dashboards";
  export * from "@highcharts/dashboards/dashboards";
  export default Board;
}

declare module "@highcharts/dashboards/modules/layout" {
  const layout: unknown;
  export default layout;
}

declare module "@highcharts/grid-lite" {
  const GridLite: {
    grid(container: string | HTMLElement, options: Record<string, unknown>): unknown;
  };
  export default GridLite;
}
