// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable } from '@nestjs/common';
import {
  BaseUnfinalizedBlocksService,
  Header,
  NodeConfig,
  IStoreModelProvider,
} from '@subql/node-core';
import { StarknetNodeConfig } from '../configure/NodeConfig';
import { StarknetApiService as ApiService } from '../starknet/api.service.starknet';
import {
  formatBlock,
  starknetBlockHeaderToHeader,
  starknetBlockToHeader,
} from '../starknet/utils.starknet';
import { BlockContent } from './types';

@Injectable()
export class UnfinalizedBlocksService extends BaseUnfinalizedBlocksService<BlockContent> {
  private supportsFinalization?: boolean;
  private startupCheck = true;

  constructor(
    private readonly apiService: ApiService,
    nodeConfig: NodeConfig,
    @Inject('IStoreModelProvider') storeModelProvider: IStoreModelProvider,
  ) {
    super(new StarknetNodeConfig(nodeConfig), storeModelProvider);
  }

  protected async getFinalizedHead(): Promise<Header> {
    return starknetBlockHeaderToHeader(
      await this.apiService.api.getFinalizedBlock(),
    );
  }

  protected async getHeaderForHash(hash: string): Promise<Header> {
    const block = await this.apiService.api.getBlockByHeightOrHash(hash);
    return starknetBlockToHeader(formatBlock(block));
  }

  async getHeaderForHeight(height: number): Promise<Header> {
    const block = await this.apiService.api.getBlockByHeightOrHash(height);
    return starknetBlockToHeader(formatBlock(block));
  }
}
