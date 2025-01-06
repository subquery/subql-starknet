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
  Header,
} from '@subql/node-core';
import { StarknetProjectDs } from '../../configure/SubqueryProject';
import { StarknetApi } from '../../starknet';
import SafeStarknetProvider from '../../starknet/safe-api';
import { starknetBlockToHeader } from '../../starknet/utils.starknet';
import { IndexerManager } from '../indexer.manager';
import { BlockContent, getBlockSize } from '../types';

export type FetchBlockResponse = Header;

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
      SafeStarknetProvider,
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

  protected toBlockResponse(block: BlockContent): Header {
    return {
      ...starknetBlockToHeader(block),
      parentHash: block.parentHash,
    };
  }

  protected async processFetchedBlock(
    block: IBlock<BlockContent>,
    dataSources: SubqlStarknetDataSource[],
  ): Promise<ProcessBlockResponse> {
    return this.indexerManager.indexBlock(block, dataSources);
  }

  getBlockSize(block: IBlock<BlockContent>): number {
    return getBlockSize(block.block);
  }
}
