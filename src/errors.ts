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

/**
 * Minimal structured error shape used for MCP error formatting.
 */
export type ParsedError = {
  name?: string;
  message?: string;
  status?: number;
  data?: unknown;
};

/**
 * Normalizes errors into a compact string for tool responses.
 */
export const formatError = (error: unknown) => {
  if (error instanceof Error) {
    const details = error.message || error.name || "Unknown error";
    return details;
  }

  if (error && typeof error === "object") {
    const parsed = error as ParsedError;
    const parts = [] as string[];
    if (parsed.name) {
      parts.push(parsed.name);
    }
    if (parsed.message) {
      parts.push(parsed.message);
    }
    if (typeof parsed.status === "number") {
      parts.push(`status=${parsed.status}`);
    }
    if (parsed.data !== undefined) {
      try {
        parts.push(`data=${JSON.stringify(parsed.data)}`);
      } catch {
        parts.push("data=[unserializable]");
      }
    }
    if (parts.length > 0) {
      return parts.join(" ");
    }
  }

  return "Unknown error";
};
