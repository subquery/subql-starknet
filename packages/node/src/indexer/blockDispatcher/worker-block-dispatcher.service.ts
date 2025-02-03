// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import path from 'path';
import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  NodeConfig,
  StoreService,
  IProjectService,
  WorkerBlockDispatcher,
  ConnectionPoolStateManager,
  IProjectUpgradeService,
  PoiSyncService,
  InMemoryCacheService,
  createIndexerWorker,
  MonitorServiceInterface,
  IStoreModelProvider,
  Header,
} from '@subql/node-core';
import { StarknetBlock } from '@subql/types-starknet';
import {
  StarknetProjectDs,
  SubqueryProject,
} from '../../configure/SubqueryProject';
import { StarknetApiConnection } from '../../starknet/api.connection';
import { DynamicDsService } from '../dynamic-ds.service';
import { BlockContent } from '../types';
import { UnfinalizedBlocksService } from '../unfinalizedBlocks.service';
import { IIndexerWorker } from '../worker/worker';

type IndexerWorker = IIndexerWorker & {
  terminate: () => Promise<number>;
};

@Injectable()
export class WorkerBlockDispatcherService
  extends WorkerBlockDispatcher<StarknetProjectDs, IndexerWorker, StarknetBlock>
  implements OnApplicationShutdown
{
  constructor(
    nodeConfig: NodeConfig,
    eventEmitter: EventEmitter2,
    @Inject('IProjectService')
    projectService: IProjectService<StarknetProjectDs>,
    @Inject('IProjectUpgradeService')
    projectUpgadeService: IProjectUpgradeService,
    cacheService: InMemoryCacheService,
    storeService: StoreService,
    @Inject('IStoreModelProvider') storeModelProvider: IStoreModelProvider,
    poiSyncService: PoiSyncService,
    @Inject('ISubqueryProject') project: SubqueryProject,
    dynamicDsService: DynamicDsService,
    unfinalizedBlocksSevice: UnfinalizedBlocksService,
    connectionPoolState: ConnectionPoolStateManager<StarknetApiConnection>,
    monitorService?: MonitorServiceInterface,
  ) {
    super(
      nodeConfig,
      eventEmitter,
      projectService,
      projectUpgadeService,
      storeService,
      storeModelProvider,
      poiSyncService,
      project,
      () =>
        createIndexerWorker<
          IIndexerWorker,
          StarknetApiConnection,
          BlockContent,
          StarknetProjectDs
        >(
          path.resolve(__dirname, '../../../dist/indexer/worker/worker.js'),
          [],
          storeService.getStore(),
          cacheService.getCache(),
          dynamicDsService,
          unfinalizedBlocksSevice,
          connectionPoolState,
          project.root,
          projectService.startHeight,
          monitorService,
        ),
      monitorService,
    );
  }

  protected async fetchBlock(
    worker: IndexerWorker,
    height: number,
  ): Promise<Header> {
    return worker.fetchBlock(height, 0 /* Unused with starknet*/);
  }
}
