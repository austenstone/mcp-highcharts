import { App, PostMessageTransport, applyHostStyleVariables, applyDocumentTheme, applyHostFonts } from "@modelcontextprotocol/ext-apps";
import type { McpUiHostContext } from "@modelcontextprotocol/ext-apps";
import Highcharts from "highcharts";
import type { Options } from "highcharts";
import "virtual:highcharts-modules";

// Lazy-load the selected Highcharts theme (default: adaptive)
const themeModules = import.meta.glob(
  "/node_modules/highcharts/esm/themes/*.src.js",
) as Record<string, () => Promise<unknown>>;

const userOverrides = (window as unknown as Record<string, unknown>).__HIGHCHARTS_OPTIONS__ as Options | undefined;

const themeName =
  (window as unknown as Record<string, unknown>).__HIGHCHARTS_THEME_NAME__ as string | undefined
  ?? "adaptive";

// When user provides full custom options, skip the built-in theme entirely
const themeKey = `/node_modules/highcharts/esm/themes/${themeName}.src.js`;
const themeReady = (userOverrides
  ? Promise.resolve()
  : themeModules[themeKey]?.() ?? Promise.resolve()
).then(() => {
  Highcharts.setOptions({
    credits: { enabled: false },
    exporting: { enabled: false },
  });
  if (userOverrides) {
    Highcharts.setOptions(userOverrides);
  }
});

/**
 * Sync host theme to adaptive theme's forced class + bridge CSS vars.
 */
function applyHostTheme(ctx: McpUiHostContext | null | undefined) {
  if (!ctx) return;

  const root = document.documentElement;

  // Apply MCP SDK theme helpers
  if (ctx.theme) {
    applyDocumentTheme(ctx.theme);
  }

  // Force adaptive theme mode via class names
  if (ctx.theme === "dark") {
    root.classList.add("highcharts-dark");
    root.classList.remove("highcharts-light");
  } else {
    root.classList.add("highcharts-light");
    root.classList.remove("highcharts-dark");
  }

  // Apply host style variables
  if (ctx.styles?.variables) {
    applyHostStyleVariables(ctx.styles.variables);
  }

  // Apply host fonts
  if (ctx.styles?.css?.fonts) {
    applyHostFonts(ctx.styles.css.fonts);
  }

  const vars = ctx.styles?.variables;
  if (!vars) return;

  // CSS variable bridge: MCP host tokens → Highcharts adaptive theme CSS vars
  const cssVarMap: Record<string, string | undefined> = {
    "--highcharts-background-color": vars["--color-background-primary"],
    "--highcharts-neutral-color-100": vars["--color-text-primary"],
    "--highcharts-neutral-color-80": vars["--color-text-secondary"],
    "--highcharts-neutral-color-60": vars["--color-text-tertiary"],
    "--highcharts-neutral-color-40": vars["--color-border-primary"],
    "--highcharts-neutral-color-20": vars["--color-border-secondary"],
    "--highcharts-neutral-color-10": vars["--color-border-tertiary"],
    "--highcharts-neutral-color-5": vars["--color-background-secondary"],
    "--highcharts-neutral-color-3": vars["--color-background-tertiary"],
    "--highcharts-highlight-color-100": vars["--color-ring-primary"],
    "--highcharts-highlight-color-80": vars["--color-ring-info"],
    "--highcharts-highlight-color-60": vars["--color-background-info"],
    "--highcharts-highlight-color-20": vars["--color-border-info"],
    "--highcharts-highlight-color-10": vars["--color-background-secondary"],
    "--highcharts-positive-color": vars["--color-text-success"],
    "--highcharts-negative-color": vars["--color-text-danger"],
  };

  for (const [hcVar, value] of Object.entries(cssVarMap)) {
    if (value) root.style.setProperty(hcVar, value);
  }

  // Font family via setOptions
  const fontFamily = vars["--font-sans"];
  if (fontFamily) {
    Highcharts.setOptions({
      chart: { style: { fontFamily } },
    });
  }
}

function applyThemeAndRedraw(ctx: McpUiHostContext | null | undefined) {
  if (!userOverrides) {
    applyHostTheme(ctx);
    Highcharts.charts.forEach(c => c?.redraw());
  }
}

async function init() {
  await themeReady;

  const app = new App(
    { name: "Highcharts MCP App", version: "1.0.0" },
    {},
  );

  app.ontoolresult = (result) => {
    const textContent = result.content?.find((c: any) => c.type === "text") as { text: string } | undefined;
    const text = textContent?.text;
    if (!text) return;
    try {
      const opts = JSON.parse(text) as Options & Record<string, unknown>;
      if (typeof opts.title === "string") opts.title = { text: opts.title };
      if (typeof opts.subtitle === "string") opts.subtitle = { text: opts.subtitle };

      const container = document.getElementById("root")!;
      container.innerHTML = "";
      Highcharts.chart(container, opts);
    } catch (e) {
      console.error("Failed to parse chart data:", e);
    }
  };

  app.onhostcontextchanged = (ctx) => {
    applyThemeAndRedraw(ctx);
  };

  app.onerror = console.error;

  await app.connect(new PostMessageTransport(window.parent, window));

  // Apply initial host theme
  applyThemeAndRedraw(app.getHostContext());
}

init().catch(console.error);
