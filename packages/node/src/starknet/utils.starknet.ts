// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import * as SPEC07 from '@starknet-io/starknet-types-07';
import * as SPEC from '@starknet-io/starknet-types-08';
import { Header, IBlock } from '@subql/node-core';
import {
  ApiWrapper,
  LightStarknetBlock,
  StarknetBlock,
  StarknetContractCall,
  StarknetLog,
  StarknetLogRaw,
  StarknetTransaction,
  StarknetTransactionRaw,
} from '@subql/types-starknet';
import { omit } from 'lodash';
import {
  Abi,
  hash,
  num,
  RpcProvider,
  TransactionReceipt,
  validateAndParseAddress,
} from 'starknet';
import { BlockContent } from '../indexer/types';
import { decodeGenericCalldata, decodeInvokeCalldata } from './decodeCalldata';

export function getBlockTimestamp(
  block: BlockContent | SPEC.BLOCK_HEADER,
): Date {
  return new Date(block.timestamp * 1000);
}

export function calcInterval(api: ApiWrapper): number {
  // TODO find a way to get this from the blockchain
  return 6000;
}

export function formatBlock(
  block: SPEC.BLOCK_WITH_RECEIPTS | SPEC.BLOCK_WITH_TX_HASHES,
): Omit<StarknetBlock, 'transactions'> & {
  transactions: StarknetTransactionRaw[];
} {
  return {
    blockHash: block.block_hash,
    parentHash: block.parent_hash,
    blockNumber: block.block_number,
    newRoot: block.new_root,
    sequencerAddress: block.sequencer_address,
    l1GasPrice: block.l1_gas_price,
    starknetVersion: block.starknet_version,
    timestamp: block.timestamp,
    status: block.status,
    logs: [], // Filled in at starknetBlockWrapped constructor
    transactions: block.transactions, // Transaction still raw here, will format in fetchBlock
  };
}

export function formatBlockUtil<
  B extends StarknetBlock | LightStarknetBlock = StarknetBlock,
>(block: B): IBlock<B> {
  return {
    block,
    getHeader: () => starknetBlockToHeader(block),
  };
}

export function formatLog(
  log: StarknetLogRaw,
  logIndex: number,
  tx: StarknetTransaction,
  block: Omit<StarknetBlock, 'transactions'> & {
    transactions: StarknetTransactionRaw[];
  },
): StarknetLog {
  const formattedLog = {
    address: log.from_address,
    topics: log.keys,
    blockNumber: block.blockNumber,
    blockHash: block.blockHash,
    transactionHash: tx.hash,
    data: log.data,
    logIndex: logIndex,
    block: block,
    transaction: tx,
    transactionIndex: tx.transactionIndex,
    toJSON(): string {
      return JSON.stringify(omit(this, ['transaction', 'block', 'toJSON']));
    },
  };
  return formattedLog as unknown as StarknetLog;
}

/***
 * @param tx
 * @param block
 * @param txIndex
 *  Explanation for from, to, selector, calldata with different tx type
 *  When apply filter please refer to the following:
 *
 *  1. L1_HANDLER
 *    from is the Contract Address (contract been called)
 *    entryPointSelector (method)
 *    within decodedCalls, to is same as from, selector is the entryPointSelector
 *  2. DEPLOY_ACCOUNT
 *    from is the contract_address, also is the new account address
 *  3. DECLARE
 *    from is the sender_address
 *  4. DEPLOY
 *    from is the sender_address
 *  5. INVOKE V1 and V3
 *    from is the sender_address
 *    within decodedCalls, to is the contract been called, selector is the method
 *  6. INVOKE V0
 *    from is the Contract Address (contract been called)
 *    entryPointSelector is the method been called
 */
