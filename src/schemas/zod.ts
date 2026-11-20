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

import { z } from "zod";

export const toolSchemas = {} as Record<string, z.ZodTypeAny>;

const AccountsGetNonceSchema = z.object({ "address": z.string() }).strict()
toolSchemas["accounts.get_nonce"] = AccountsGetNonceSchema;

const AccountsGetBbnonceSchema = z.object({ "address": z.string() }).strict()
toolSchemas["accounts.get_bbnonce"] = AccountsGetBbnonceSchema;

const AccountsGetTokenAccountSchema = z.object({ "address": z.string(), "token": z.string() }).strict()
toolSchemas["accounts.get_token_account"] = AccountsGetTokenAccountSchema;

const ChainGetChainIdSchema = z.object({}).strict()
toolSchemas["chain.get_chain_id"] = ChainGetChainIdSchema;

const CheckpointsGetNumberSchema = z.object({}).strict()
toolSchemas["checkpoints.get_number"] = CheckpointsGetNumberSchema;

const CheckpointsGetByHashSchema = z.object({ "hash": z.string(), "full": z.boolean().optional() }).strict()
toolSchemas["checkpoints.get_by_hash"] = CheckpointsGetByHashSchema;

const CheckpointsGetByNumberSchema = z.object({ "number": z.union([z.number(), z.string()]), "full": z.boolean().optional() }).strict()
toolSchemas["checkpoints.get_by_number"] = CheckpointsGetByNumberSchema;

const CheckpointsGetReceiptsByNumberSchema = z.object({ "number": z.union([z.number(), z.string()]) }).strict()
toolSchemas["checkpoints.get_receipts_by_number"] = CheckpointsGetReceiptsByNumberSchema;

const TokensGetTokenMetadataSchema = z.object({ "token": z.string() }).strict()
toolSchemas["tokens.get_token_metadata"] = TokensGetTokenMetadataSchema;

const TokensPrepareIssueSchema = z.object({ "unsigned": z.object({ "chain_id": z.number().describe("Chain id from chain_get_chain_id"), "nonce": z.number().describe("The signer's next nonce from accounts_get_nonce"), "symbol": z.string(), "name": z.string(), "decimals": z.number(), "master_authority": z.string(), "is_private": z.boolean(), "clawback_enabled": z.boolean().describe("Default true").optional() }).strict(), "memo": z.object({ "type": z.string().optional(), "format": z.string().optional(), "data": z.string().optional() }).strict().describe("Optional transaction memo").optional() }).strict().describe("Prepare a v2 token issue. Sends nothing. Returns signing_hash: sign it (utils_sign_digest or your own wallet), then call transactions_submit with the returned operation, unsigned and memo, and the signature.")
toolSchemas["tokens.prepare_issue"] = TokensPrepareIssueSchema;

const TokensPrepareBurnSchema = z.object({ "unsigned": z.object({ "chain_id": z.number().describe("Chain id from chain_get_chain_id"), "nonce": z.number().describe("The signer's next nonce from accounts_get_nonce"), "value": z.string().describe("Amount in the token's base unit"), "token": z.string().describe("Token address") }).strict(), "memo": z.object({ "type": z.string().optional(), "format": z.string().optional(), "data": z.string().optional() }).strict().describe("Optional transaction memo").optional() }).strict().describe("Prepare a v2 burn of the signer's own tokens. Sends nothing. Returns signing_hash: sign it (utils_sign_digest or your own wallet), then call transactions_submit with the returned operation, unsigned and memo, and the signature.")
toolSchemas["tokens.prepare_burn"] = TokensPrepareBurnSchema;

const TokensPrepareBridgeAndMintSchema = z.object({ "unsigned": z.object({ "chain_id": z.number().describe("Chain id from chain_get_chain_id"), "nonce": z.number().describe("The signer's next nonce from accounts_get_nonce"), "recipient": z.string(), "value": z.string(), "token": z.string(), "source_chain_id": z.number(), "source_tx_hash": z.string(), "bridge_metadata": z.string() }).strict(), "memo": z.object({ "type": z.string().optional(), "format": z.string().optional(), "data": z.string().optional() }).strict().describe("Optional transaction memo").optional() }).strict().describe("Prepare a v2 bridge-and-mint. Sends nothing. Returns signing_hash: sign it (utils_sign_digest or your own wallet), then call transactions_submit with the returned operation, unsigned and memo, and the signature.")
toolSchemas["tokens.prepare_bridge_and_mint"] = TokensPrepareBridgeAndMintSchema;

const TokensPrepareBurnAndBridgeSchema = z.object({ "unsigned": z.object({ "chain_id": z.number().describe("Chain id from chain_get_chain_id"), "nonce": z.number().describe("The signer's next nonce from accounts_get_nonce"), "sender": z.string(), "value": z.string(), "token": z.string(), "destination_chain_id": z.number(), "destination_address": z.string(), "escrow_fee": z.string(), "bridge_metadata": z.string(), "bridge_param": z.string().describe("0x-prefixed hex bytes") }).strict(), "memo": z.object({ "type": z.string().optional(), "format": z.string().optional(), "data": z.string().optional() }).strict().describe("Optional transaction memo").optional() }).strict().describe("Prepare a v2 burn-and-bridge. Sends nothing. Returns signing_hash: sign it (utils_sign_digest or your own wallet), then call transactions_submit with the returned operation, unsigned and memo, and the signature.")
toolSchemas["tokens.prepare_burn_and_bridge"] = TokensPrepareBurnAndBridgeSchema;

