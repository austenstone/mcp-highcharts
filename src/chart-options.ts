import type { Options } from "highcharts";

/**
 * Normalize LLM output into valid Highcharts Options.
 * String shorthands for title/subtitle are the main thing the LLM sends.
 */
export function buildChartOptions(params: Record<string, unknown>): Options {
  const opts = { ...params } as Options & Record<string, unknown>;

  if (typeof opts.title === "string") opts.title = { text: opts.title };
  if (typeof opts.subtitle === "string") opts.subtitle = { text: opts.subtitle };

  return opts as Options;
}
