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
import * as sdkUtils from "@1money/protocol-ts-sdk/utils";

import type { ProtocolClient } from "../client.js";
import { formatError } from "../errors.js";
import type { ToolName } from "../schemas/zod.js";

/**
 * MCP tool handler signature.
 */
export type ToolHandler = (input: unknown) => Promise<CallToolResult>;

type ToolAction = (input: unknown) => Promise<unknown>;

type BatchCall = {
  tool: string;
  input: Record<string, unknown>;
};

type BatchInput = {
  calls: BatchCall[];
};

const getUtil = <T extends keyof typeof sdkUtils>(key: T) => {
  const direct = sdkUtils[key];
  if (direct !== undefined) {
    return direct;
  }
  throw new Error(`Missing SDK util: ${String(key)}`);
};

const calcTxHash = getUtil("calcTxHash");
const deriveTokenAddress = getUtil("deriveTokenAddress");
const encodePayload = getUtil("encodePayload");
const signMessage = getUtil("signMessage");
const sdkToHex = getUtil("toHex");
const _typeof = getUtil("_typeof");

const toToolResult = (data: unknown): CallToolResult => ({
  content: [
    {
      type: "text",
      text: JSON.stringify(data ?? null, null, 2)
    }
  ]
});

const runTool = async (toolName: string, action: () => Promise<unknown>) => {
  try {
    const data = await action();
    return toToolResult(data);
  } catch (error) {
    throw new Error(`${toolName} failed: ${formatError(error)}`);
  }
};

const isBatchTool = (toolName: string) =>
  toolName === "utils.safe_promise_all" || toolName === "utils.safe_promise_line";

/**
 * Builds MCP tool handlers backed by the protocol SDK.
 */
