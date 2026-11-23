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

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { privateKeyToAccount } from "viem/accounts";

import { ProtocolClient } from "../../src/client.js";
import { toolSchemas, type ToolName } from "../../src/schemas/zod.js";
import { createHandlers } from "../../src/tools/handlers.js";
import { MockNode } from "./mockNode.js";

/** A throwaway key for tests only; it holds nothing on any network. */
export const TEST_KEY = "0x4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a3f362318" as const;
export const TEST_ADDRESS = privateKeyToAccount(TEST_KEY).address;
export const TOKEN = "0x2cd8999Be299373D7881f4aDD11510030ad1412F";
export const OTHER = "0x9E1E9688A44D058fF181Ed64ddFAFbBE5CC74ff3";
export const CHAIN_ID = 1212101;

export type Harness = {
  node: MockNode;
  call: (tool: ToolName, input: unknown) => Promise<CallToolResult>;
  stop: () => Promise<void>;
};

/** Handlers wired to a mock node, with input checked by the tool's schema as the MCP server does. */
export const startHarness = async (timeoutMs = 2000): Promise<Harness> => {
  const node = new MockNode();
  const baseUrl = await node.start();
  const handlers = createHandlers(new ProtocolClient({ network: "local", baseUrl, timeoutMs }));
  return {
    node,
    call: (tool, input) => handlers[tool](toolSchemas[tool].parse(input)),
    stop: () => node.stop()
  };
};

export const resultJson = (result: CallToolResult): any => {
  const [first] = result.content;
  if (first?.type !== "text") {
    throw new Error("Expected a text result");
  }
  return JSON.parse(first.text);
};
