// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import path from 'node:path';
import { Module } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  StoreService,
  NodeConfig,
  ConnectionPoolService,
  ConnectionPoolStateManager,
  PoiSyncService,
  InMemoryCacheService,
  MonitorService,
  CoreModule,
  blockDispatcherFactory,
  ProjectService,
  UnfinalizedBlocksService,
  DynamicDsService,
  DsProcessorService,
  FetchService,
  DictionaryService,
  MultiChainRewindService,
} from '@subql/node-core';
import { BlockchainService } from '../blockchain.service';
import { StarknetApiService } from '../starknet/api.service.starknet';
import { StarknetDictionaryService } from './dictionary/starknetDictionary.service';
import { IndexerManager } from './indexer.manager';

@Module({
  imports: [CoreModule],
  providers: [
    {
      provide: 'APIService',
      useFactory: StarknetApiService.create,
      inject: [
        'ISubqueryProject',
        ConnectionPoolService,
        EventEmitter2,
        NodeConfig,
      ],
    },
    {
      provide: 'IBlockchainService',
      useClass: BlockchainService,
    },
    DsProcessorService,
    DynamicDsService,
    {
      provide: 'IUnfinalizedBlocksService',
      useClass: UnfinalizedBlocksService,
    },
    {
      useClass: ProjectService,
      provide: 'IProjectService',
    },
    IndexerManager,
    MultiChainRewindService,
    {
      provide: 'IBlockDispatcher',
      useFactory: blockDispatcherFactory(
        path.resolve(__dirname, '../../dist/indexer/worker/worker.js'),
        [],
      ),
      inject: [
        NodeConfig,
        EventEmitter2,
        'IProjectService',
        'IProjectUpgradeService',
        InMemoryCacheService,
        StoreService,
        'IStoreModelProvider',
        PoiSyncService,
        'ISubqueryProject',
        DynamicDsService,
        'IUnfinalizedBlocksService',
        ConnectionPoolStateManager,
        'IBlockchainService',
        IndexerManager,
        MultiChainRewindService,
        MonitorService,
      ],
    },
    {
      provide: DictionaryService,
      useClass: StarknetDictionaryService,
    },
    FetchService,
  ],
})
export class FetchModule {}
