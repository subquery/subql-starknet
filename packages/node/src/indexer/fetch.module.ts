// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Module } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  StoreService,
  ApiService,
  NodeConfig,
  ConnectionPoolService,
  ConnectionPoolStateManager,
  StoreCacheService,
  IProjectUpgradeService,
  PoiSyncService,
  InMemoryCacheService,
  MonitorService,
  CoreModule,
} from '@subql/node-core';
import { SubqueryProject } from '../configure/SubqueryProject';
import { StarknetApiConnection } from '../starknet/api.connection';
import { StarknetApiService } from '../starknet/api.service.starknet';
import {
  BlockDispatcherService,
  WorkerBlockDispatcherService,
} from './blockDispatcher';
import { StarknetDictionaryService } from './dictionary/starknetDictionary.service';
import { DsProcessorService } from './ds-processor.service';
import { DynamicDsService } from './dynamic-ds.service';
import { FetchService } from './fetch.service';
import { IndexerManager } from './indexer.manager';
import { ProjectService } from './project.service';
import { UnfinalizedBlocksService } from './unfinalizedBlocks.service';

@Module({
  imports: [CoreModule],
  providers: [
    {
      provide: ApiService,
      useFactory: async (
        project: SubqueryProject,
        connectionPoolService: ConnectionPoolService<StarknetApiConnection>,
        eventEmitter: EventEmitter2,
        nodeConfig: NodeConfig,
      ) => {
        const apiService = new StarknetApiService(
          project,
          connectionPoolService,
          eventEmitter,
          nodeConfig,
        );
        await apiService.init();
        return apiService;
      },
      inject: [
        'ISubqueryProject',
        ConnectionPoolService,
        EventEmitter2,
        NodeConfig,
      ],
    },
    IndexerManager,
    {
      provide: 'IBlockDispatcher',
      useFactory: (
        nodeConfig: NodeConfig,
        eventEmitter: EventEmitter2,
        projectService: ProjectService,
        projectUpgradeService: IProjectUpgradeService,
        apiService: StarknetApiService,
        indexerManager: IndexerManager,
        cacheService: InMemoryCacheService,
        storeService: StoreService,
        storeCacheService: StoreCacheService,
        poiSyncService: PoiSyncService,
        project: SubqueryProject,
        dynamicDsService: DynamicDsService,
        unfinalizedBlocks: UnfinalizedBlocksService,
        connectionPoolState: ConnectionPoolStateManager<StarknetApiConnection>,
        monitorService?: MonitorService,
      ) =>
        nodeConfig.workers
          ? new WorkerBlockDispatcherService(
              nodeConfig,
              eventEmitter,
              projectService,
              projectUpgradeService,
              cacheService,
              storeService,
              storeCacheService,
              poiSyncService,
              project,
              dynamicDsService,
              unfinalizedBlocks,
              connectionPoolState,
              monitorService,
            )
          : new BlockDispatcherService(
              apiService,
              nodeConfig,
              indexerManager,
              eventEmitter,
              projectService,
              projectUpgradeService,
              storeService,
              storeCacheService,
              poiSyncService,
              project,
            ),
      inject: [
        NodeConfig,
        EventEmitter2,
        'IProjectService',
        'IProjectUpgradeService',
        ApiService,
        IndexerManager,
        InMemoryCacheService,
        StoreService,
        StoreCacheService,
        PoiSyncService,
        'ISubqueryProject',
        DynamicDsService,
        UnfinalizedBlocksService,
        ConnectionPoolStateManager,
        MonitorService,
      ],
    },
    FetchService,
    StarknetDictionaryService,
    DsProcessorService,
    DynamicDsService,
    StarknetApiService,
    {
      useClass: ProjectService,
      provide: 'IProjectService',
    },
    UnfinalizedBlocksService,
  ],
})
export class FetchModule {}
