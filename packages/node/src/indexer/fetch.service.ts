// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SchedulerRegistry } from '@nestjs/schedule';

import { isCustomDs, StarknetHandlerKind } from '@subql/common-starknet';
import {
  NodeConfig,
  BaseFetchService,
  ApiService,
  getModulos,
  Header,
  IStoreModelProvider,
} from '@subql/node-core';
import { StarknetBlock, SubqlDatasource } from '@subql/types-starknet';
import { StarknetApi } from '../starknet';
import {
  calcInterval,
  starknetBlockHeaderToHeader,
} from '../starknet/utils.starknet';
import { IStarknetBlockDispatcher } from './blockDispatcher';
import { StarknetDictionaryService } from './dictionary/starknetDictionary.service';
import { ProjectService } from './project.service';
import { UnfinalizedBlocksService } from './unfinalizedBlocks.service';

const BLOCK_TIME_VARIANCE = 5000;

const INTERVAL_PERCENT = 0.9;

@Injectable()
export class FetchService extends BaseFetchService<
  SubqlDatasource,
  IStarknetBlockDispatcher,
  StarknetBlock
> {
  constructor(
    private apiService: ApiService,
    nodeConfig: NodeConfig,
    @Inject('IProjectService') projectService: ProjectService,
    @Inject('IBlockDispatcher')
    blockDispatcher: IStarknetBlockDispatcher,
    dictionaryService: StarknetDictionaryService,
    unfinalizedBlocksService: UnfinalizedBlocksService,
    eventEmitter: EventEmitter2,
    schedulerRegistry: SchedulerRegistry,
    @Inject('IStoreModelProvider') storeModelProvider: IStoreModelProvider,
  ) {
    super(
      nodeConfig,
      projectService,
      blockDispatcher,
      dictionaryService,
      eventEmitter,
      schedulerRegistry,
      unfinalizedBlocksService,
      storeModelProvider,
    );
  }

  get api(): StarknetApi {
    return this.apiService.unsafeApi;
  }

  protected async getFinalizedHeader(): Promise<Header> {
    const blockHeader = await this.api.getFinalizedBlock();
    return starknetBlockHeaderToHeader(blockHeader);
  }

  protected async getBestHeight(): Promise<number> {
    return this.api.getBestBlockHeight();
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  protected async getChainInterval(): Promise<number> {
    const CHAIN_INTERVAL = calcInterval(this.api) * INTERVAL_PERCENT;

    return Math.min(BLOCK_TIME_VARIANCE, CHAIN_INTERVAL);
  }

  protected getModulos(dataSources: SubqlDatasource[]): number[] {
    return getModulos(dataSources, isCustomDs, StarknetHandlerKind.Block);
  }

  protected async initBlockDispatcher(): Promise<void> {
    await this.blockDispatcher.init((height) =>
      Promise.resolve(this.resetForNewDs(height)),
    );
  }

  protected async preLoopHook(): Promise<void> {
    // Starknet doesn't need to do anything here
    return Promise.resolve();
  }
}
