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

import { createPrivateKeySigner, prepareTransactionV2, settledPayloadOf } from "@1money/protocol-ts-sdk";
import type { LegacyAuthorityOperation } from "@1money/protocol-ts-sdk";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { NOT_ACTIVE_STEP } from "../src/tools/authority.js";
import { NEXT_STEP } from "../src/tools/writeErrors.js";
import { CHAIN_ID, OTHER, TEST_ADDRESS, TEST_KEY, TOKEN, resultJson, startHarness, type Harness } from "./helpers/harness.js";
import { problem, type Answer } from "./helpers/mockNode.js";

const signer = createPrivateKeySigner(TEST_KEY);
const REFERENCE = 500;
const NONCE = 7;
const SETTLED_PATH = "/v2/tokens/authority_operation";
const ZERO = "0x0000000000000000000000000000000000000000";
const HASH = `0x${"12".repeat(32)}`;

let h: Harness;
beforeAll(async () => {
  h = await startHarness(500);
});
afterAll(() => h.stop());
beforeEach(() => h.node.reset());

const settledNode = (isPrivate = false) =>
  h.node
    .on("GET", "/api/status", { status: 200, body: { native_write_mode: "v2_only", envelope_mode: "settled" } })
    .on("GET", "/v1/checkpoints/number", { status: 200, body: { number: REFERENCE } })
    .on("GET", "/v1/tokens/token_metadata", { status: 200, body: { is_private: isPrivate } });

const base = { chain_id: CHAIN_ID, nonce: NONCE, token: TOKEN };

describe("envelope mode (settled only)", () => {
  it.each<[string, Answer, string]>([
    ["no envelope_mode", { status: 200, body: { native_write_mode: "dual" } }, "not_reported"],
    ["a null envelope_mode", { status: 200, body: { envelope_mode: null } }, "not_reported"],
    ["upgrade_gap", { status: 200, body: { envelope_mode: "upgrade_gap" } }, "upgrade_gap"],
    ["an unknown mode", { status: 200, body: { envelope_mode: "bogus" } }, "unrecognized"],
    ["HTTP 404", { status: 404, body: { title: "Not Found" } }, "unreadable"],
    ["no answer", "hang", "unreadable"]
  ])("%s: not active; prepare sends and prepares nothing", async (_, answer, view) => {
    h.node.on("GET", "/api/status", answer);

    const mode = resultJson(await h.call("chain.get_envelope_mode", {}));
    expect(mode).toMatchObject({ envelope_mode: view, settled_active: false });

    h.node.reset();
    h.node.on("GET", "/api/status", answer);
    const result = await h.call("tokens.prepare_authority_operation", {
      kind: "pause",
      payload: { ...base, action: "Pause" }
    });
    expect(result.isError).toBeUndefined();
    expect(resultJson(result)).toMatchObject({
      state: "not_active",
      prepared: false,
      sent: false,
      mode: { envelope_mode: view },
      next_step: NOT_ACTIVE_STEP
    });
    expect(h.node.requests.map((request) => request.path)).toEqual(["/api/status"]);
  });

  it("settled: active", async () => {
    settledNode();
    expect(resultJson(await h.call("chain.get_envelope_mode", {}))).toEqual({
      envelope_mode: "settled",
      settled_active: true
    });
  });
});

type MappingCase = {
  name: string;
  legacy: LegacyAuthorityOperation;
  isPrivate?: boolean;
  operation: ReturnType<typeof settledPayloadOf>["operation"];
};

