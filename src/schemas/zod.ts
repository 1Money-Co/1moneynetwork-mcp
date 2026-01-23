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

const TokensManageBlacklistSchema = z.object({ "request": z.object({ "chain_id": z.number(), "nonce": z.number(), "action": z.enum(["Add","Remove"]), "address": z.string(), "token": z.string(), "signature": z.object({ "r": z.string(), "s": z.string(), "v": z.union([z.number(), z.boolean()]) }).strict() }).strict() }).strict()
toolSchemas["tokens.manage_blacklist"] = TokensManageBlacklistSchema;

const TokensManageWhitelistSchema = z.object({ "request": z.object({ "chain_id": z.number(), "nonce": z.number(), "action": z.enum(["Add","Remove"]), "address": z.string(), "token": z.string(), "signature": z.object({ "r": z.string(), "s": z.string(), "v": z.union([z.number(), z.boolean()]) }).strict() }).strict() }).strict()
toolSchemas["tokens.manage_whitelist"] = TokensManageWhitelistSchema;

const TokensBurnSchema = z.object({ "request": z.object({ "chain_id": z.number(), "nonce": z.number(), "recipient": z.string(), "value": z.string(), "token": z.string(), "signature": z.object({ "r": z.string(), "s": z.string(), "v": z.union([z.number(), z.boolean()]) }).strict() }).strict() }).strict()
toolSchemas["tokens.burn"] = TokensBurnSchema;

const TokensGrantAuthoritySchema = z.object({ "request": z.object({ "chain_id": z.number(), "nonce": z.number(), "action": z.enum(["Grant","Revoke"]), "authority_type": z.enum(["MasterMintBurn","MintBurnTokens","Pause","ManageList","UpdateMetadata","Bridge"]), "authority_address": z.string(), "token": z.string(), "value": z.string().optional(), "signature": z.object({ "r": z.string(), "s": z.string(), "v": z.union([z.number(), z.boolean()]) }).strict() }).strict() }).strict()
toolSchemas["tokens.grant_authority"] = TokensGrantAuthoritySchema;

const TokensIssueSchema = z.object({ "request": z.object({ "chain_id": z.number(), "nonce": z.number(), "symbol": z.string(), "name": z.string(), "decimals": z.number(), "master_authority": z.string(), "is_private": z.boolean(), "signature": z.object({ "r": z.string(), "s": z.string(), "v": z.union([z.number(), z.boolean()]) }).strict() }).strict() }).strict()
toolSchemas["tokens.issue"] = TokensIssueSchema;

const TokensMintSchema = z.object({ "request": z.object({ "chain_id": z.number(), "nonce": z.number(), "recipient": z.string(), "value": z.string(), "token": z.string(), "signature": z.object({ "r": z.string(), "s": z.string(), "v": z.union([z.number(), z.boolean()]) }).strict() }).strict() }).strict()
toolSchemas["tokens.mint"] = TokensMintSchema;

const TokensPauseSchema = z.object({ "request": z.object({ "chain_id": z.number(), "nonce": z.number(), "action": z.enum(["Pause","Unpause"]), "token": z.string(), "signature": z.object({ "r": z.string(), "s": z.string(), "v": z.union([z.number(), z.boolean()]) }).strict() }).strict() }).strict()
toolSchemas["tokens.pause"] = TokensPauseSchema;

const TokensUpdateMetadataSchema = z.object({ "request": z.object({ "chain_id": z.number(), "nonce": z.number(), "name": z.string(), "uri": z.string(), "token": z.string(), "additional_metadata": z.array(z.object({ "key": z.string(), "value": z.string() }).strict()), "signature": z.object({ "r": z.string(), "s": z.string(), "v": z.union([z.number(), z.boolean()]) }).strict() }).strict() }).strict()
toolSchemas["tokens.update_metadata"] = TokensUpdateMetadataSchema;

const TokensBridgeAndMintSchema = z.object({ "request": z.object({ "chain_id": z.number(), "nonce": z.number(), "recipient": z.string(), "value": z.string(), "token": z.string(), "source_chain_id": z.number(), "source_tx_hash": z.string(), "bridge_metadata": z.string(), "signature": z.object({ "r": z.string(), "s": z.string(), "v": z.union([z.number(), z.boolean()]) }).strict() }).strict() }).strict()
toolSchemas["tokens.bridge_and_mint"] = TokensBridgeAndMintSchema;