export const createHandlers = (client: ProtocolClient): Record<ToolName, ToolHandler> => {
  const actions = {} as Record<ToolName, ToolAction>;

  const runAction = async (toolName: string, input: unknown) => {
    if (isBatchTool(toolName)) {
      throw new Error("Batch tools cannot be nested.");
    }

    const action = actions[toolName as ToolName];
    if (!action) {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    return action(input);
  };

  actions["accounts.get_nonce"] = async (input) => {
    const { address } = input as { address: string };
    return client.api.accounts.getNonce(address);
  };

  actions["accounts.get_bbnonce"] = async (input) => {
    const { address } = input as { address: string };
    return client.api.accounts.getBbNonce(address);
  };

  actions["accounts.get_token_account"] = async (input) => {
    const { address, token } = input as { address: string; token: string };
    return client.api.accounts.getTokenAccount(address, token);
  };

  actions["chain.get_chain_id"] = async () => client.api.chain.getChainId();

  actions["checkpoints.get_number"] = async () => client.api.checkpoints.getNumber();

  actions["checkpoints.get_by_hash"] = async (input) => {
    const { hash, full } = input as { hash: string; full?: boolean };
    return client.api.checkpoints.getByHash(hash, full ?? false);
  };

  actions["checkpoints.get_by_number"] = async (input) => {
    const { number, full } = input as { number: number | string; full?: boolean };
    return client.api.checkpoints.getByNumber(number, full ?? false);
  };

  actions["checkpoints.get_receipts_by_number"] = async (input) => {
    const { number } = input as { number: number | string };
    return client.api.checkpoints.getReceiptsByNumber(number);
  };

  actions["tokens.get_token_metadata"] = async (input) => {
    const { token } = input as { token: string };
    return client.api.tokens.getTokenMetadata(token);
  };

  actions["tokens.manage_blacklist"] = async (input) => {
    const { request } = input as { request: Record<string, unknown> };
    return client.api.tokens.manageBlacklist(request as any);
  };

  actions["tokens.manage_whitelist"] = async (input) => {
    const { request } = input as { request: Record<string, unknown> };
    return client.api.tokens.manageWhitelist(request as any);
  };

  actions["tokens.burn"] = async (input) => {
    const { request } = input as { request: Record<string, unknown> };
    return client.api.tokens.burnToken(request as any);
  };

  actions["tokens.grant_authority"] = async (input) => {
    const { request } = input as { request: Record<string, unknown> };
    return client.api.tokens.grantAuthority(request as any);
  };

  actions["tokens.issue"] = async (input) => {
    const { request } = input as { request: Record<string, unknown> };
    return client.api.tokens.issueToken(request as any);
  };

  actions["tokens.mint"] = async (input) => {
    const { request } = input as { request: Record<string, unknown> };
    return client.api.tokens.mintToken(request as any);
  };

  actions["tokens.pause"] = async (input) => {
    const { request } = input as { request: Record<string, unknown> };
    return client.api.tokens.pauseToken(request as any);
  };

  actions["tokens.update_metadata"] = async (input) => {
    const { request } = input as { request: Record<string, unknown> };
    return client.api.tokens.updateMetadata(request as any);
  };

  actions["tokens.bridge_and_mint"] = async (input) => {
    const { request } = input as { request: Record<string, unknown> };
    return client.api.tokens.bridgeAndMint(request as any);
  };

  actions["tokens.burn_and_bridge"] = async (input) => {
    const { request } = input as { request: Record<string, unknown> };
    return client.api.tokens.burnAndBridge(request as any);
  };

  actions["transactions.get_by_hash"] = async (input) => {
    const { hash } = input as { hash: string };
    return client.api.transactions.getByHash(hash);
  };

  actions["transactions.get_receipt_by_hash"] = async (input) => {
    const { hash } = input as { hash: string };
    return client.api.transactions.getReceiptByHash(hash);
  };

  actions["transactions.get_finalized_by_hash"] = async (input) => {
    const { hash } = input as { hash: string };
    return client.api.transactions.getFinalizedByHash(hash);
  };

  actions["transactions.estimate_fee"] = async (input) => {
    const { from, value, token } = input as {
      from: string;
      value: string | number;
      token?: string;
    };
    return client.api.transactions.estimateFee(from, String(value), token);
  };

  actions["transactions.payment"] = async (input) => {
    const { request } = input as { request: Record<string, unknown> };
    return client.api.transactions.payment(request as any);
  };

  actions["utils.derive_token_address"] = async (input) => {
    const { wallet_address, mint_address } = input as {
      wallet_address: string;
      mint_address: string;
    };
    return { address: deriveTokenAddress(wallet_address, mint_address) };
  };

  actions["utils.sign_message"] = async (input) => {
    const { payload, private_key } = input as { payload: unknown; private_key: string };
    const signature = await signMessage(payload as any, private_key as `0x${string}`);
    return signature;
  };

  actions["utils.encode_payload"] = async (input) => {
    const { payload } = input as { payload: unknown };
    const encoded = encodePayload(payload as any);
    return { encoded: sdkToHex(encoded) };
  };

  actions["utils.to_hex"] = async (input) => {
    const { value } = input as { value: unknown };
    return { hex: sdkToHex(value as any) };
  };

  actions["utils.calc_tx_hash"] = async (input) => {
    const { payload, signature } = input as {
      payload: unknown;
      signature: { r: string; s: string; v: number | boolean };
    };
    return { hash: calcTxHash(payload as any, signature as any) };
  };

  actions["utils.typeof"] = async (input) => {
    const { value } = input as { value: unknown };
    return { type: _typeof(value) };
  };

  actions["utils.safe_promise_all"] = async (input) => {
    const { calls } = input as BatchInput;
    const promises = calls.map((call) => runAction(call.tool, call.input));
    return Promise.all(promises);
  };

  actions["utils.safe_promise_line"] = async (input) => {
    const { calls } = input as BatchInput;
    const results: unknown[] = [];
    for (const call of calls) {
      try {
        results.push(await runAction(call.tool, call.input));
      } catch {
        // ignore errors to mirror safePromiseLine behavior
      }
    }
    return results;
  };

  const handlers = {} as Record<ToolName, ToolHandler>;
  for (const [toolName, action] of Object.entries(actions)) {
    handlers[toolName as ToolName] = (input) => runTool(toolName, () => action(input));
  }

  return handlers;
};
