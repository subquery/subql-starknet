// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import fs from 'fs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BlockWithTxs } from '@starknet-io/types-js';
import { getLogger, IBlock } from '@subql/node-core';
import {
  ApiWrapper,
  StarknetBlock,
  StarknetRuntimeDatasource,
  IStarknetEndpointConfig,
  LightStarknetBlock,
  StarknetResult,
  StarknetTransaction,
  StarknetLog,
  StarknetContractCall,
} from '@subql/types-starknet';
import {
  ProviderInterface,
  RpcProvider,
  RpcProviderOptions,
  events,
  CallData,
  Abi,
  AbiEntry,
  FunctionAbi,
} from 'starknet';
import { SPEC } from 'starknet-types-07';
import { FinalizedBlockService } from './finalized.block.starknet';
import SafeStarknetProvider from './safe-api';
import {
  hexEq,
  encodeSelectorToHex,
  fetchAbiFromContractAddress,
  formatBlock,
  formatBlockUtil,
  formatLog,
  formatTransaction,
  reverseToRawLog,
  isFinalizedBlock,
} from './utils.starknet';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: packageVersion } = require('../../package.json');

const logger = getLogger('api.starknet');

async function loadAssets(
  ds: StarknetRuntimeDatasource,
): Promise<Record<string, string>> {
  if (!ds.assets) {
    return {};
  }
  const res: Record<string, string> = {};

  for (const [name, { file }] of ds.assets.entries()) {
    try {
      res[name] = await fs.promises.readFile(file, { encoding: 'utf8' });
    } catch (e) {
      throw new Error(`Failed to load datasource asset ${file}`);
    }
  }

  return res;
}

export class StarknetApi implements ApiWrapper {
  private client: RpcProvider;

  // This is used within the sandbox when HTTP is used
  private nonBatchClient?: SafeStarknetProvider;
  private _genesisBlock?: Record<string, any>;
  private contractInterfaces: Record<string, Abi> = {};
  private chainId?: string;
  private specVersion?: string;
  private finalizedBlockService: FinalizedBlockService;

  // Starknet POS
  private _supportsFinalization = true;

  get supportsFinalization(): boolean {
    return this._supportsFinalization;
  }

  /**
   * @param {string} endpoint - The endpoint of the RPC provider
   * @param {object} eventEmitter - Used to monitor the number of RPC requests
   */
  constructor(
    private endpoint: string,
    private eventEmitter: EventEmitter2,
    private config?: IStarknetEndpointConfig,
  ) {
    const { hostname, protocol, searchParams } = new URL(endpoint);

    const protocolStr = protocol.replace(':', '');

    logger.info(`Api host: ${hostname}, method: ${protocolStr}`);

    if (protocolStr !== 'https' && protocolStr !== 'http') {
      throw new Error(`Unsupported protocol: ${protocol}`);
    }
    const connection: RpcProviderOptions | ProviderInterface = {
      nodeUrl: this.endpoint,
      headers: {
        'User-Agent': `Subquery-Node ${packageVersion}`,
        ...config?.headers,
      },
      batch: this.config?.batchSize ?? false,
    };
    searchParams.forEach((value, name) => {
      (connection.headers as any)[name] = value;
    });
    this.client = new RpcProvider(connection);
    this.finalizedBlockService = new FinalizedBlockService(
      this.getBlockByHeightOrHash.bind(this),
      logger,
    );
  }

  private get genesisBlock(): Record<string, any> {
    if (!this._genesisBlock) {
      throw new Error('Genesis block is not available');
    }
    return this._genesisBlock;
  }

  async init(): Promise<void> {
    try {
      this._genesisBlock = await this.getGenesisBlock();
      this.chainId = await this.client.getChainId();
      this.specVersion = await this.client.getSpecVersion();
    } catch (e) {
      if ((e as Error).message.startsWith('Invalid response')) {
        if (!this.nonBatchClient) {
          throw new Error('No suitable client found');
        }

        logger.warn(
          `The RPC Node at ${this.endpoint} cannot process batch requests. ` +
            `Switching to non-batch mode for subsequent requests. Please consider checking if batch processing is supported on the RPC node.`,
        );

        return this.init();
      }

      throw e;
    }
  }

