// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { BlockWithTxs, BlockWithTxHashes, SPEC } from '@starknet-io/types-js';
import { getLogger } from '@subql/node-core';
import {
  BigNumberish,
  BlockIdentifier,
  GetTransactionReceiptResponse,
  RpcProvider,
  waitForTransactionOptions,
} from 'starknet';

const logger = getLogger('safe.api.starknet');

export default class SafeStarknetProvider extends RpcProvider {
  constructor(private baseApi: RpcProvider, private blockHeight: number) {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/promise-function-async
  getBlockWithTxs(blockHashOrBlockTag: BlockIdentifier): Promise<BlockWithTxs> {
    throw new Error('Method `getBlockWithTransactions` not supported.');
  }

  // eslint-disable-next-line @typescript-eslint/promise-function-async
  getBlockWithTxHashes(
    blockHashOrBlockTag: BlockIdentifier,
  ): Promise<BlockWithTxHashes> {
    throw new Error('Method `getBlock` not supported.');
  }

  // eslint-disable-next-line @typescript-eslint/promise-function-async
  getTransactionReceipt(
    transactionHash: string,
  ): Promise<GetTransactionReceiptResponse> {
    throw new Error('Method `getTransactionReceipt` not supported.');
  }
  // eslint-disable-next-line @typescript-eslint/promise-function-async
  getEvents(filter): Promise<SPEC.EVENTS_CHUNK> {
    throw new Error('Method `getEvents` not supported.');
  }
  // eslint-disable-next-line @typescript-eslint/promise-function-async
  getBlockNumber(): Promise<number> {
    throw new Error('Method `getBlockNumber` not supported.');
  }
  // eslint-disable-next-line @typescript-eslint/promise-function-async
  getL1GasPrice(): Promise<string> {
    throw new Error('Method `getL1GasPrice` not supported.');
  }

  // eslint-disable-next-line @typescript-eslint/promise-function-async
  waitForTransaction(
    txHash: BigNumberish,
    options?: waitForTransactionOptions,
  ): Promise<GetTransactionReceiptResponse> {
    throw new Error('Method `waitForTransaction` not supported.');
  }
  // eslint-disable-next-line @typescript-eslint/promise-function-async
  resolveName(name: string | Promise<string>): Promise<string | null> {
    throw new Error('Method `resolveName` not supported.');
  }
  // eslint-disable-next-line @typescript-eslint/promise-function-async
  lookupAddress(address: string | Promise<string>): Promise<string | null> {
    throw new Error('Method `lookupAddress` not supported.');
  }
}
