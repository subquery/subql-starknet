// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable } from '@nestjs/common';
import { SubqlStarknetDataSource } from '@subql/common-starknet';
import {
  NodeConfig,
  IProjectService,
  ProcessBlockResponse,
  ApiService,
  BaseWorkerService,
  IProjectUpgradeService,
  IBlock,
} from '@subql/node-core';
import { StarknetProjectDs } from '../../configure/SubqueryProject';
import { StarknetApi } from '../../starknet';
import SafeEthProvider from '../../starknet/safe-api';
import { IndexerManager } from '../indexer.manager';
import { BlockContent } from '../types';

export type FetchBlockResponse = { parentHash: string } | undefined;

export type WorkerStatusResponse = {
  threadId: number;
  isIndexing: boolean;
  fetchedBlocks: number;
  toFetchBlocks: number;
};

@Injectable()
export class WorkerService extends BaseWorkerService<
  BlockContent,
  FetchBlockResponse,
  SubqlStarknetDataSource,
  {}
> {
  constructor(
    private apiService: ApiService<
      StarknetApi,
      SafeEthProvider,
      IBlock<BlockContent>[]
    >,
    private indexerManager: IndexerManager,
    @Inject('IProjectService')
    projectService: IProjectService<StarknetProjectDs>,
    @Inject('IProjectUpgradeService')
    projectUpgradeService: IProjectUpgradeService,
    nodeConfig: NodeConfig,
  ) {
    super(projectService, projectUpgradeService, nodeConfig);
  }

  protected async fetchChainBlock(
    heights: number,
    extra: {},
  ): Promise<IBlock<BlockContent>> {
    const [block] = await this.apiService.fetchBlocks([heights]);
    return block;
  }

  protected toBlockResponse(block: BlockContent): { parentHash: string } {
    return {
      parentHash: block.parentHash,
    };
  }

  protected async processFetchedBlock(
    block: IBlock<BlockContent>,
    dataSources: SubqlStarknetDataSource[],
  ): Promise<ProcessBlockResponse> {
    return this.indexerManager.indexBlock(block, dataSources);
  }
}
