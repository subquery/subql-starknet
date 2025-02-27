// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable } from '@nestjs/common';
import {
  isBlockHandlerProcessor,
  isCallHandlerProcessor,
  isEventHandlerProcessor,
  StarknetCustomDataSource,
  StarknetHandlerKind,
  StarknetRuntimeHandlerInputMap,
  SubqlStarknetDataSource,
} from '@subql/common-starknet';
import {
  ApiService,
  NodeConfig,
  profiler,
  IndexerSandbox,
  ProcessBlockResponse,
  BaseIndexerManager,
  IBlock,
  SandboxService,
  DsProcessorService,
  DynamicDsService,
  UnfinalizedBlocksService,
} from '@subql/node-core';
import {
  StarknetTransaction,
  StarknetLog,
  StarknetBlock,
  StarknetRuntimeDatasource,
  StarknetBlockFilter,
  StarknetLogFilter,
  StarknetTransactionFilter,
  SubqlDatasource,
  StarknetCustomDatasource,
} from '@subql/types-starknet';
import { BlockchainService } from '../blockchain.service';
import { StarknetProjectDs } from '../configure/SubqueryProject';
import { StarknetApi, StarknetApiService } from '../starknet';
import {
  filterBlocksProcessor,
  filterLogsProcessor,
  filterTransactionsProcessor,
  isFullBlock,
} from '../starknet/block.starknet';
import SafeStarknetProvider from '../starknet/safe-api';
import { BlockContent } from './types';

@Injectable()
export class IndexerManager extends BaseIndexerManager<
  StarknetApi,
  SafeStarknetProvider,
  BlockContent,
  ApiService,
  SubqlStarknetDataSource,
  StarknetCustomDataSource,
  typeof FilterTypeMap,
  typeof ProcessorTypeMap,
  StarknetRuntimeHandlerInputMap
> {
  constructor(
    @Inject('APIService') apiService: StarknetApiService,
    nodeConfig: NodeConfig,
    sandboxService: SandboxService<SafeStarknetProvider, StarknetApi>,
    dsProcessorService: DsProcessorService<
      SubqlDatasource,
      StarknetCustomDatasource
    >,
    dynamicDsService: DynamicDsService<SubqlDatasource>,
    @Inject('IUnfinalizedBlocksService')
    unfinalizedBlocksService: UnfinalizedBlocksService<BlockContent>,
    @Inject('IBlockchainService')
    blockchainService: BlockchainService,
  ) {
    super(
      apiService,
      nodeConfig,
      sandboxService,
      dsProcessorService,
      dynamicDsService,
      unfinalizedBlocksService,
      FilterTypeMap,
      ProcessorTypeMap,
      blockchainService,
    );
  }

  @profiler()
  async indexBlock(
    block: IBlock<BlockContent>,
    dataSources: SubqlStarknetDataSource[],
  ): Promise<ProcessBlockResponse> {
    return super.internalIndexBlock(block, dataSources, () =>
      this.getApi(block.block),
    );
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  private async getApi(block: BlockContent): Promise<SafeStarknetProvider> {
    return this.apiService.safeApi(block.blockNumber);
  }

  protected getDsProcessor(
    ds: SubqlStarknetDataSource,
    safeApi: SafeStarknetProvider,
  ): IndexerSandbox {
    return this.sandboxService.getDsProcessor(
      ds,
      safeApi,
      this.apiService.unsafeApi.api,
    );
  }

  protected async indexBlockData(
    block: BlockContent,
    dataSources: StarknetProjectDs[],
    getVM: (d: StarknetProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    if (isFullBlock(block)) {
      await this.indexBlockContent(block, dataSources, getVM);

      for (const tx of block.transactions) {
        await this.indexTransaction(tx, dataSources, getVM);

        for (const log of tx.logs ?? []) {
          await this.indexEvent(log, dataSources, getVM);
        }
      }
    } else {
      for (const log of block.logs ?? []) {
        await this.indexEvent(log, dataSources, getVM);
      }
    }
  }

  private async indexBlockContent(
    block: StarknetBlock,
    dataSources: StarknetProjectDs[],
    getVM: (d: StarknetProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    for (const ds of dataSources) {
      await this.indexData(StarknetHandlerKind.Block, block, ds, getVM);
    }
  }

  private async indexTransaction(
    tx: StarknetTransaction,
    dataSources: StarknetProjectDs[],
    getVM: (d: StarknetProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    for (const ds of dataSources) {
      await this.indexData(StarknetHandlerKind.Call, tx, ds, getVM);
    }
  }

  private async indexEvent(
    log: StarknetLog,
    dataSources: StarknetProjectDs[],
    getVM: (d: StarknetProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    for (const ds of dataSources) {
      await this.indexData(StarknetHandlerKind.Event, log, ds, getVM);
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  protected async prepareFilteredData(
    kind: StarknetHandlerKind,
    data: any,
    ds: StarknetRuntimeDatasource,
  ): Promise<any> {
    return DataAbiParser[kind](this.apiService.api)(data, ds);
  }
}

const ProcessorTypeMap = {
  [StarknetHandlerKind.Block]: isBlockHandlerProcessor,
  [StarknetHandlerKind.Event]: isEventHandlerProcessor,
  [StarknetHandlerKind.Call]: isCallHandlerProcessor,
};

const FilterTypeMap = {
  [StarknetHandlerKind.Block]: (
    data: StarknetBlock,
    filter: StarknetBlockFilter,
    ds: SubqlStarknetDataSource,
  ) => filterBlocksProcessor(data, filter, ds.options?.address),
  [StarknetHandlerKind.Event]: (
    data: StarknetLog,
    filter: StarknetLogFilter,
    ds: SubqlStarknetDataSource,
  ) => filterLogsProcessor(data, filter, ds.options?.address),
  [StarknetHandlerKind.Call]: (
    data: StarknetTransaction,
    filter: StarknetTransactionFilter,
    ds: SubqlStarknetDataSource,
  ) => filterTransactionsProcessor(data, filter, ds.options?.address),
};

const DataAbiParser = {
  [StarknetHandlerKind.Block]: () => (data: StarknetBlock) => data,
  [StarknetHandlerKind.Event]:
    (api: StarknetApi) => (data: StarknetLog, ds: StarknetRuntimeDatasource) =>
      api.parseLog(data, ds),
  [StarknetHandlerKind.Call]:
    (api: StarknetApi) =>
    (data: StarknetTransaction, ds: StarknetRuntimeDatasource) =>
      api.parseTransaction(data, ds),
};