export function formatTransaction(
  tx: {
    transaction: SPEC.TXN;
    receipt: SPEC.TXN_RECEIPT;
  },
  block:
    | StarknetBlock
    | (Omit<StarknetBlock, 'transactions'> & {
        transactions: StarknetTransactionRaw[];
      }),
  txIndex: number,
): StarknetTransaction {
  // Any type specific properties are cast here, this should hopefully find any types issues int he future.
  const transaction = {
    ...tx.transaction,
    hash: tx.receipt.transaction_hash,
    type: tx.transaction.type,
    version: tx.transaction.version,
    nonce: (
      tx.transaction as Exclude<
        SPEC.TXN,
        SPEC.DECLARE_TXN_V0 | SPEC.INVOKE_TXN_V0 | SPEC.DEPLOY_TXN
      >
    ).nonce,
    maxFee: (
      tx.transaction as Exclude<
        SPEC.TXN,
        | SPEC.DECLARE_TXN_V3
        | SPEC.INVOKE_TXN_V3
        | SPEC.BROADCASTED_DECLARE_TXN_V3
        | SPEC.DEPLOY_ACCOUNT_TXN_V3
        | SPEC.L1_HANDLER_TXN
        | SPEC.DEPLOY_TXN
      >
    ).max_fee,
    from: getTxContractAddress(tx.transaction),
    calldata: (tx.transaction as SPEC.INVOKE_TXN).calldata ?? [],
    blockHash: block.blockHash,
    blockNumber: block.blockNumber,
    blockTimestamp: block.timestamp,
    transactionIndex: txIndex,
    entryPointSelector: (tx.transaction as SPEC.INVOKE_TXN_V0)
      .entry_point_selector,
    contractAddress: (tx.transaction as SPEC.INVOKE_TXN_V0).contract_address,
    receipt: formatReceipt(tx.receipt),
    parseCallData(): StarknetContractCall[] | undefined {
      if (this.decodedCalls) {
        return this.decodedCalls;
      }

      // Handle "INVOKE V1 and V3"
      if (
        transaction.type === 'INVOKE' &&
        transaction.version !== '0x0' &&
        transaction.version !== '0x100000000000000000000000000000000'
      ) {
        return decodeInvokeCalldata(transaction.calldata);
      }
      // Handle "L1_HANDLER" and "INVOKE V0"
      else if (
        transaction.contractAddress &&
        transaction.entryPointSelector &&
        transaction.calldata
      ) {
        return [
          decodeGenericCalldata(
            transaction.contractAddress,
            transaction.entryPointSelector,
            transaction.calldata,
          ),
        ];
      }
      return;
    },
    toJSON(): string {
      return JSON.stringify(omit(this, ['receipt', 'toJSON']));
    },
  } satisfies StarknetTransaction & { toJSON: () => string };
  return transaction;
}

export function getTxContractAddress(tx: SPEC.TXN): string {
  if (tx.type === 'DEPLOY' || tx.type === 'DEPLOY_ACCOUNT') {
    const result = hash.calculateContractAddressFromHash(
      tx.contract_address_salt,
      tx.class_hash,
      tx.constructor_calldata,
      0,
    );
    return result;
  }
  return (
    (tx as SPEC.INVOKE_TXN_V0 | SPEC.L1_HANDLER_TXN).contract_address ??
    (
      tx as Exclude<
        SPEC.TXN,
        | SPEC.INVOKE_TXN_V0
        | SPEC.L1_HANDLER_TXN
        | SPEC.DEPLOY_TXN
        | SPEC.DEPLOY_ACCOUNT_TXN
      >
    ).sender_address
  );
}

export function formatReceipt(receipt: SPEC.TXN_RECEIPT): TransactionReceipt {
  return {
    ...receipt,
    toJSON(): string {
      return JSON.stringify(omit(this, ['toJSON']));
    },
  } as unknown as TransactionReceipt;
}

export function starknetBlockToHeader(block: BlockContent): Header {
  return {
    blockHeight: block.blockNumber,
    blockHash: block.blockHash,
    parentHash: block.parentHash,
    timestamp: getBlockTimestamp(block),
  };
}

export function starknetBlockHeaderToHeader(block: SPEC.BLOCK_HEADER): Header {
  return {
    blockHeight: block.block_number,
    blockHash: block.block_hash,
    parentHash: block.parent_hash,
    timestamp: getBlockTimestamp(block),
  };
}

//TODO, only used to phrase abi event
export function reverseToRawLog(log: StarknetLog): SPEC.EMITTED_EVENT {
  return {
    block_hash: log.blockHash,
    keys: [...log.topics],
    from_address: log.address,
    transaction_hash: log.transactionHash,
    block_number: log.blockNumber,
    ...log,
  };
}

// This is used when user abi not provided, or decode call in tx
export async function fetchAbiFromContractAddress(
  provider: RpcProvider,
  contractAddress: string,
): Promise<Abi> {
  const { abi: remoteAbi } = await provider.getClassAt(contractAddress);
  if (remoteAbi === undefined) {
    throw new Error('no abi.');
  }
  return remoteAbi;
}

export function encodeSelectorToHex(eventName: string): string {
  return hash.getSelector(eventName);
}

export function encodeEventKey(eventName: string): string {
  return num.toHex(hash.starknetKeccak(eventName));
}

// Check address or selector hex string are equal
export function hexEq(a: string, b: string): boolean {
  try {
    return validateAndParseAddress(a) === validateAndParseAddress(b);
  } catch (e) {
    return false;
  }
}

// check if block is finalized
export function isFinalizedBlock(
  block:
    | SPEC07.SPEC.BLOCK_WITH_RECEIPTS
    | SPEC07.SPEC.PENDING_BLOCK_WITH_RECEIPTS
    | SPEC.BLOCK_WITH_RECEIPTS
    | SPEC.PENDING_BLOCK_WITH_RECEIPTS,
): block is SPEC.BLOCK_WITH_RECEIPTS {
  return (
    'status' in block &&
    block.status !== 'PENDING' &&
    block.status !== 'REJECTED'
  );
}