const MAPPINGS: MappingCase[] = [
  {
    name: "mint",
    legacy: { kind: "mint", payload: { ...base, recipient: OTHER, value: "100" } },
    operation: { type: "mint", recipient: OTHER, value: "100" }
  },
  {
    name: "blacklist add on a public token",
    legacy: { kind: "blacklist", payload: { ...base, action: "Add", address: OTHER } as never },
    operation: { type: "list", list: "blacklist", action: "add", account: OTHER }
  },
  {
    name: "blacklist add (freeze) on a private token",
    legacy: { kind: "blacklist", payload: { ...base, action: "Add", address: OTHER } as never },
    isPrivate: true,
    operation: { type: "list", list: "whitelist", action: "remove", account: OTHER }
  },
  {
    name: "whitelist add on a private token",
    legacy: { kind: "whitelist", payload: { ...base, action: "Add", address: OTHER } as never },
    isPrivate: true,
    operation: { type: "list", list: "whitelist", action: "add", account: OTHER }
  },
  {
    name: "MasterMintBurn grant to the zero address",
    legacy: {
      kind: "authority",
      payload: { ...base, action: "Grant", authority_type: "MasterMintBurn", authority_address: ZERO } as never
    },
    operation: { type: "revoke_master_mint_burn" }
  },
  {
    name: "MasterMintBurn grant",
    legacy: {
      kind: "authority",
      payload: { ...base, action: "Grant", authority_type: "MasterMintBurn", authority_address: OTHER } as never
    },
    operation: { type: "rotate_master_mint_burn", account: OTHER }
  },
  {
    name: "MintBurnTokens grant",
    legacy: {
      kind: "authority",
      payload: {
        ...base,
        action: "Grant",
        authority_type: "MintBurnTokens",
        authority_address: OTHER,
        value: "250"
      } as never
    },
    operation: { type: "set_minter_allowance", minter: OTHER, allowance: "250" }
  },
  {
    name: "Pause role revoke",
    legacy: {
      kind: "authority",
      payload: { ...base, action: "Revoke", authority_type: "Pause", authority_address: OTHER } as never
    },
    operation: { type: "revoke_role", role: "pause", account: OTHER }
  },
  {
    name: "unpause",
    legacy: { kind: "pause", payload: { ...base, action: "Unpause" } as never },
    operation: { type: "unpause" }
  },
  {
    name: "metadata",
    legacy: {
      kind: "metadata",
      payload: { ...base, name: "New", uri: "https://example.com", additional_metadata: [{ key: "k", value: "v" }] }
    },
    operation: {
      type: "update_metadata",
      name: "New",
      uri: "https://example.com",
      additional_metadata: [{ key: "k", value: "v" }]
    }
  }
];

const prepareSettled = async (legacy: LegacyAuthorityOperation) =>
  resultJson(await h.call("tokens.prepare_authority_operation", { kind: legacy.kind, payload: legacy.payload }));

describe("settled authority prepare", () => {
  it.each(MAPPINGS)("$name", async ({ legacy, isPrivate = false, operation }) => {
    settledNode(isPrivate);
    const want = settledPayloadOf(legacy, isPrivate, REFERENCE);
    expect(want.operation).toEqual(operation);

    const prepared = await prepareSettled(legacy);
    expect(prepared).toMatchObject({
      state: "prepared",
      envelope: "settled",
      operation: "settledAuthority",
      reference_checkpoint: REFERENCE
    });
    expect(prepared.unsigned).toEqual(want);
    expect(prepared.signing_hash).toBe(prepareTransactionV2("settledAuthority", want).signingHash);
    expect(h.node.posts()).toHaveLength(0);
  });

  it("refuses a payload that does not fit its kind, and sends nothing", async () => {
    settledNode();
    await expect(
      h.call("tokens.prepare_authority_operation", { kind: "mint", payload: { ...base, action: "Pause" } })
    ).rejects.toThrow(/tokens\.prepare_authority_operation failed/);
    expect(h.node.posts()).toHaveLength(0);
  });
});

const prepareSignSubmit = async (answer: Answer) => {
  settledNode();
  const prepared = await prepareSettled(MAPPINGS[0].legacy);
  const signature = await signer.signDigest(prepared.signing_hash);
  const authorized = prepareTransactionV2("settledAuthority", prepared.unsigned).authorize(signature);
  h.node.on("POST", SETTLED_PATH, typeof answer === "object" && answer.status === 200
    ? { status: 200, body: { hash: authorized.transactionHash } }
    : answer);
  const result = await h.call("transactions.submit", {
    operation: prepared.operation,
    unsigned: prepared.unsigned,
    signature
  });
  return { result, authorized };
};

