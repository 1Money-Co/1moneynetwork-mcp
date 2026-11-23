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
import type { AuthorizedTxV2, Memo, Signature, ZeroXString } from "@1money/protocol-ts-sdk";

import type { ProtocolApiClient } from "../client.js";
import { notSent, sendFailure } from "./writeErrors.js";

/**
 * The v2 operations this server prepares and submits. The server never holds
 * a key: the caller signs the prepared `signing_hash`, and submit rebuilds the
 * same transaction from the unsigned payload and the signature.
 */
export const WRITE_OPERATIONS = [
  "payment",
  "tokenIssue",
  "tokenBurn",
  "tokenBridgeAndMint",
  "tokenBurnAndBridge"
] as const;

export type WriteOperation = (typeof WRITE_OPERATIONS)[number];

type Submitter = (authorized: AuthorizedTxV2) => Promise<{ hash: string }>;

export const submittersOf = (api: ProtocolApiClient): Record<WriteOperation, Submitter> => ({
  payment: api.transactions.payment,
  tokenIssue: api.tokens.issueToken,
  tokenBurn: api.tokens.burnToken,
  tokenBridgeAndMint: api.tokens.bridgeAndMint,
  tokenBurnAndBridge: api.tokens.burnAndBridge
});

const SIGN_THEN_SUBMIT =
  "Sign signing_hash (utils_sign_digest or your own wallet), then call transactions_submit with operation, unsigned, memo and the signature.";

export type PreparedWrite = {
  operation: WriteOperation;
  unsigned: Record<string, unknown>;
  memo?: Memo;
  signing_hash: ZeroXString;
  next_step: string;
};

const prepare = (operation: WriteOperation, unsigned: Record<string, unknown>, memo?: Memo) =>
  prepareTransactionV2(operation, unsigned as never, { memo });

/** Validates and hashes a write. Sends nothing; throws on invalid input. */
export const prepareWrite = (
  operation: WriteOperation,
  unsigned: Record<string, unknown>,
  memo?: Memo
): PreparedWrite => {
  const prepared = prepare(operation, unsigned, memo);
  return {
    operation,
    unsigned: prepared.unsigned as Record<string, unknown>,
    ...(memo !== undefined && { memo }),
    signing_hash: prepared.signingHash,
    next_step: SIGN_THEN_SUBMIT
  };
};

export type SubmittedWrite = {
  submitted: true;
  operation: WriteOperation;
  transaction_hash: string;
  response: unknown;
};

/**
 * Sends a prepared write once. Throws WriteFailure, whose `submitted` tells
 * whether signing the same intent again is safe.
 */
export const submitWrite = async (
  submit: Submitter,
  operation: WriteOperation,
  unsigned: Record<string, unknown>,
  signature: Signature,
  memo?: Memo
): Promise<SubmittedWrite> => {
  let authorized: AuthorizedTxV2;
  try {
    authorized = prepare(operation, unsigned, memo).authorize(signature);
  } catch (error) {
    throw notSent(error);
  }

  try {
    const response = await submit(authorized);
    return { submitted: true, operation, transaction_hash: authorized.transactionHash, response };
  } catch (error) {
    throw sendFailure(error, authorized.transactionHash);
  }
};

export const signDigest = (signingHash: ZeroXString, privateKey: ZeroXString): Promise<Signature> =>
  createPrivateKeySigner(privateKey).signDigest(signingHash);
