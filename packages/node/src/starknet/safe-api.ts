// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import * as RPCSPEC08 from '@starknet-io/starknet-types-08';
import * as SPEC from '@starknet-io/starknet-types-09';
import { getLogger } from '@subql/node-core';
import {
  BigNumberish,
  BlockIdentifier,
  Call,
  CompiledSierra,
  GetTransactionReceiptResponse,
  LegacyContractClass,
  RpcProvider,
  waitForTransactionOptions,
} from 'starknet';

const logger = getLogger('safe.api.starknet');

export default class SafeStarknetProvider extends RpcProvider {
  constructor(private baseApi: RpcProvider, private blockHeight: number) {
    super();
  }

  async getStorageAt(
    contractAddress: BigNumberish,
    key: BigNumberish,
    blockIdentifier?: BlockIdentifier,
  ): Promise<string> {
    return this.baseApi.getStorageAt(contractAddress, key, this.blockHeight);
  }
  async getClass(
    classHash: BigNumberish,
    blockIdentifier?: BlockIdentifier,
  ): Promise<LegacyContractClass | CompiledSierra> {
    return this.baseApi.getClass(classHash, this.blockHeight);
  }
  async getClassAt(
    contractAddress: BigNumberish,
    blockIdentifier?: BlockIdentifier,
  ): Promise<LegacyContractClass | CompiledSierra> {
    return this.baseApi.getClassAt(contractAddress, this.blockHeight);
  }

  async estimateMessageFee(
    message: SPEC.L1Message,
    blockIdentifier?: BlockIdentifier,
  ): Promise<SPEC.MESSAGE_FEE_ESTIMATE | RPCSPEC08.FEE_ESTIMATE> {
    // @ts-ignore
    return this.baseApi.estimateMessageFee(message, this.blockHeight);
  }

  async callContract(
    call: Call,
    blockIdentifier?: BlockIdentifier,
  ): Promise<string[]> {
    return this.baseApi.callContract(call, this.blockHeight);
  }

  // eslint-disable-next-line @typescript-eslint/promise-function-async
  getBlockWithTxs(
    blockHashOrBlockTag: BlockIdentifier,
  ): Promise<SPEC.BlockWithTxs> {
    throw new Error('Method `getBlockWithTransactions` not supported.');
  }

  // eslint-disable-next-line @typescript-eslint/promise-function-async
  getBlockWithTxHashes(
    blockHashOrBlockTag: BlockIdentifier,
  ): Promise<SPEC.BlockWithTxHashes> {
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
