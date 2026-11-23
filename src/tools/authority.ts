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

import {
  authorityOperationState,
  readEnvelopeMode,
  settledPayload,
  validateTokenAuthority,
  validateTokenManageList,
  validateTokenMetadata,
  validateTokenMint,
  validateTokenPause
} from "@1money/protocol-ts-sdk";
import type {
  AuthorityOperationState,
  EnvelopeMode,
  LegacyAuthorityOperation,
  Memo
} from "@1money/protocol-ts-sdk";

import { prepareWrite, type PreparedWrite } from "./writes.js";

/**
 * The node's envelope mode as this server reports it. The server builds only
 * the settled authority envelope, so a node that does not report `settled`
 * (including one that reports nothing) is "not active yet", never legacy.
 */
export type EnvelopeModeView =
  | { envelope_mode: "settled"; settled_active: true }
  | { envelope_mode: "upgrade_gap"; settled_active: false }
  | { envelope_mode: "not_reported"; settled_active: false }
  | { envelope_mode: "unreadable"; settled_active: false; reason: unknown }
  | { envelope_mode: "unrecognized"; settled_active: false; reported: unknown };

export const envelopeModeView = (mode: EnvelopeMode): EnvelopeModeView => {
  switch (mode.mode) {
    case "settled":
      return { envelope_mode: "settled", settled_active: true };
    case "upgrade_gap":
      return { envelope_mode: "upgrade_gap", settled_active: false };
    case "unrecognized":
      return { envelope_mode: "unrecognized", settled_active: false, reported: mode.reported };
    case "legacy":
      return mode.reason.kind === "not_reported"
        ? { envelope_mode: "not_reported", settled_active: false }
        : { envelope_mode: "unreadable", settled_active: false, reason: mode.reason };
  }
};

export const readEnvelopeModeView = async (): Promise<EnvelopeModeView> =>
  envelopeModeView(await readEnvelopeMode());

export type AuthorityKind = LegacyAuthorityOperation["kind"];

const VALIDATORS: Record<AuthorityKind, (payload: never) => void> = {
  mint: validateTokenMint,
  authority: validateTokenAuthority,
  blacklist: validateTokenManageList,
  whitelist: validateTokenManageList,
  pause: validateTokenPause,
  metadata: validateTokenMetadata
};

export const NOT_ACTIVE_STEP =
  "The settled authority envelope is not active on this network yet. Nothing was prepared or sent. Try again after activation, when chain_get_envelope_mode reports settled_active true.";

const SIGN_SUBMIT_THEN_TRACK =
  "Sign signing_hash, then call transactions_submit with operation, unsigned, memo and the signature. Then call tokens_authority_operation_state with the signer's address, unsigned.nonce and the transaction_hash until its state is decided.";

export type PreparedAuthority =
  | { state: "not_active"; prepared: false; sent: false; mode: EnvelopeModeView; next_step: string }
  | (PreparedWrite & { state: "prepared"; envelope: "settled"; reference_checkpoint: number });

/**
 * Builds the settled authority envelope (native operation 17) of an operation
 * given in its familiar per-kind fields, at the same chain and nonce. Reads
 * the envelope mode, the latest committed checkpoint as the reference, and,
 * for a list operation, the token's privacy, which decides its list. Sends
 * nothing. Throws on invalid input or a read that does not answer.
 */
export const prepareAuthorityOperation = async (
  kind: AuthorityKind,
  payload: Record<string, unknown>,
  memo?: Memo
): Promise<PreparedAuthority> => {
  const mode = await readEnvelopeModeView();
  if (!mode.settled_active) {
    return { state: "not_active", prepared: false, sent: false, mode, next_step: NOT_ACTIVE_STEP };
  }
  VALIDATORS[kind](payload as never);
  const settled = await settledPayload({ kind, payload } as LegacyAuthorityOperation);
  const prepared = prepareWrite("settledAuthority", settled as unknown as Record<string, unknown>, memo);
  return {
    state: "prepared",
    envelope: "settled",
    ...prepared,
    reference_checkpoint: settled.reference_checkpoint,
    next_step: SIGN_SUBMIT_THEN_TRACK
  };
};

const STATE_STEP: Record<AuthorityOperationState["state"], string> = {
  pending: "Not executed yet: the signer's nonce has not passed it. Read the state again later.",
  settling:
    "Certified and final; its checkpoint decides the result. This is not a failure. Read the state again after the next checkpoint.",
  decided: "Decided by its receipt. See outcome.",
  unknown:
    "It may have executed, or another transaction took the nonce. Never report it as failed. Do not sign this intent again until a node with the full history shows no receipt for its hash."
};

const NO_OP_WARNING =
  "No-op: the operation changed only the signer's nonce. A no-op revoke means the named account held no role, so another account can still hold it.";

/** Where a settled authority operation stands, from one round of reads. */
export const authorityState = async (signer: string, nonce: number, transactionHash: string) => {
  const state = await authorityOperationState(signer, nonce, transactionHash);
  const warning = state.state === "decided" && state.outcome.outcome === "no_op" ? { warning: NO_OP_WARNING } : {};
  return { ...state, ...warning, next_step: STATE_STEP[state.state] };
};