  private async getGenesisBlock(): Promise<BlockWithTxs> {
    const block = await this.client.getBlockWithTxs(1);
    if (block === null) {
      throw new Error(`Getting genesis block returned null from block 1`);
    }
    // @ts-ignore
    // TODO, @starknet-io/types-js is not align with starknet rpc types, follow this ticket https://github.com/starknet-io/types-js/issues/31
    return block;
  }

  /***
   * Get the latest block (with its header)
   * @returns {Promise<BLOCK_HEADER>}
   */
  async getFinalizedBlock(): Promise<SPEC.BLOCK_WITH_RECEIPTS> {
    const block = await this.finalizedBlockService.getFinalizedBlock();
    return block;
  }

  async getFinalizedBlockHeight(): Promise<number> {
    return (await this.getFinalizedBlock()).block_number;
  }

  async getBestBlockHeight(): Promise<number> {
    return (await this.client.getBlockLatestAccepted()).block_number;
  }

  getChainId(): string {
    assert(this.chainId, 'Api has not been initialised');
    return this.chainId;
  }

  getGenesisHash(): string {
    return this.genesisBlock.block_hash;
  }

  getSpecVersion(): string {
    assert(this.specVersion, 'Api has not been initialised');
    return this.specVersion;
  }

  async getBlockByHeightOrHash(
    heightOrHash: number | string,
  ): Promise<SPEC.BLOCK_WITH_RECEIPTS> {
    const block = await this.client.getBlockWithReceipts(heightOrHash);
    if (!isFinalizedBlock(block)) {
      throw `Block ${block} is not a fulfilled block, its parent is ${block.parent_hash}`;
    }
    return block;
  }

  async fetchBlock(blockNumber: number): Promise<IBlock<StarknetBlock>> {
    try {
      const rawBlock = await this.getBlockByHeightOrHash(blockNumber);
      const formattedBlock = formatBlock(rawBlock);

      const formattedTransactions = rawBlock.transactions.map((tx, index) => {
        const formattedTransaction = formatTransaction(
          tx,
          formattedBlock,
          index,
        );
        return {
          ...formattedTransaction,
          logs: tx.receipt.events.map((l, logIndex) =>
            formatLog(l, logIndex, formattedTransaction, formattedBlock),
          ),
        };
      });

      const logs: StarknetLog[] = formattedTransactions.flatMap((tx) =>
        tx.logs.map((l) => ({
          ...l,
          transaction: tx,
        })),
      );

      const block: StarknetBlock = {
        ...formattedBlock,
        transactions: formattedTransactions,
        logs,
      };

      this.eventEmitter.emit('fetchBlock');
      return formatBlockUtil(block);
    } catch (e: any) {
      throw this.handleError(e);
    }
  }

  private async fetchLightBlock(
    blockNumber: number,
  ): Promise<IBlock<LightStarknetBlock>> {
    const block = (await this.client.getBlockWithTxHashes(
      blockNumber,
    )) as SPEC.BLOCK_WITH_TX_HASHES;
    const lightBlock: LightStarknetBlock = {
      ...block,
      blockHash: block.block_hash,
      blockNumber: block.block_number,
      parentHash: block.parent_hash,
      newRoot: block.new_root,
      sequencerAddress: block.sequencer_address,
      l1GasPrice: block.l1_gas_price,
      starknetVersion: block.starknet_version,
      logs: [],
    };
    return formatBlockUtil<LightStarknetBlock>(lightBlock);
  }

  async fetchBlocks(bufferBlocks: number[]): Promise<IBlock<StarknetBlock>[]> {
    return Promise.all(bufferBlocks.map(async (num) => this.fetchBlock(num)));
  }

  async fetchBlocksLight(
    bufferBlocks: number[],
  ): Promise<IBlock<LightStarknetBlock>[]> {
    return Promise.all(
      bufferBlocks.map(async (num) => this.fetchLightBlock(num)),
    );
  }

  get api(): RpcProvider {
    return this.client;
  }

  private buildInterface(abiName: string, assets: Record<string, string>): Abi {
    if (!assets[abiName]) {
      throw new Error(`ABI named "${abiName}" not referenced in assets`);
    }

    // This assumes that all datasources have a different abi name or they are the same abi
    if (!this.contractInterfaces[abiName]) {
      // Constructing the interface validates the ABI
      try {
        const abiObj = JSON.parse(assets[abiName]);

        this.contractInterfaces[abiName] = abiObj;
      } catch (e: any) {
        logger.error(`Unable to parse ABI: ${e.message}`);
        throw new Error('ABI is invalid');
      }
    }

    return this.contractInterfaces[abiName];
  }

