// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {BlockFilter} from '@subql/types-core';
import {TransactionReceipt} from 'starknet';
import {BLOCK_HASH, BLOCK_NUMBER, FELT, RESOURCE_PRICE, TXN_TYPE, BLOCK_STATUS} from './rpcSpec';
export type StarknetBlockFilter = BlockFilter;

/**
 * Represents a filter for Starknet Transactions
 * @interface
 * @extends {StarknetTransactionFilter}
 */
export interface StarknetTransactionFilter {
  /**
   * The address of sender of the transaction
   * @example
   * from: '0x220866B1A2219f40e72f5c628B65D54268cA3A9D',
   * */
  from?: string;
  /**
   * The to address field within a transaction. This is either the contract address or the recipient if it is a starknet transfer.
   * @example
   * in Transaction: https://starkscan.co/tx/0x03b96c6b41b2a57ec71a5851e565cc404979772bb530268a76943290a0e14947
   * to: '0x2db7e01c69be7e741fcd08fb5096914029131334dbca1d63ab33c05e7a92153',
   **/
  to?: string | null;
  /**
   * The function sighash or function signature of the call.
   * @example
   * function: 'transfer' or '0x83afd3f4caedc6eebf44246fe54e38c95e3179a5ec9ea81740eca5b482d12e',
   * */
  function?: string | null;
  /**
   * The type of transaction
   * @example
   * type: 'INVOKE'
   * */
  type?: TXN_TYPE;
}

/**
 * Represents a filter for Starknet logs
 * @interface
 * @extends {StarknetLogFilter}
 */
export interface StarknetLogFilter {
  /**
   * You can filter by the topics (named 'keys' in starknet) in an event or log.
   * These can be an address, hex
   * @example
   * topics: ['Transfer'],
   * @example
   * topics: ['0x99cd8bde557814842a3121e8ddfd433a539b8c9f14bf31ebf108d12e6196e9']
   */
  topics?: Array<string | null | undefined>;
}

export interface StarknetResult extends ReadonlyArray<any> {
  readonly [key: string]: any;
}

export type StarknetBlock = LightStarknetBlock & {
  transactions: StarknetTransaction[];
  logs: StarknetLog[];
};

// Should be accepted block only
export type LightStarknetBlock = {
  blockHash: BLOCK_HASH;
  parentHash: BLOCK_HASH;
  blockNumber: BLOCK_NUMBER;
  newRoot: FELT;
  timestamp: number;
  sequencerAddress: FELT;
  l1GasPrice: RESOURCE_PRICE;
  starknetVersion: string;
  status: BLOCK_STATUS;
  logs: StarknetLog[];
};

export interface StarknetContractCall {
  to: FELT;
  selector: FELT;
  calldata: FELT[];
  decodedArgs?: any;
}

export type StarknetTransaction = {
  hash: string;
  from: string;
  blockHash: string;
  blockNumber: number;
  blockTimestamp: number;
  transactionIndex: number;
  callData: string[];
  decodedCalls?: StarknetContractCall[];
  receipt?: () => Promise<TransactionReceipt>;
  logs?: StarknetLog[];
};

export type StarknetLog<T extends StarknetResult = StarknetResult> = {
  address: string;
  topics: string[]; //equal to keys
  data: string[];
  blockHash: string;
  blockNumber: number;
  transactionHash: string;
  transactionIndex: number;
  args?: T;
  block: StarknetBlock;
  transaction: StarknetTransaction;
};
