// Type declarations for @highcharts packages with non-standard ESM type resolution

declare module "@highcharts/dashboards" {
  interface DashboardsGlobals {
    HighchartsPlugin: {
      custom: {
        connectHighcharts(Highcharts: any): void;
      };
    };
    GridPlugin: {
      custom: {
        connectGrid(Grid: any): void;
      };
    };
    PluginHandler: {
      addPlugin(plugin: any): void;
    };
    board(
      container: string | HTMLElement,
      config: Record<string, unknown>,
      async?: boolean
    ): any;
  }
  const Dashboards: DashboardsGlobals;
  export default Dashboards;
}

declare module "@highcharts/dashboards/modules/layout" {
  const layout: unknown;
  export default layout;
}

declare module "@highcharts/dashboards/css/dashboards.css" {
  const content: string;
  export default content;
}

declare module "@highcharts/grid-lite" {
  interface GridLiteStatic {
    grid(container: string | HTMLElement, options: Record<string, unknown>): unknown;
  }
  const GridLite: GridLiteStatic;
  export default GridLite;
}

declare module "@highcharts/grid-lite/css/grid-lite.css" {
  const content: string;
  export default content;
}
