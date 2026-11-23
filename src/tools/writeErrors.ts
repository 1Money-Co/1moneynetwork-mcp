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
  authorityRefusalOf,
  TransactionHashMismatchError,
  TransactionLockedError,
  TransactionOutcomeUnknownError,
  TransactionSubmissionError
} from "@1money/protocol-ts-sdk";
import type { AuthorityRefusal, AuthorityRefusalKind } from "@1money/protocol-ts-sdk";

/**
 * Whether the node may hold the transaction. Only `false` makes signing the
 * same intent again safe.
 */
export type Submitted = false | true | "unknown";

export type WriteFailureBody = {
  error: string;
  message: string;
  submitted: Submitted;
  next_step: string;
  transaction_hash?: string;
  nonce_used?: boolean;
  status?: number;
  problem_type?: string;
  action?: string;
  refusal?: AuthorityRefusal;
};

/**
 * A write that did not succeed. The tool result carries its body as data,
 * so the caller can act on `submitted` and `next_step`.
 */
export class WriteFailure extends Error {
  constructor(readonly body: WriteFailureBody) {
    super(body.message);
    this.name = "WriteFailure";
  }
}

export const NEXT_STEP = {
  fixInput: "Nothing was sent. Fix the input and prepare again.",
  fixRequest: "The node refused the transaction and it had no effect. Fix the request, then prepare and sign again.",
  retrySame: "The node refused the transaction for now and it had no effect. Send the same signed transaction later.",
  otherNode: "This node cannot take the transaction and it had no effect. Send the same signed transaction to another node.",
  nonceUsed:
    "The nonce is used, possibly by this transaction. Read this transaction by hash before you sign anything at this nonce.",
  held: "The node holds this transaction. Do not sign this intent again. Read its status and receipt by hash.",
  unknown:
    "The outcome is unknown: the transaction may execute. Do not sign this intent again. Read its status and receipt by hash.",
  hashMismatch:
    "The node accepted a transaction with a different hash than the one signed here. Do not sign this intent again. Read both hashes."
} as const;

const nameOf = (error: unknown) => (error instanceof Error ? error.name : "Error");
const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** A failure before anything was sent: input validation, signature checks. */
export const notSent = (error: unknown) =>
  new WriteFailure({
    error: nameOf(error),
    message: messageOf(error),
    submitted: false,
    next_step: NEXT_STEP.fixInput
  });

/**
 * Next steps of the token authority refusals. The legacy envelope refusal is
 * left to the generic step: this server never sends a legacy authority
 * envelope.
 */
const AUTHORITY_REFUSAL_STEP: Partial<Record<AuthorityRefusalKind, string>> = {
  settled_envelope_not_active:
    "This node does not take the settled envelope yet, and the transaction had no effect. Send the same signed transaction later, after activation.",
  reference_checkpoint_not_committed:
    "The node has not committed the reference checkpoint yet, and the transaction had no effect. Prepare again after a short wait and sign the new signing_hash.",
  token_not_at_reference_checkpoint:
    "The token is not in the reference checkpoint, and the transaction had no effect. This does not show that the token does not exist. Prepare again after a short wait and sign the new signing_hash.",
  reference_checkpoint_too_old:
    "The reference checkpoint is too old. Prepare and sign again with a new checkpoint only if this transaction was never sent before. If it was sent before, it may have executed: read its status and receipt by hash first."
};

const refusalStep = (error: TransactionSubmissionError, refusal?: AuthorityRefusal) => {
  const authorityStep = refusal && AUTHORITY_REFUSAL_STEP[refusal.kind];
  if (authorityStep) {
    return authorityStep;
  }
  if (error.nonceUsed) {
    return NEXT_STEP.nonceUsed;
  }
  switch (error.action) {
    case "retry_later":
      return NEXT_STEP.retrySame;
    case "use_other_node":
      return NEXT_STEP.otherNode;
    default:
      return NEXT_STEP.fixRequest;
  }
};

const sentFields = (error: {
  nonceUsed: boolean;
  status?: number;
  problemType?: string;
  action?: unknown;
}) => ({
  nonce_used: error.nonceUsed,
  ...(error.status !== undefined && { status: error.status }),
  ...(error.problemType !== undefined && { problem_type: error.problemType }),
  ...(typeof error.action === "string" && { action: error.action })
});

/**
 * Maps an error of the send step. An error the SDK does not classify counts
 * as an unknown outcome: the POST may have reached the node.
 */
export const sendFailure = (error: unknown, transactionHash: string): WriteFailure => {
  const base = { error: nameOf(error), message: messageOf(error), transaction_hash: transactionHash };
  if (error instanceof TransactionSubmissionError) {
    const refusal = authorityRefusalOf(error);
    return new WriteFailure({
      ...base,
      submitted: false,
      ...sentFields(error),
      ...(refusal && { refusal }),
      next_step: refusalStep(error, refusal)
    });
  }
  if (error instanceof TransactionLockedError) {
    return new WriteFailure({ ...base, submitted: true, ...sentFields(error), next_step: NEXT_STEP.held });
  }
  if (error instanceof TransactionHashMismatchError) {
    return new WriteFailure({ ...base, submitted: true, next_step: NEXT_STEP.hashMismatch });
  }
  if (error instanceof TransactionOutcomeUnknownError) {
    return new WriteFailure({ ...base, submitted: "unknown", ...sentFields(error), next_step: NEXT_STEP.unknown });
  }
  return new WriteFailure({ ...base, submitted: "unknown", next_step: NEXT_STEP.unknown });
};
