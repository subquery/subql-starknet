// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  NodeConfig,
  StoreService,
  IProjectService,
  BlockDispatcher,
  ProcessBlockResponse,
  ApiService,
  IProjectUpgradeService,
  PoiSyncService,
  IBlock,
  IStoreModelProvider,
} from '@subql/node-core';
import {
  StarknetProjectDs,
  SubqueryProject,
} from '../../configure/SubqueryProject';
import { IndexerManager } from '../indexer.manager';
import { BlockContent, getBlockSize } from '../types';

/**
 * @description Intended to behave the same as WorkerBlockDispatcherService but doesn't use worker threads or any parallel processing
 */
@Injectable()
export class BlockDispatcherService
  extends BlockDispatcher<BlockContent, StarknetProjectDs>
  implements OnApplicationShutdown
{
  constructor(
    apiService: ApiService,
    nodeConfig: NodeConfig,
    private indexerManager: IndexerManager,
    eventEmitter: EventEmitter2,
    @Inject('IProjectService')
    projectService: IProjectService<StarknetProjectDs>,
    @Inject('IProjectUpgradeService')
    projectUpgradeService: IProjectUpgradeService,
    storeService: StoreService,
    @Inject('IStoreModelProvider') storeModelProvider: IStoreModelProvider,
    poiSyncService: PoiSyncService,
    @Inject('ISubqueryProject') project: SubqueryProject,
  ) {
    super(
      nodeConfig,
      eventEmitter,
      projectService,
      projectUpgradeService,
      storeService,
      storeModelProvider,
      poiSyncService,
      project,
      apiService.fetchBlocks.bind(apiService),
    );
  }

  protected async indexBlock(
    block: IBlock<BlockContent>,
  ): Promise<ProcessBlockResponse> {
    return this.indexerManager.indexBlock(
      block,
      await this.projectService.getDataSources(block.getHeader().blockHeight),
    );
  }

  protected getBlockSize(block: IBlock<BlockContent>): number {
    return getBlockSize(block.block);
  }
}
