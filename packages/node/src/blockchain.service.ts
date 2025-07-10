// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject } from '@nestjs/common';
import { BLOCK_WITH_TX_HASHES } from '@starknet-io/starknet-types-08';
import {
  isCustomDs,
  isRuntimeDs,
  StarknetRuntimeDataSourceImpl,
} from '@subql/common-starknet';
import {
  DatasourceParams,
  Header,
  IBlock,
  IBlockchainService,
} from '@subql/node-core';
import {
  LightStarknetBlock,
  StarknetBlock,
  StarknetCustomDatasource,
  StarknetHandlerKind,
  SubqlDatasource,
} from '@subql/types-starknet';
import { plainToClass } from 'class-transformer';
import { validateSync } from 'class-validator';
import { SubqueryProject } from './configure/SubqueryProject';
import { BlockContent, getBlockSize } from './indexer/types';
import { IIndexerWorker } from './indexer/worker/worker';
import { StarknetApiService } from './starknet';
import SafeStarknetProvider from './starknet/safe-api';
import {
  calcInterval,
  getBlockTimestamp,
  starknetBlockHeaderToHeader,
} from './starknet/utils.starknet';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: packageVersion } = require('../package.json');

const BLOCK_TIME_VARIANCE = 5000;

const INTERVAL_PERCENT = 0.9;

export class BlockchainService
  implements
    IBlockchainService<
      SubqlDatasource,
      StarknetCustomDatasource,
      SubqueryProject,
      SafeStarknetProvider,
      LightStarknetBlock,
      StarknetBlock,
      IIndexerWorker
    >
{
  blockHandlerKind = StarknetHandlerKind.Block;
  isCustomDs = isCustomDs;
  isRuntimeDs = isRuntimeDs;
  packageVersion = packageVersion;

  constructor(@Inject('APIService') private apiService: StarknetApiService) {}

  async fetchBlocks(
    blockNums: number[],
  ): Promise<IBlock<LightStarknetBlock>[] | IBlock<StarknetBlock>[]> {
    return this.apiService.fetchBlocks(blockNums);
  }

  async fetchBlockWorker(
    worker: IIndexerWorker,
    blockNum: number,
    context: { workers: IIndexerWorker[] },
  ): Promise<Header> {
    return worker.fetchBlock(blockNum, 0);
  }

  getBlockSize(block: IBlock<BlockContent>): number {
    return getBlockSize(block.block);
  }

  async getFinalizedHeader(): Promise<Header> {
    const blockHeader = await this.apiService.api.getFinalizedBlock();
    return starknetBlockHeaderToHeader(blockHeader);
  }

  async getBestHeight(): Promise<number> {
    return this.apiService.api.getBestBlockHeight();
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getChainInterval(): Promise<number> {
    const CHAIN_INTERVAL = calcInterval(this.apiService.api) * INTERVAL_PERCENT;

    return Math.min(BLOCK_TIME_VARIANCE, CHAIN_INTERVAL);
  }

  async getHeaderForHash(hash: string): Promise<Header> {
    const block = await this.apiService.api.fetchLightBlock(hash);
    return block.getHeader();
  }

  async getHeaderForHeight(height: number): Promise<Header> {
    const block = await this.apiService.api.fetchLightBlock(height);
    return block.getHeader();
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async updateDynamicDs(
    params: DatasourceParams,
    dsObj: SubqlDatasource | StarknetCustomDatasource,
  ): Promise<void> {
    if (isCustomDs(dsObj)) {
      dsObj.processor.options = {
        ...dsObj.processor.options,
        ...params.args,
      };
      // await this.dsProcessorService.validateCustomDs([dsObj]);
    } else if (isRuntimeDs(dsObj)) {
      dsObj.options = {
        ...dsObj.options,
        ...params.args,
      };

      const parsedDs = plainToClass(StarknetRuntimeDataSourceImpl, dsObj);

      const errors = validateSync(parsedDs, {
        whitelist: true,
        forbidNonWhitelisted: false,
      });
      if (errors.length) {
        throw new Error(
          `Dynamic ds is invalid\n${errors
            .map((e) => e.toString())
            .join('\n')}`,
        );
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getSafeApi(block: BlockContent): Promise<SafeStarknetProvider> {
    return this.apiService.safeApi(block.blockNumber);
  }

  onProjectChange(project: SubqueryProject): Promise<void> | void {
    this.apiService.updateBlockFetching();
  }

  async getBlockTimestamp(height: number): Promise<Date> {
    const block = (await this.apiService.unsafeApi.api.getBlock(
      height,
    )) as BLOCK_WITH_TX_HASHES;

    return getBlockTimestamp(block);
  }
}
