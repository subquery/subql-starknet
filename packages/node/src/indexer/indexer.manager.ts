// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Injectable } from '@nestjs/common';
import {
  isBlockHandlerProcessor,
  isCallHandlerProcessor,
  isEventHandlerProcessor,
  isCustomDs,
  isRuntimeDs,
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
} from '@subql/node-core';
import {
  StarknetTransaction,
  StarknetLog,
  StarknetBlock,
  StarknetRuntimeDatasource,
  StarknetBlockFilter,
  StarknetLogFilter,
  StarknetTransactionFilter,
} from '@subql/types-starknet';
import { StarknetProjectDs } from '../configure/SubqueryProject';
import { StarknetApi } from '../starknet';
import {
  filterBlocksProcessor,
  filterLogsProcessor,
  filterTransactionsProcessor,
  isFullBlock,
} from '../starknet/block.starknet';
import SafeEthProvider from '../starknet/safe-api';
import { DsProcessorService } from './ds-processor.service';
import { DynamicDsService } from './dynamic-ds.service';
import { BlockContent } from './types';
import { UnfinalizedBlocksService } from './unfinalizedBlocks.service';

@Injectable()
export class IndexerManager extends BaseIndexerManager<
  StarknetApi,
  SafeEthProvider,
  BlockContent,
  ApiService,
  SubqlStarknetDataSource,
  StarknetCustomDataSource,
  typeof FilterTypeMap,
  typeof ProcessorTypeMap,
  StarknetRuntimeHandlerInputMap
> {
  protected isRuntimeDs = isRuntimeDs;
  protected isCustomDs = isCustomDs;

  constructor(
    apiService: ApiService,
    nodeConfig: NodeConfig,
    sandboxService: SandboxService<SafeEthProvider, StarknetApi>,
    dsProcessorService: DsProcessorService,
    dynamicDsService: DynamicDsService,
    unfinalizedBlocksService: UnfinalizedBlocksService,
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
  private async getApi(block: BlockContent): Promise<SafeEthProvider> {
    return this.apiService.safeApi(block.blockNumber);
  }

  protected getDsProcessor(
    ds: SubqlStarknetDataSource,
    safeApi: SafeEthProvider,
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
