// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable } from '@nestjs/common';
import {
  BaseUnfinalizedBlocksService,
  Header,
  NodeConfig,
  mainThreadOnly,
  StoreCacheService,
} from '@subql/node-core';
import { StarknetNodeConfig } from '../configure/NodeConfig';
import { StarknetApiService as ApiService } from '../starknet/api.service.starknet';
import { starknetBlockToHeader } from '../starknet/utils.starknet';
import { BlockContent } from './types';

@Injectable()
export class UnfinalizedBlocksService extends BaseUnfinalizedBlocksService<BlockContent> {
  private supportsFinalization?: boolean;
  private startupCheck = true;

  constructor(
    private readonly apiService: ApiService,
    nodeConfig: NodeConfig,
    storeCache: StoreCacheService,
  ) {
    super(new StarknetNodeConfig(nodeConfig), storeCache);
  }

  protected async getFinalizedHead(): Promise<Header> {
    // @ts-ignore
    return Promise.resolve(undefined);
  }

  protected async getHeaderForHash(hash: string): Promise<Header> {
    // @ts-ignore
    return Promise.resolve(undefined);
  }

  protected async getHeaderForHeight(height: number): Promise<Header> {
    // @ts-ignore
    return Promise.resolve(undefined);
  }
}
