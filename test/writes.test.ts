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

import { createPrivateKeySigner, prepareTransactionV2 } from "@1money/protocol-ts-sdk";
import type { AuthorizedTxV2, Memo, Signature } from "@1money/protocol-ts-sdk";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { ToolName } from "../src/schemas/zod.js";
import { NEXT_STEP } from "../src/tools/writeErrors.js";
import type { WriteOperation } from "../src/tools/writes.js";
import { CHAIN_ID, OTHER, TEST_ADDRESS, TEST_KEY, TOKEN, resultJson, startHarness, type Harness } from "./helpers/harness.js";
import { problem } from "./helpers/mockNode.js";

const signer = createPrivateKeySigner(TEST_KEY);

type Case = { tool: ToolName; operation: WriteOperation; unsigned: Record<string, unknown>; extra?: object };

const header = { chain_id: CHAIN_ID, nonce: 7 };
const CASES: Case[] = [
  {
    tool: "transactions.prepare_payment",
    operation: "payment",
    unsigned: { ...header, recipient: OTHER, value: "1000", token: TOKEN }
  },
  {
    tool: "tokens.prepare_issue",
    operation: "tokenIssue",
    unsigned: { ...header, symbol: "TST", name: "Test", decimals: 6, master_authority: TEST_ADDRESS, is_private: false },
    extra: { token: TOKEN }
  },
  { tool: "tokens.prepare_burn", operation: "tokenBurn", unsigned: { ...header, value: "5", token: TOKEN } },
  {
    tool: "tokens.prepare_bridge_and_mint",
    operation: "tokenBridgeAndMint",
    unsigned: {
      ...header,
      recipient: OTHER,
      value: "9",
      token: TOKEN,
      source_chain_id: 1,
      source_tx_hash: `0x${"ab".repeat(32)}`,
      bridge_metadata: "meta"
    }
  },
  {
    tool: "tokens.prepare_burn_and_bridge",
    operation: "tokenBurnAndBridge",
    unsigned: {
      ...header,
      sender: TEST_ADDRESS,
      value: "9",
      token: TOKEN,
      destination_chain_id: 1,
      destination_address: OTHER,
      escrow_fee: "1",
      bridge_metadata: "meta",
      bridge_param: "0x01"
    }
  }
];

const PAYMENT = CASES[0];

const expected = async (c: Case, memo?: Memo) => {
  const prepared = prepareTransactionV2(c.operation, c.unsigned as never, { memo });
  const signature = await signer.signDigest(prepared.signingHash);
  return { prepared, signature, authorized: prepared.authorize(signature) };
};

let h: Harness;
beforeAll(async () => {
  h = await startHarness(500);
});
afterAll(() => h.stop());
beforeEach(() => h.node.reset());

const prepareAndSign = async (c: Case, memo?: Memo) => {
  const prepared = resultJson(await h.call(c.tool, { unsigned: c.unsigned, ...(memo && { memo }) }));
  const signature: Signature = resultJson(
    await h.call("utils.sign_digest", { signing_hash: prepared.signing_hash, private_key: TEST_KEY })
  );
  return { prepared, signature };
};

const submit = (prepared: any, signature: Signature) =>
  h.call("transactions.submit", {
    operation: prepared.operation,
    unsigned: prepared.unsigned,
    ...(prepared.memo && { memo: prepared.memo }),
    signature
  });

const answerPost = (authorized: AuthorizedTxV2, answer: Parameters<Harness["node"]["on"]>[2]) =>
  h.node.on("POST", authorized.path, answer);