const TransactionsGetByHashSchema = z.object({ "hash": z.string() }).strict()
toolSchemas["transactions.get_by_hash"] = TransactionsGetByHashSchema;

const TransactionsGetStatusByHashSchema = z.object({ "hash": z.string() }).strict().describe("Read a transaction's status by hash: pending, certified_pending_checkpoint, checkpointed or finalized.")
toolSchemas["transactions.get_status_by_hash"] = TransactionsGetStatusByHashSchema;

const TransactionsGetReceiptByHashSchema = z.object({ "hash": z.string() }).strict()
toolSchemas["transactions.get_receipt_by_hash"] = TransactionsGetReceiptByHashSchema;

const TransactionsGetFinalizedByHashSchema = z.object({ "hash": z.string() }).strict()
toolSchemas["transactions.get_finalized_by_hash"] = TransactionsGetFinalizedByHashSchema;

const TransactionsEstimateFeeSchema = z.object({ "from": z.string().describe("Sender address"), "to": z.string().describe("Recipient address"), "value": z.union([z.string(), z.number()]), "token": z.string().describe("Token address") }).strict().describe("Estimate the fee of a payment.")
toolSchemas["transactions.estimate_fee"] = TransactionsEstimateFeeSchema;

const TransactionsPreparePaymentSchema = z.object({ "unsigned": z.object({ "chain_id": z.number().describe("Chain id from chain_get_chain_id"), "nonce": z.number().describe("The signer's next nonce from accounts_get_nonce"), "recipient": z.string(), "value": z.string().describe("Amount in the token's base unit"), "token": z.string().describe("Token address") }).strict(), "memo": z.object({ "type": z.string().optional(), "format": z.string().optional(), "data": z.string().optional() }).strict().describe("Optional transaction memo").optional() }).strict().describe("Prepare a v2 payment. Sends nothing. Returns signing_hash: sign it (utils_sign_digest or your own wallet), then call transactions_submit with the returned operation, unsigned and memo, and the signature.")
toolSchemas["transactions.prepare_payment"] = TransactionsPreparePaymentSchema;

const TransactionsSubmitSchema = z.object({ "operation": z.enum(["payment","tokenIssue","tokenBurn","tokenBridgeAndMint","tokenBurnAndBridge"]).describe("The operation a prepare tool returned"), "unsigned": z.record(z.string(), z.any()).describe("The unsigned payload a prepare tool returned, unchanged"), "memo": z.object({ "type": z.string().optional(), "format": z.string().optional(), "data": z.string().optional() }).strict().describe("Optional transaction memo").optional(), "signature": z.object({ "r": z.string().describe("0x-prefixed 32-byte hex"), "s": z.string().describe("0x-prefixed 32-byte hex, low-S"), "v": z.union([z.number(), z.boolean()]) }).strict().describe("secp256k1 signature of signing_hash") }).strict().describe("Authorize a prepared v2 transaction with its signature and send it once to POST /v2. On an error, the result says whether it was submitted (false, true or \"unknown\") and the next step. Never sign the same intent again after submitted true or \"unknown\": read the status by hash first.")
toolSchemas["transactions.submit"] = TransactionsSubmitSchema;

const UtilsDeriveTokenAddressSchema = z.object({ "wallet_address": z.string(), "mint_address": z.string() }).strict()
toolSchemas["utils.derive_token_address"] = UtilsDeriveTokenAddressSchema;

const UtilsSignDigestSchema = z.object({ "signing_hash": z.string().describe("0x-prefixed 32-byte digest from a prepare tool"), "private_key": z.string() }).strict().describe("Sign a 32-byte digest with a secp256k1 private key. The key passes through this conversation: use it only with test keys.")
toolSchemas["utils.sign_digest"] = UtilsSignDigestSchema;

const UtilsEncodePayloadSchema = z.object({ "payload": z.union([z.string(), z.number(), z.boolean(), z.record(z.string(), z.any()), z.array(z.any()), z.null()]) }).strict()
toolSchemas["utils.encode_payload"] = UtilsEncodePayloadSchema;

const UtilsToHexSchema = z.object({ "value": z.any() }).strict()
toolSchemas["utils.to_hex"] = UtilsToHexSchema;

const UtilsTypeofSchema = z.object({ "value": z.any() }).strict()
toolSchemas["utils.typeof"] = UtilsTypeofSchema;

const UtilsSafePromiseAllSchema = z.object({ "calls": z.array(z.object({ "tool": z.string(), "input": z.record(z.string(), z.any()) }).strict()) }).strict()
toolSchemas["utils.safe_promise_all"] = UtilsSafePromiseAllSchema;

const UtilsSafePromiseLineSchema = z.object({ "calls": z.array(z.object({ "tool": z.string(), "input": z.record(z.string(), z.any()) }).strict()) }).strict()
toolSchemas["utils.safe_promise_line"] = UtilsSafePromiseLineSchema;

export type ToolName = keyof typeof toolSchemas;