describe("settled authority submit", () => {
  it("posts operation 17 to /v2/tokens/authority_operation", async () => {
    const { result, authorized } = await prepareSignSubmit({ status: 200, body: {} });
    expect(result.isError).toBeUndefined();
    expect(resultJson(result)).toMatchObject({
      submitted: true,
      operation: "settledAuthority",
      transaction_hash: authorized.transactionHash
    });
    const [post] = h.node.posts();
    expect(post.path).toBe(SETTLED_PATH);
    expect(post.body).toEqual(authorized.request);
  });

  it.each([
    ["settled_envelope_not_active", "retry_later", {}, /Send the same signed transaction later/],
    [
      "reference_checkpoint_not_committed",
      "retry_later",
      { checkpoint_id: 501, checkpoint_id_latest: 500 },
      /Prepare again after a short wait/
    ],
    [
      "token_not_at_reference_checkpoint",
      "retry_later",
      { mint_address: TOKEN, checkpoint_id: 500 },
      /does not show that the token does not exist/
    ],
    [
      "reference_checkpoint_too_old",
      "fix_request",
      { checkpoint_id: 1, checkpoint_id_earliest: 400 },
      /only if this transaction was never sent before/
    ]
  ] as const)("refusal %s: not submitted, with its next step", async (kind, action, members, step) => {
    const { result } = await prepareSignSubmit(problem(kind, 422, action, members));
    expect(result.isError).toBe(true);
    const body = resultJson(result);
    expect(body).toMatchObject({ submitted: false, refusal: { kind } });
    expect(body.next_step).toMatch(step);
  });

  it("a retired-envelope refusal gets the generic step, not re-sign advice", async () => {
    const { result } = await prepareSignSubmit(problem("legacy_envelope_retired", 422, "retry_later"));
    expect(resultJson(result)).toMatchObject({
      submitted: false,
      refusal: { kind: "legacy_envelope_retired" },
      next_step: NEXT_STEP.retrySame
    });
  });

  it("a retired /v1-style 410 is not submitted and carries no authority refusal", async () => {
    const { result } = await prepareSignSubmit(problem("legacy_native_write_retired", 410, "fix_request"));
    const body = resultJson(result);
    expect(body).toMatchObject({ submitted: false, status: 410, next_step: NEXT_STEP.fixRequest });
    expect(body).not.toHaveProperty("refusal");
  });
});

describe("authority operation state", () => {
  const stateNode = (nextNonce: number, receipt: Answer, status: Answer) =>
    h.node
      .on("GET", "/v1/accounts/nonce", { status: 200, body: { nonce: nextNonce } })
      .on("GET", "/v1/transactions/receipt/by_hash", receipt)
      .on("GET", "/v1/transactions/status/by_hash", status);

  const notFound: Answer = { status: 404, body: { title: "Not Found" } };
  const receipt = (success: boolean, events: unknown[] = [], warnings: unknown[] = []): Answer => ({
    status: 200,
    body: { transaction_hash: HASH, success, execution_events: events, warnings }
  });

  const readState = async () =>
    resultJson(
      await h.call("tokens.authority_operation_state", { signer: TEST_ADDRESS, nonce: NONCE, transaction_hash: HASH })
    );

  it("pending: the nonce has not passed", async () => {
    stateNode(NONCE, notFound, notFound);
    expect(await readState()).toMatchObject({ state: "pending" });
  });

  it("logs nothing for the expected 404s of a pending operation", async () => {
    stateNode(NONCE, notFound, notFound);
    const logged: unknown[][] = [];
    const spies = (["error", "warn", "log", "info"] as const).map((level) =>
      vi.spyOn(console, level).mockImplementation((...args) => void logged.push(args))
    );
    try {
      await readState();
    } finally {
      spies.forEach((spy) => spy.mockRestore());
    }
    expect(h.node.requests.filter((request) => request.path.includes("by_hash"))).toHaveLength(2);
    expect(logged).toEqual([]);
  });

  it("settling: certified, waiting for its checkpoint; not a failure", async () => {
    stateNode(NONCE + 1, notFound, { status: 200, body: { hash: HASH, status: "certified_pending_checkpoint" } });
    const state = await readState();
    expect(state).toMatchObject({ state: "settling", status: "certified_pending_checkpoint" });
    expect(state.next_step).toMatch(/not a failure/);
  });

  it("decided success", async () => {
    stateNode(NONCE + 1, receipt(true), notFound);
    expect(await readState()).toMatchObject({ state: "decided", outcome: { outcome: "success" } });
  });

  it("decided no-op shows the warning", async () => {
    stateNode(NONCE + 1, receipt(true, [{ event_type: "NoOp", target: OTHER }], [{ type: "RevokeNoOp" }]), notFound);
    const state = await readState();
    expect(state).toMatchObject({
      state: "decided",
      outcome: { outcome: "no_op", target: OTHER, warnings: [{ type: "RevokeNoOp" }] }
    });
    expect(state.warning).toMatch(/another account can still hold it/);
  });

  it("decided soft fail carries its reason", async () => {
    stateNode(NONCE + 1, receipt(false, [{ event_type: "SoftFail", reason: "RoleMissing" }]), notFound);
    expect(await readState()).toMatchObject({
      state: "decided",
      outcome: { outcome: "soft_fail", reason: "RoleMissing" }
    });
  });

  it("unknown: the nonce passed with no receipt; never a failure", async () => {
    stateNode(NONCE + 2, notFound, notFound);
    const state = await readState();
    expect(state).toMatchObject({ state: "unknown", observed: { nextNonce: NONCE + 2 } });
    expect(state.next_step).toMatch(/Never report it as failed/);
  });
});
