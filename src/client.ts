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

import sdk from "@1money/protocol-ts-sdk";

import type { Config, Network } from "./config.js";

const NETWORK_BASE_URLS: Record<Network, string> = {
  mainnet: "https://api.1money.network",
  testnet: "https://api.testnet.1money.network",
  local: "http://localhost:18555"
};

/**
 * API client instance created by the SDK.
 */
export type ProtocolApiClient = ReturnType<typeof sdk.api>;

/**
 * Wraps SDK initialization with MCP configuration.
 */
export class ProtocolClient {
  readonly api: ProtocolApiClient;

  /**
   * Creates a protocol client with configured network, base URL, and headers.
   */
  constructor(config: Config) {
    const baseURL = config.baseUrl ?? NETWORK_BASE_URLS[config.network];
    this.api = sdk.api({ network: config.network, timeout: config.timeoutMs });
    sdk.client.setInitConfig({
      baseURL,
      timeout: config.timeoutMs,
      headers: config.headers
    });
  }
}
