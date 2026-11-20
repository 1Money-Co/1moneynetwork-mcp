/*
 * Copyright 2026 1Money Co.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import schemasJson from "../schemas/tools.json" with { type: "json" };
import { ProtocolClient } from "../src/client.js";
import { toolSchemas } from "../src/schemas/zod.js";
import { createHandlers } from "../src/tools/handlers.js";
import { registerTools } from "../src/tools/register.js";
import { MockNode } from "./helpers/mockNode.js";

describe("tool registry", () => {
  it("has exactly one handler per schema", () => {
    const handlers = createHandlers(new ProtocolClient({ network: "local", timeoutMs: 1000 }));
    expect(Object.keys(handlers).sort()).toEqual(Object.keys(toolSchemas).sort());
  });

  it("generated schemas match schemas/tools.json", () => {
    expect(Object.keys(toolSchemas)).toEqual(Object.keys(schemasJson));
  });

  it("exposes no v1 write tool", () => {
    const retired = ["tokens.mint", "tokens.pause", "tokens.issue", "transactions.payment", "utils.sign_message"];
    for (const name of retired) {
      expect(toolSchemas).not.toHaveProperty(name);
    }
  });
});

describe("MCP protocol", () => {
  const node = new MockNode();
  const client = new Client({ name: "test", version: "0.0.0" });

  beforeAll(async () => {
    const baseUrl = await node.start();
    const server = new McpServer({ name: "1moneynetwork-mcp", version: "test" });
    registerTools(server, new ProtocolClient({ network: "local", baseUrl, timeoutMs: 1000 }));
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  });
  afterAll(async () => {
    await client.close();
    await node.stop();
  });

  it("lists tools with underscore names and describes every write tool", async () => {
    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name).sort()).toEqual(
      Object.keys(toolSchemas)
        .map((name) => name.replaceAll(".", "_"))
        .sort()
    );
    const writes = tools.filter((tool) => /prepare|submit|sign_digest/.test(tool.name));
    expect(writes.length).toBeGreaterThan(0);
    for (const tool of writes) {
      expect(tool.description, tool.name).toBeTruthy();
    }
  });

  it("calls a read tool through the protocol", async () => {
    node.on("GET", "/v1/chains/chain_id", { status: 200, body: { chain_id: 1212101 } });
    const result = await client.callTool({ name: "chain_get_chain_id", arguments: {} });
    expect(result.isError).toBeFalsy();
    expect(JSON.parse((result.content as Array<{ text: string }>)[0].text)).toEqual({ chain_id: 1212101 });
  });
});
