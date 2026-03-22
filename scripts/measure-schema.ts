import { createServer } from "../server.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

const [c2s, s2c] = InMemoryTransport.createLinkedPair();
const server = createServer();
await server.connect(s2c);
const client = new Client({ name: "measure", version: "1" });
await client.connect(c2s);
const { tools } = await client.listTools();
const json = JSON.stringify(tools);
const bytes = Buffer.byteLength(json, "utf-8");
console.log(`Total: ${(bytes / 1024).toFixed(1)} KB | ~${Math.round(bytes / 4).toLocaleString()} tokens | ${tools.length} tools`);
for (const tool of tools) {
  const tj = JSON.stringify(tool);
  const tb = Buffer.byteLength(tj, "utf-8");
  console.log(`  ${tool.name}: ${(tb / 1024).toFixed(1)} KB | ~${Math.round(tb / 4).toLocaleString()} tokens`);
}
await client.close();