describe("v2 write flow: prepare, sign, submit", () => {
  it.each(CASES)("$tool matches the SDK builder and posts to /v2", async (c) => {
    const want = await expected(c);
    answerPost(want.authorized, { status: 200, body: { hash: want.authorized.transactionHash, ...c.extra } });

    const { prepared, signature } = await prepareAndSign(c);
    expect(prepared.operation).toBe(c.operation);
    expect(prepared.signing_hash).toBe(want.prepared.signingHash);
    expect(h.node.posts()).toHaveLength(0);

    const result = await submit(prepared, signature);
    expect(result.isError).toBeUndefined();
    expect(resultJson(result)).toMatchObject({ submitted: true, transaction_hash: want.authorized.transactionHash });

    const [post] = h.node.posts();
    expect(post.path).toBe(want.authorized.path);
    expect(post.path.startsWith("/v2/")).toBe(true);
    expect(post.body).toEqual(want.authorized.request);
  });

  it("signs a memo into the transaction", async () => {
    const memo = { type: "invoice", format: "text", data: "INV-1" };
    const want = await expected(PAYMENT, memo);
    answerPost(want.authorized, { status: 200, body: { hash: want.authorized.transactionHash } });

    const { prepared, signature } = await prepareAndSign(PAYMENT, memo);
    expect(prepared.signing_hash).toBe(want.prepared.signingHash);
    const result = resultJson(await submit(prepared, signature));
    expect(result.transaction_hash).toBe(want.authorized.transactionHash);
  });

  it("rejects invalid input at prepare and sends nothing", async () => {
    await expect(
      h.call("transactions.prepare_payment", { unsigned: { ...PAYMENT.unsigned, recipient: "not-an-address" } })
    ).rejects.toThrow(/transactions\.prepare_payment failed/);
    expect(h.node.requests).toHaveLength(0);
  });

  it("refuses a high-S signature before sending", async () => {
    const { prepared, signature } = await prepareAndSign(PAYMENT);
    const highS = { ...signature, s: `0x${"f".repeat(64)}` as const };
    const result = await submit(prepared, highS);
    expect(result.isError).toBe(true);
    expect(resultJson(result)).toMatchObject({ submitted: false, next_step: NEXT_STEP.fixInput });
    expect(h.node.posts()).toHaveLength(0);
  });
});

describe("structured write errors", () => {
  const submitWith = async (answer: Parameters<Harness["node"]["on"]>[2]) => {
    const want = await expected(PAYMENT);
    answerPost(want.authorized, answer);
    const result = await submit(...Object.values(await prepareAndSign(PAYMENT)) as [any, Signature]);
    expect(result.isError).toBe(true);
    return { body: resultJson(result), hash: want.authorized.transactionHash };
  };

  it.each([
    ["fix_request", false, NEXT_STEP.fixRequest],
    ["retry_later", false, NEXT_STEP.retrySame],
    ["use_other_node", false, NEXT_STEP.otherNode]
  ] as const)("a node refusal with action %s is not submitted", async (action, submitted, step) => {
    const { body, hash } = await submitWith(problem("some_refusal", 422, action));
    expect(body).toMatchObject({
      submitted,
      next_step: step,
      action,
      status: 422,
      problem_type: expect.stringContaining("some_refusal"),
      transaction_hash: hash
    });
  });

  it("a held transaction is submitted: do not sign again", async () => {
    const { body } = await submitWith(problem("transaction_in_progress", 409, "in_progress"));
    expect(body).toMatchObject({ submitted: true, next_step: NEXT_STEP.held });
  });

  it("a 5xx with no action is an unknown outcome, never a failure", async () => {
    const { body } = await submitWith({ status: 503, body: { message: "unavailable" } });
    expect(body).toMatchObject({ submitted: "unknown", next_step: NEXT_STEP.unknown });
  });

  it("a timeout is an unknown outcome", async () => {
    const { body } = await submitWith("hang");
    expect(body).toMatchObject({ submitted: "unknown", next_step: NEXT_STEP.unknown });
  });

  it("an accepted answer with another hash is submitted and flagged", async () => {
    const { body } = await submitWith({ status: 200, body: { hash: `0x${"cd".repeat(32)}` } });
    expect(body).toMatchObject({ submitted: true, next_step: NEXT_STEP.hashMismatch });
  });
});

describe("batches never send", () => {
  it.each(["utils.safe_promise_line", "utils.safe_promise_all"] as const)(
    "%s refuses a submit before any call runs, so no outcome is lost",
    async (batch) => {
      const want = await expected(PAYMENT);
      answerPost(want.authorized, "hang");
      const { prepared, signature } = await prepareAndSign(PAYMENT);
      const submitInput = { operation: prepared.operation, unsigned: prepared.unsigned, signature };

      for (const tool of ["transactions.submit", "transactions_submit"]) {
        const calls = [
          { tool: "chain.get_chain_id", input: {} },
          { tool, input: submitInput }
        ];
        await expect(h.call(batch, { calls })).rejects.toThrow(/cannot run in a batch\. Nothing was sent/);
      }
      expect(h.node.requests).toHaveLength(0);
    }
  );

  it("reads still run in a batch", async () => {
    h.node.on("GET", "/v1/chains/chain_id", { status: 200, body: { chain_id: CHAIN_ID } });
    const read = { tool: "chain.get_chain_id", input: {} };
    const result = resultJson(await h.call("utils.safe_promise_line", { calls: [read, read] }));
    expect(result).toEqual([{ chain_id: CHAIN_ID }, { chain_id: CHAIN_ID }]);
  });
});
