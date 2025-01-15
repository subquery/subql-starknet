// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { SPEC } from '@starknet-io/types-js';
import { Header, IBlock } from '@subql/node-core';
import {
  ApiWrapper,
  LightStarknetBlock,
  StarknetBlock,
  StarknetContractCall,
  StarknetLog,
  StarknetLogRaw,
  StarknetResult,
  StarknetTransaction,
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

export function calcInterval(api: ApiWrapper): number {
  // TODO find a way to get this from the blockchain
  return 6000;
}

export function formatBlock(block: any): StarknetBlock {
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
  } as StarknetBlock;
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
  block: StarknetBlock,
): StarknetLog {
  const formattedLog = {
    block,
    address: log.from_address,
    topics: log.keys,
    blockNumber: block.blockNumber,
    blockHash: block.blockHash,
    transactionHash: log.transaction_hash,
    data: log.data,
    toJSON(): string {
      return JSON.stringify(omit(this, ['transaction', 'block', 'toJSON']));
    },
  };

  // Define this afterwards as the spread on `...log` breaks defining a getter
  Object.defineProperty(formattedLog, 'transaction', {
    get: () => {
      const rawTransaction = block.transactions?.find(
        (tx) => tx.hash === log.transaction_hash,
      );

      return rawTransaction;
    },
  });
  return formattedLog as unknown as StarknetLog;
}

export function formatTransaction(
  tx: Record<string, any>,
  block: StarknetBlock,
  txIndex: number,
): Omit<StarknetTransaction, 'receipt'> {
  const transaction = {
    ...tx,
    hash: tx.transaction_hash,
    type: tx.type,
    version: tx.version,
    nonce: tx.nonce,
    maxFee: tx.max_fee,
    from: getTxContractAddress(tx),
    calldata: tx.calldata,
    blockHash: block.blockHash,
    blockNumber: block.blockNumber,
    blockTimestamp: block.timestamp,
    transactionIndex: txIndex,
    entryPointSelector: tx.entry_point_selector,
    contractAddress: tx.contract_address,
    parseCallData(): StarknetContractCall[] | undefined {
      if (this.decodedCalls) {
        return this.decodedCalls;
      }

      // Handle "INVOKE V1 and V3"
      if (
        transaction.type === 'INVOKE' &&
        transaction.version !== ('0x0' || '0x100000000000000000000000000000000')
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
  } as Omit<StarknetTransaction, 'receipt'>;
  return transaction;
}

export function getTxContractAddress(tx: Record<string, any>): string {
  if (tx.type === 'DEPLOY' || tx.type === 'DEPLOY_ACCOUNT') {
    const result = hash.calculateContractAddressFromHash(
      tx.contract_address_salt,
      tx.class_hash,
      tx.constructor_calldata,
      0,
    );
    return result;
  }
  return tx.contract_address ?? tx.sender_address;
}

export function formatReceipt(
  receipt: Record<string, any>,
): TransactionReceipt {
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
  };
}

export function starknetBlockHeaderToHeader(block: SPEC.BLOCK_HEADER): Header {
  return {
    blockHeight: block.block_number,
    blockHash: block.block_hash,
    parentHash: block.parent_hash,
  };
}

//TODO, only used to phrase abi event
export function reverseToRawLog(log: StarknetLog): StarknetLogRaw {
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