const TokensBurnAndBridgeSchema = z.object({ "request": z.object({ "bridge_metadata": z.string(), "chain_id": z.number(), "destination_address": z.string(), "destination_chain_id": z.number(), "escrow_fee": z.string(), "nonce": z.number(), "sender": z.string(), "token": z.string(), "value": z.string(), "signature": z.object({ "r": z.string(), "s": z.string(), "v": z.union([z.number(), z.boolean()]) }).strict() }).strict() }).strict()
toolSchemas["tokens.burn_and_bridge"] = TokensBurnAndBridgeSchema;

const TransactionsGetByHashSchema = z.object({ "hash": z.string() }).strict()
toolSchemas["transactions.get_by_hash"] = TransactionsGetByHashSchema;

const TransactionsGetReceiptByHashSchema = z.object({ "hash": z.string() }).strict()
toolSchemas["transactions.get_receipt_by_hash"] = TransactionsGetReceiptByHashSchema;

const TransactionsGetFinalizedByHashSchema = z.object({ "hash": z.string() }).strict()
toolSchemas["transactions.get_finalized_by_hash"] = TransactionsGetFinalizedByHashSchema;

const TransactionsEstimateFeeSchema = z.object({ "from": z.string(), "value": z.union([z.string(), z.number()]), "token": z.string().optional() }).strict()
toolSchemas["transactions.estimate_fee"] = TransactionsEstimateFeeSchema;

const TransactionsPaymentSchema = z.object({ "request": z.object({ "chain_id": z.number(), "nonce": z.number(), "recipient": z.string(), "value": z.string(), "token": z.string(), "signature": z.object({ "r": z.string(), "s": z.string(), "v": z.union([z.number(), z.boolean()]) }).strict() }).strict() }).strict()
toolSchemas["transactions.payment"] = TransactionsPaymentSchema;

const UtilsDeriveTokenAddressSchema = z.object({ "wallet_address": z.string(), "mint_address": z.string() }).strict()
toolSchemas["utils.derive_token_address"] = UtilsDeriveTokenAddressSchema;

const UtilsSignMessageSchema = z.object({ "payload": z.union([z.string(), z.number(), z.boolean(), z.record(z.string(), z.any()), z.array(z.any()), z.null()]), "private_key": z.string() }).strict()
toolSchemas["utils.sign_message"] = UtilsSignMessageSchema;

const UtilsEncodePayloadSchema = z.object({ "payload": z.union([z.string(), z.number(), z.boolean(), z.record(z.string(), z.any()), z.array(z.any()), z.null()]) }).strict()
toolSchemas["utils.encode_payload"] = UtilsEncodePayloadSchema;

const UtilsToHexSchema = z.object({ "value": z.any() }).strict()
toolSchemas["utils.to_hex"] = UtilsToHexSchema;

const UtilsCalcTxHashSchema = z.object({ "payload": z.union([z.string(), z.number(), z.boolean(), z.record(z.string(), z.any()), z.array(z.any()), z.null()]), "signature": z.object({ "r": z.string(), "s": z.string(), "v": z.union([z.number(), z.boolean()]) }).strict() }).strict()
toolSchemas["utils.calc_tx_hash"] = UtilsCalcTxHashSchema;

const UtilsTypeofSchema = z.object({ "value": z.any() }).strict()
toolSchemas["utils.typeof"] = UtilsTypeofSchema;

const UtilsSafePromiseAllSchema = z.object({ "calls": z.array(z.object({ "tool": z.string(), "input": z.record(z.string(), z.any()) }).strict()) }).strict()
toolSchemas["utils.safe_promise_all"] = UtilsSafePromiseAllSchema;

const UtilsSafePromiseLineSchema = z.object({ "calls": z.array(z.object({ "tool": z.string(), "input": z.record(z.string(), z.any()) }).strict()) }).strict()
toolSchemas["utils.safe_promise_line"] = UtilsSafePromiseLineSchema;

export type ToolName = keyof typeof toolSchemas;
