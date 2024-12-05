// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  NodeConfig,
  StoreCacheService,
  StoreService,
  IProjectService,
  BlockDispatcher,
  ProcessBlockResponse,
  ApiService,
  IProjectUpgradeService,
  PoiSyncService,
  IBlock,
} from '@subql/node-core';
import {
  EthereumProjectDs,
  SubqueryProject,
} from '../../configure/SubqueryProject';
import { IndexerManager } from '../indexer.manager';
import { BlockContent } from '../types';

/**
 * @description Intended to behave the same as WorkerBlockDispatcherService but doesn't use worker threads or any parallel processing
 */
@Injectable()
export class BlockDispatcherService
  extends BlockDispatcher<BlockContent, EthereumProjectDs>
  implements OnApplicationShutdown
{
  constructor(
    apiService: ApiService,
    nodeConfig: NodeConfig,
    private indexerManager: IndexerManager,
    eventEmitter: EventEmitter2,
    @Inject('IProjectService')
    projectService: IProjectService<EthereumProjectDs>,
    @Inject('IProjectUpgradeService')
    projectUpgradeService: IProjectUpgradeService,
    storeService: StoreService,
    storeCacheService: StoreCacheService,
    poiSyncService: PoiSyncService,
    @Inject('ISubqueryProject') project: SubqueryProject,
  ) {
    super(
      nodeConfig,
      eventEmitter,
      projectService,
      projectUpgradeService,
      storeService,
      storeCacheService,
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
}
