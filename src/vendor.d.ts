// Type declarations for packages with non-standard type resolution

declare module "@highcharts/dashboards" {
  const HighchartsPlugin: {
    custom: {
      connectHighcharts(Highcharts: any): void;
    };
  };
  const PluginHandler: {
    addPlugin(plugin: any): void;
  };
  function board(
    container: string | HTMLElement,
    config: Record<string, unknown>,
    async?: boolean
  ): any;
  export { HighchartsPlugin, PluginHandler, board };
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
  const GridLite: {
    grid(container: string | HTMLElement, options: Record<string, unknown>): unknown;
  };
  export default GridLite;
}

declare module "@highcharts/grid-lite/css/grid-lite.css" {
  const content: string;
  export default content;
}
