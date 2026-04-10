import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  exportChartToImage,
  isExportable,
  isImageExportEnabled,
} from "../../src/export-image.js";

describe("isImageExportEnabled", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns false when IMAGE_EXPORT is not set", () => {
    delete process.env.IMAGE_EXPORT;
    expect(isImageExportEnabled()).toBe(false);
  });

  it('returns true when IMAGE_EXPORT is "true"', () => {
    process.env.IMAGE_EXPORT = "true";
    expect(isImageExportEnabled()).toBe(true);
  });

  it('returns true when IMAGE_EXPORT is "1"', () => {
    process.env.IMAGE_EXPORT = "1";
    expect(isImageExportEnabled()).toBe(true);
  });

  it('returns false when IMAGE_EXPORT is "false"', () => {
    process.env.IMAGE_EXPORT = "false";
    expect(isImageExportEnabled()).toBe(false);
  });
});

describe("isExportable", () => {
  it("returns true for a basic chart config", () => {
    expect(isExportable({
      chart: { type: "bar" },
      series: [{ data: [1, 2, 3] }],
    })).toBe(true);
  });

  it("returns true for a stock chart", () => {
    expect(isExportable({
      __chartType: "stock",
      series: [{ data: [1, 2, 3] }],
    })).toBe(true);
  });

  it("returns true for a gantt chart", () => {
    expect(isExportable({
      __chartType: "gantt",
      series: [{ data: [{ name: "Task 1", start: 0, end: 1 }] }],
    })).toBe(true);
  });

  it("returns false for a dashboard (components array)", () => {
    expect(isExportable({
      components: [{ type: "Highcharts", chartOptions: {} }],
    })).toBe(false);
  });

  it("returns false for a grid", () => {
    expect(isExportable({
      __chartType: "grid",
      data: { columns: { x: [1, 2] } },
    })).toBe(false);
  });

  it("returns false for a map with string chart.map key", () => {
    expect(isExportable({
      __chartType: "map",
      chart: { map: "custom/world" },
      series: [{ data: [] }],
    })).toBe(false);
  });

  it("returns false for a map with string series mapData", () => {
    expect(isExportable({
      __chartType: "map",
      series: [{ mapData: "countries/us/us-all", data: [] }],
    })).toBe(false);
  });

  it("returns true for a map with inline mapData object", () => {
    expect(isExportable({
      __chartType: "map",
      chart: { map: { type: "FeatureCollection", features: [] } },
      series: [{ data: [] }],
    })).toBe(true);
  });
});

describe("exportChartToImage", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POSTs chart config and returns base64 PNG on success", async () => {
    const fakePng = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      arrayBuffer: () => Promise.resolve(fakePng.buffer),
    });

    const result = await exportChartToImage({
      options: { chart: { type: "bar" }, series: [{ data: [1, 2, 3] }] },
    });

    expect(result).toBe(Buffer.from(fakePng).toString("base64"));
    expect(fetchSpy).toHaveBeenCalledOnce();

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://export.highcharts.com/");
    expect(init.method).toBe("POST");

    const body = JSON.parse(init.body);
    expect(body.type).toBe("image/png");
    expect(body.constr).toBe("Chart");
    expect(body.width).toBe(800);

    // Options should be JSON-stringified and should NOT contain __chartType or responsive
    const parsedOptions = JSON.parse(body.options);
    expect(parsedOptions.__chartType).toBeUndefined();
    expect(parsedOptions.responsive).toBeUndefined();
  });

  it("uses StockChart constructor for stock charts", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(4)),
    });

    await exportChartToImage({
      options: { __chartType: "stock", series: [{ data: [1] }] },
      chartType: "stock",
    });

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.constr).toBe("StockChart");
  });

  it("uses MapChart constructor for map charts", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(4)),
    });

    await exportChartToImage({
      options: { series: [{ data: [] }] },
      chartType: "map",
    });

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.constr).toBe("MapChart");
  });

  it("uses GanttChart constructor for gantt charts", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(4)),
    });

    await exportChartToImage({
      options: { series: [{ data: [] }] },
      chartType: "gantt",
    });

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.constr).toBe("GanttChart");
  });

  it("returns null on HTTP error", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    const result = await exportChartToImage({
      options: { series: [{ data: [1] }] },
    });

    expect(result).toBeNull();
  });

  it("returns null on network error", async () => {
    fetchSpy.mockRejectedValueOnce(new Error("Network unreachable"));

    const result = await exportChartToImage({
      options: { series: [{ data: [1] }] },
    });

    expect(result).toBeNull();
  });

  it("returns null on timeout (AbortError)", async () => {
    const abortError = new DOMException("The operation was aborted", "AbortError");
    fetchSpy.mockRejectedValueOnce(abortError);

    const result = await exportChartToImage({
      options: { series: [{ data: [1] }] },
    });

    expect(result).toBeNull();
  });

  it("uses custom EXPORT_SERVER_URL when set", async () => {
    const originalEnv = process.env.EXPORT_SERVER_URL;
    process.env.EXPORT_SERVER_URL = "https://my-export-server.example.com/";

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(4)),
    });

    await exportChartToImage({
      options: { series: [{ data: [1] }] },
    });

    expect(fetchSpy.mock.calls[0][0]).toBe("https://my-export-server.example.com/");

    process.env.EXPORT_SERVER_URL = originalEnv;
  });

  it("respects custom width", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(4)),
    });

    await exportChartToImage({
      options: { series: [{ data: [1] }] },
      width: 1200,
    });

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.width).toBe(1200);
  });
});
