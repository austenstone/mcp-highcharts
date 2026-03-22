#!/usr/bin/env node
/**
 * Entry point — supports both stdio and Streamable HTTP transports.
 * Run with: npx mcp-highcharts [--stdio]
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

async function startStreamableHTTPServer(
  factory: () => McpServer,
): Promise<void> {
  const port = parseInt(process.env.PORT ?? "3001", 10);

  // Lazy-load Express and dependencies only for HTTP mode
  const [{ createMcpExpressApp }, { StreamableHTTPServerTransport }, { default: cors }] = await Promise.all([
    import("@modelcontextprotocol/sdk/server/express.js"),
    import("@modelcontextprotocol/sdk/server/streamableHttp.js"),
    import("cors"),
  ]);

  const app = createMcpExpressApp({ host: "0.0.0.0" });
  app.use(cors({ origin: /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/ }));

  app.all("/mcp", async (req: any, res: any) => {
    const server = factory();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    res.on("close", () => {
      transport.close().catch(() => {});
      server.close().catch(() => {});
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("MCP error:", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
      }
    }
  });

  const httpServer = app.listen(port, (err?: Error) => {
    if (err) {
      console.error("Failed to start server:", err);
      process.exit(1);
    }
    console.log(`MCP server listening on http://localhost:${port}/mcp`);
  });

  const shutdown = () => {
    console.log("\nShutting down...");
    httpServer.close(() => process.exit(0));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

async function startStdioServer(factory: () => McpServer): Promise<void> {
  await factory().connect(new StdioServerTransport());
}

async function main() {
  if (process.argv.includes("--stdio")) {
    await startStdioServer(createServer);
  } else {
    await startStreamableHTTPServer(createServer);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