  async parseLog<T extends StarknetResult = StarknetResult>(
    log: StarknetLog,
    ds: StarknetRuntimeDatasource,
  ): Promise<StarknetLog | StarknetLog<T>> {
    try {
      if (!ds?.options?.abi) {
        logger.warn('No ABI provided for datasource');
        return log;
      }
      const emittedEvent = reverseToRawLog(log);
      const assets = await loadAssets(ds);
      const iAbi = this.buildInterface(ds.options.abi, assets);
      const abiEvents = events.getAbiEvents(iAbi);
      const abiStructs = CallData.getAbiStruct(iAbi);
      const abiEnums = CallData.getAbiEnum(iAbi);
      const [parsed] = events.parseEvents(
        [emittedEvent],
        abiEvents,
        abiStructs,
        abiEnums,
      );
      log.args = parsed as T;
      return log;
    } catch (e: any) {
      logger.warn(`Failed to parse log data: ${e.message}`);
      return log;
    }
  }

  async parseTransaction<T extends StarknetResult = StarknetResult>(
    transaction: StarknetTransaction,
    ds: StarknetRuntimeDatasource,
  ): Promise<StarknetTransaction> {
    try {
      const assets = await loadAssets(ds);
      // If decoded calls not exist, try to parse first
      if (!transaction.decodedCalls) {
        transaction.decodedCalls = transaction.parseCallData();
      }
      if (transaction.decodedCalls && transaction.decodedCalls.length > 0) {
        await this.handleDecodedCallsArgs(transaction.decodedCalls, ds, assets);
      } else {
        logger.warn(
          `No decoded calls found in transaction, will skip decode call data for this transaction ${transaction.hash}`,
        );
      }
      transaction.logs =
        transaction.logs &&
        ((await Promise.all(
          transaction.logs.map(async (log) => this.parseLog(log, ds)),
        )) as Array<StarknetLog | StarknetLog<T>>);

      return transaction;
    } catch (e: any) {
      logger.warn(`Failed to parse transaction data: ${e.message}`);
      return transaction;
    }
  }

  private async handleDecodedCallsArgs(
    decodedCalls: StarknetContractCall[],
    ds: StarknetRuntimeDatasource,
    assets: Record<string, string>,
  ): Promise<void> {
    await Promise.all(
      decodedCalls.map(async (call) => {
        let iAbi: Abi;
        try {
          if (
            ds.options?.address &&
            hexEq(ds.options.address, call.to) &&
            ds.options.abi
          ) {
            iAbi = this.buildInterface(ds.options.abi, assets);
          } else {
            //We could register this abi in memory improve performance, maybe just record with address instead of abi name here
            if (!this.contractInterfaces[call.to]) {
              iAbi = await fetchAbiFromContractAddress(this.client, call.to);
            } else {
              iAbi = this.contractInterfaces[call.to];
            }
          }
          call.decodedArgs = StarknetApi.DecodeCallDataWithAbi(iAbi, call);
        } catch (e: any) {
          logger.warn(
            `Could not decode call data with contract address ${call.to}: ${e.message}`,
          );
        }
      }),
    );
  }

  static DecodeCallDataWithAbi(iAbi: Abi, call: StarknetContractCall): any {
    const callData = new CallData(iAbi);
    const { inputs } = callData.parser
      .getLegacyFormat()
      .find(
        (abiItem: AbiEntry) =>
          encodeSelectorToHex(abiItem.name) === call.selector,
      ) as FunctionAbi;
    const inputsTypes = inputs.map((inp: any) => {
      return inp.type as string;
    });
    const res = callData.decodeParameters(inputsTypes, call.calldata);
    const result = inputs.reduce((acc, item, index) => {
      acc[item.name] = res[index];
      return acc;
    }, {});
    return result;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async connect(): Promise<void> {
    logger.error('Starknet API connect is not implemented');
    throw new Error('Not implemented');
  }

  //TODO
  async disconnect(): Promise<void> {
    return Promise.resolve();
  }

  handleError(e: Error): Error {
    if ((e as any)?.status === 429) {
      const { hostname } = new URL(this.endpoint);
      return new Error(`Rate Limited at endpoint: ${hostname}`);
    }

    return e;
  }

  getSafeApi(height: number) {
    return new SafeStarknetProvider(this.client, height);
  }
}
