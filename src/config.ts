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

import dotenv from "dotenv";

dotenv.config();

const DEFAULT_NETWORK = "testnet" as const;
const DEFAULT_TIMEOUT_MS = 10000;

/**
 * Supported protocol networks for API requests.
 */
export type Network = "testnet" | "mainnet" | "local";

/**
 * Runtime configuration for the protocol MCP server.
 */
export type Config = {
  network: Network;
  baseUrl?: string;
  timeoutMs: number;
  headers?: Record<string, string>;
};

const parseNetwork = (value?: string): Network => {
  const normalized = (value || DEFAULT_NETWORK).toLowerCase();
  if (normalized === "testnet" || normalized === "mainnet" || normalized === "local") {
    return normalized;
  }
  throw new Error(`Invalid ONEMONEY_PROTOCOL_NETWORK: ${value}`);
};

const parseHeaders = (value?: string) => {
  if (!value) {
    return undefined;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch (error) {
    throw new Error("ONEMONEY_PROTOCOL_HEADERS must be valid JSON");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("ONEMONEY_PROTOCOL_HEADERS must be a JSON object");
  }

  const headers: Record<string, string> = {};
  for (const [key, val] of Object.entries(parsed as Record<string, unknown>)) {
    if (val === undefined || val === null) {
      continue;
    }
    headers[key] = String(val);
  }
  return Object.keys(headers).length > 0 ? headers : undefined;
};

/**
 * Load configuration from environment variables.
 */
export const loadConfig = (): Config => {
  const network = parseNetwork(process.env.ONEMONEY_PROTOCOL_NETWORK);
  const baseUrl = process.env.ONEMONEY_PROTOCOL_BASE_URL;
  const timeoutRaw = process.env.ONEMONEY_PROTOCOL_TIMEOUT_MS;
  const timeoutMs = timeoutRaw ? Number(timeoutRaw) : DEFAULT_TIMEOUT_MS;
  if (timeoutRaw && !Number.isFinite(timeoutMs)) {
    throw new Error("ONEMONEY_PROTOCOL_TIMEOUT_MS must be a number");
  }

  const headers = parseHeaders(process.env.ONEMONEY_PROTOCOL_HEADERS);

  return {
    network,
    baseUrl,
    timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : DEFAULT_TIMEOUT_MS,
    headers,
  };
};
