import * as z from "zod";

import {
  optionsSchema as depth0Schema,
} from "./generated/highcharts-depth-0.gen.js";

import {
  optionsSchema as depth1Schema,
  dataOptionsSchema as depth1Data,
  tooltipOptionsSchema as depth1Tooltip,
  legendOptionsSchema as depth1Legend,
} from "./generated/highcharts-depth-1.gen.js";

import {
  optionsSchema as depth2Schema,
  dataOptionsSchema as depth2Data,
  tooltipOptionsSchema as depth2Tooltip,
  legendOptionsSchema as depth2Legend,
} from "./generated/highcharts-depth-2.gen.js";

// ── Extract shape from a lazy schema ──
function getShape(schema: any): Record<string, z.ZodTypeAny> {
  return schema?._zod?.def?.getter?.()?.shape ?? {};
}

// ── Build input schema for a given depth ──
function buildInputSchema(
  genSchema: any,
  genData?: z.ZodObject<any>,
  genTooltip?: z.ZodObject<any>,
  genLegend?: z.ZodObject<any>,
): Record<string, z.ZodTypeAny> {
  const shape = getShape(genSchema);

  const base: Record<string, z.ZodTypeAny> = Object.fromEntries(
    Object.entries(shape).map(([key, schema]) => [key, (schema as z.ZodTypeAny).optional()])
  );

  if (genTooltip && typeof (genTooltip as any).passthrough === "function") {
    base.tooltip = (genTooltip as z.ZodObject<any>).passthrough().optional()
      .describe("Tooltip configuration");
  }
  if (genLegend && typeof (genLegend as any).passthrough === "function") {
    base.legend = (genLegend as z.ZodObject<any>).passthrough().optional()
      .describe("Legend configuration");
  }
  if (genData && typeof (genData as any).extend === "function") {
    base.data = (genData as z.ZodObject<any>).extend({
      enablePolling: z.boolean().optional().describe("Poll the data URL periodically for live updates"),
      dataRefreshRate: z.number().optional().describe("Polling interval in seconds (default: 1)"),
    }).passthrough().optional()
      .describe("Highcharts data module config. For live data: set csvURL + enablePolling: true + dataRefreshRate");
  }

  return base;
}

// ── Pre-built schemas for each depth ──
// 0: truly minimal — just keys as z.any(), no descriptions, no examples
// 1: top-level with descriptions + examples, children are z.any() (default)
// 2: one level of typed children
// 3: two levels deep

const minimalSchema: Record<string, z.ZodTypeAny> = {
  ...Object.fromEntries(
    Object.keys(getShape(depth0Schema)).map(key => [key, z.any().optional()])
  ),
  series: z.any().optional(),
};

const schemasByDepth: Record<number, Record<string, z.ZodTypeAny>> = {
  0: minimalSchema,
  1: buildInputSchema(depth0Schema),
  2: buildInputSchema(depth1Schema, depth1Data as z.ZodObject<any>, depth1Tooltip as z.ZodObject<any>, depth1Legend as z.ZodObject<any>),
  3: buildInputSchema(depth2Schema, depth2Data as z.ZodObject<any>, depth2Tooltip as z.ZodObject<any>, depth2Legend as z.ZodObject<any>),
};

/** Get the input schema for a given depth (0-3). Defaults to 1. */
export function getInputSchema(depth: number): Record<string, z.ZodTypeAny> {
  return schemasByDepth[depth] ?? schemasByDepth[1];
}
