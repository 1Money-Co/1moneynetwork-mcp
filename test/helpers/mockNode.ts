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

import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";

export const PROBLEM = "https://developer.1moneynetwork.com/problem/";

export type Answer = { status: number; body: unknown } | "hang";

export type Request = { method: string; path: string; query: URLSearchParams; body: unknown };

type Route = Answer | ((request: Request) => Answer);

/** A node that answers each "METHOD /path" from a table and records every request. */
export class MockNode {
  readonly requests: Request[] = [];
  private readonly routes = new Map<string, Route>();
  private server?: Server;

  on(method: string, path: string, route: Route): this {
    this.routes.set(`${method} ${path}`, route);
    return this;
  }

  reset(): void {
    this.routes.clear();
    this.requests.length = 0;
  }

  posts(): Request[] {
    return this.requests.filter((request) => request.method === "POST");
  }

  async start(): Promise<string> {
    this.server = createServer(async (req, res) => {
      const request = await readRequest(req);
      this.requests.push(request);
      const route = this.routes.get(`${request.method} ${request.path}`);
      const answer = typeof route === "function" ? route(request) : route;
      if (answer === "hang") {
        return;
      }
      const { status, body } = answer ?? { status: 404, body: { title: "Not Found", status: 404 } };
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify(body));
    });
    await new Promise<void>((resolve) => this.server!.listen(0, "127.0.0.1", resolve));
    const { port } = this.server.address() as AddressInfo;
    return `http://127.0.0.1:${port}`;
  }

  async stop(): Promise<void> {
    this.server?.closeAllConnections();
    await new Promise<void>((resolve) => this.server?.close(() => resolve()) ?? resolve());
  }
}

const readRequest = async (req: IncomingMessage): Promise<Request> => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  const text = Buffer.concat(chunks).toString("utf8");
  const url = new URL(req.url ?? "/", "http://mock");
  return {
    method: req.method ?? "GET",
    path: url.pathname,
    query: url.searchParams,
    body: text ? JSON.parse(text) : undefined
  };
};

export const problem = (id: string, status: number, action: string, members: Record<string, unknown> = {}) => ({
  status,
  body: { type: `${PROBLEM}${id}`, title: id, status, action, ...members }
});
